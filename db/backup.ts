import { sql } from "drizzle-orm";

import migrations from "../drizzle/migrations";
import {
  db,
  type IsolatedConnection,
  serializeOnDatabase,
  vacuumIntoFile,
  withIsolatedConnection,
} from "./client";
import { SCHEMA_VERSION } from "./schemaVersion";
import { errorTrail, sqlString } from "./sql";

/**
 * Backup and restore, the SQL half.
 *
 * Validation and snapshots each run on a connection of their own (`withIsolatedConnection`,
 * `vacuumIntoFile` in db/client.ts), because the shared one always has a Drizzle statement alive
 * and neither `VACUUM` nor `DETACH` will run behind one. The disk half, the picker, the copy,
 * the swap, lives in src/backupFiles.ts.
 */

/**
 * "BATI" as a big-endian 32-bit integer, written into SQLite's own `application_id` header field.
 *
 * A backup is identified by this rather than by sniffing for table names, because an empty
 * zero-byte file is a perfectly valid SQLite database: it attaches without error and its
 * `integrity_check` returns "ok". The header field is the only cheap thing that tells it apart
 * from a real backup.
 */
export const BATI_APPLICATION_ID = 0x42415449;

/** Alias for the candidate file while it is attached. Anything not colliding with `main`. */
const CANDIDATE = "backup_candidate";

export type BackupRejection =
  /** Not a SQLite file at all — a photo, a text file, a truncated download. */
  | "notSqlite"
  /** SQLite, but damaged. */
  | "corrupt"
  /** A valid SQLite database belonging to something else. */
  | "notBati"
  /** Bati's, but from a version of the app this build cannot safely adopt. */
  | "incompatibleVersion"
  /**
   * Bati's, claiming this build's migration history, but the tables do not match it — a column
   * missing, a table absent. A migration that failed halfway leaves exactly this: the row saying
   * it ran, without the change it was supposed to make.
   */
  | "schemaMismatch"
  /** Could not be read at all: permissions, a vanished temporary file, a full disk. */
  | "unreadable"
  /**
   * A Bati backup of an encryption format after the ones this build reads. Not damaged, not a
   * wrong password: the hero has to update Bati, and the message says so.
   */
  | "newerVersion";

export type BackupCheck = { ok: true } | { ok: false; reason: BackupRejection };

/**
 * Stamps the identity pragmas onto the live database.
 *
 * Called from `DatabaseProvider` right after `ensureMigrations`, not from a SQL migration, so
 * that `SCHEMA_VERSION` keeps a single source in TypeScript instead of being copied into a
 * migration that would have to be remembered on the next bump. Both pragmas are idempotent
 * writes and survive `VACUUM INTO`, which is what lets a snapshot identify itself later.
 *
 * The widget's headless task runs `ensureMigrations` without this, so a database the widget
 * created first carries no stamp until the app opens. That is harmless because the stamp only
 * has to be there when a snapshot is *taken*, and `exportBackup` is reachable from the UI alone.
 */
const IDENTITY_PRAGMAS = [
  ["application_id", BATI_APPLICATION_ID],
  ["user_version", SCHEMA_VERSION],
] as const;

export async function stampDatabaseIdentity(): Promise<void> {
  for (const [name, value] of IDENTITY_PRAGMAS) {
    // Both of these write page 1, so stamping unconditionally costs a WAL frame and a commit on
    // every cold start for two numbers that change once per schema bump. The read is on a page
    // SQLite has already loaded to open the file.
    const row = await db.get<Record<string, unknown>>(sql.raw(`PRAGMA ${name}`));
    if (Number(row?.[name]) === value) continue;
    await db.run(sql.raw(`PRAGMA ${name} = ${value}`));
  }
}

/**
 * Writes a consistent snapshot of the live database to `destinationPath`.
 *
 * One statement, whichever way the hero then carries the file — share sheet or folder.
 * `VACUUM INTO` refuses a destination that already exists, so the caller deletes it first.
 */
export function snapshotDatabaseTo(destinationPath: string): Promise<void> {
  // Still queued, because `VACUUM INTO` is also illegal inside a transaction and the shared
  // connection is where those live. The isolated handle is about *statements*, this queue is
  // about transactions; both are needed. See `vacuumIntoFile`.
  return serializeOnDatabase(() => vacuumIntoFile(destinationPath));
}

/** Timestamps of every migration this build ships, for the compatibility check below. */
function knownMigrationTimes(): Set<number> {
  const journal = migrations.journal as { entries: { when: number }[] };
  return new Set(journal.entries.map((entry) => entry.when));
}

/** How many migrations this build knows: a backup it refused may open after an app update. */
export const BUILD_MIGRATIONS = knownMigrationTimes().size;

/**
 * Turns whatever SQLite threw into one of the five answers.
 *
 * It has to cope with the error arriving from *either* the ATTACH or the first read that follows:
 * SQLite opens an attached file lazily, so a text file is sometimes rejected on attach and
 * sometimes only when a page is actually needed. Classifying in one place rather than one per
 * step is what makes the outcome independent of that timing.
 */
function rejectionForError(error: unknown): BackupRejection {
  const trail = errorTrail(error);

  if (trail.includes("not a database") || trail.includes("sqlite_notadb")) return "notSqlite";
  // `sqlite_corrupt` matches on the second test, so it needs no clause of its own.
  if (trail.includes("malformed") || trail.includes("corrupt")) return "corrupt";
  return "unreadable";
}

async function readPragma(conn: IsolatedConnection, name: string): Promise<number | null> {
  const row = await conn.getFirstAsync<Record<string, unknown>>(`PRAGMA ${CANDIDATE}.${name}`);
  const value = row ? Object.values(row)[0] : null;
  return typeof value === "number" ? value : null;
}

async function inspectAttachedCandidate(conn: IsolatedConnection): Promise<BackupCheck> {
  const integrity = await conn.getFirstAsync<Record<string, unknown>>(
    `PRAGMA ${CANDIDATE}.integrity_check`,
  );
  if (Object.values(integrity ?? {})[0] !== "ok") return { ok: false, reason: "corrupt" };

  // `ATTACH` creates the file when it is missing, so a candidate that vanished between the copy
  // and here attaches happily as an empty database — and the checks below would then pass it off
  // as "a database, but not Bati's". Zero pages is the only trace left of that, and no real
  // backup has any: `VACUUM INTO` always writes at least the schema.
  //
  // It runs *after* `integrity_check` on purpose: a file SQLite cannot read has no meaningful
  // page count, so 0 only means "empty" once integrity has confirmed a readable database.
  if ((await readPragma(conn, "page_count")) === 0) return { ok: false, reason: "unreadable" };

  if ((await readPragma(conn, "application_id")) !== BATI_APPLICATION_ID) {
    return { ok: false, reason: "notBati" };
  }

  if ((await readPragma(conn, "user_version")) !== SCHEMA_VERSION) {
    return { ok: false, reason: "incompatibleVersion" };
  }

  // No migration of Bati has ever made a trigger or a view, so one in a backup is somebody's: a
  // trigger runs on the hero's next write (a DELETE after any INSERT is a whole history gone), and
  // `tablesDivergeFromLive` only reads tables, so nothing else would notice it.
  const foreign = await conn.getFirstAsync<{ name: string }>(
    `SELECT name FROM ${CANDIDATE}.sqlite_master WHERE type IN ('trigger', 'view') LIMIT 1`,
  );
  if (foreign) return { ok: false, reason: "schemaMismatch" };

  // The backup's newest migration has to be one this build knows. Comparing against the maximum
  // alone would accept a divergent history whose timestamps merely happen to be lower, and the
  // runner that will process this file afterwards works by timestamp too (db/migrate.ts) — so
  // this matches it rather than being stricter than the thing it feeds.
  const latest = await conn.getFirstAsync<{ when: number | string | null }>(
    `SELECT max(created_at) AS "when" FROM ${CANDIDATE}.__drizzle_migrations`,
  );
  const known = knownMigrationTimes();
  const when = latest?.when === null || latest?.when === undefined ? null : Number(latest.when);
  if (when === null || !known.has(when)) {
    return { ok: false, reason: "incompatibleVersion" };
  }

  // A backup that claims *this* build's migration history has to look like it. An older one is
  // exempt on purpose: its tables are meant to differ, and the runner catches them up on the next
  // launch — that is the whole reason the migration chain is the format version.
  //
  // What this catches is the file whose bookkeeping says a migration ran while the change it was
  // supposed to make is absent. `db/migrate.ts` calls itself the riskiest code in the app, and a
  // half-applied migration produces exactly that. Without this the import succeeds and the app
  // crashes later on "no such column", nowhere near the screen that caused it.
  if (when === Math.max(...known) && (await tablesDivergeFromLive(conn))) {
    return { ok: false, reason: "schemaMismatch" };
  }

  return { ok: true };
}

/**
 * Table name → its `CREATE TABLE` text, whitespace-flattened so formatting is not a difference.
 *
 * `__drizzle_migrations` is excluded: it is bookkeeping, it is already the subject of the check
 * above, and the app's runner and the test fixture spell its `CREATE` differently.
 */
async function tableDefinitions(
  conn: IsolatedConnection,
  prefix: string,
): Promise<Map<string, string>> {
  const rows = await conn.getAllAsync<{ name: string; sql: string | null }>(
    `SELECT name, sql FROM ${prefix}.sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '__drizzle_migrations'`,
  );

  return new Map(rows.map((row) => [row.name, (row.sql ?? "").replace(/\s+/g, " ").trim()]));
}

/** True when the attached candidate's tables are not the ones this build is running on. */
async function tablesDivergeFromLive(conn: IsolatedConnection): Promise<boolean> {
  // Sequential on purpose: one connection, and nothing here is slow enough to be worth proving
  // that two concurrent reads on it are safe under expo-sqlite.
  const live = await tableDefinitions(conn, "main");
  const candidate = await tableDefinitions(conn, CANDIDATE);

  if (live.size !== candidate.size) return true;
  for (const [name, definition] of live) {
    if (candidate.get(name) !== definition) return true;
  }
  return false;
}

/**
 * Decides whether `path` is a backup this build can adopt. Never throws for a bad file — an
 * unusable backup is an answer, not an exception. Programming errors still surface normally.
 *
 * No `DETACH`: the connection is thrown away afterwards, and the alias goes with it.
 */
export function validateBackup(path: string): Promise<BackupCheck> {
  return withIsolatedConnection(async (conn) => {
    try {
      await conn.execAsync(`ATTACH DATABASE ${sqlString(path)} AS ${CANDIDATE}`);
      return await inspectAttachedCandidate(conn);
    } catch (error) {
      return { ok: false, reason: rejectionForError(error) };
    }
  });
}

/**
 * Preferences that are the hero's own work and travel with them: what makes a device "have
 * something the other lacks" besides its sessions, and what `mergePeer` carries over, the newer
 * winning. Derived caches (`streak_*`, achievements) are left out on purpose: both devices rewrite
 * them every day, and a comparison that read them would call every pair of devices diverged.
 * Favourites and quest configs name quest ids, which differ between devices, so they are not
 * merged and not compared either: what the merge leaves out, the comparison must not count, or
 * two merged devices would still read as diverged forever.
 */
export const MERGED_PREFERENCES = [
  "villageName",
  "avatarId",
  // The custom avatar's data URI, "" once a preset replaced it (db/preferences.ts). Paired with
  // `avatarId`: the later of the two choices wins, on every device.
  "customAvatar",
  "trainingLevel",
  "ownedEquipment",
  "oath",
  // When the last oath bonus was paid: one a week (db/oaths.ts), on whichever device earned it.
  "oathBonusAt",
  // The days the reminders ring and their hour: the hero's rhythm, not this phone's. Whether a
  // phone rings at all lives in the native module and never travels (docs/designs/rappels.md).
  "reminderDays",
  // The animal the hero picked for their crest, or `auto`: a choice of theirs, not this phone's.
  "crestAnimal",
  // `auto` or `usual`: whether the rare coat shows once the hero has won it. Same discipline as
  // `crestAnimal`: no default written, back to `auto` writes `auto`.
  "crestCoat",
  // One of the closed list of mottos (db/crestMotto.ts) or `none`: the hero's words, not this phone's.
  "crestMotto",
] as const;

/**
 * The columns two schemas' copies of a table share, by name, minus `without`: the same list whichever
 * device reads the other, and safe against a peer on an older build. `columnsOf` in db/merge.ts reads
 * `main` alone, so it must not be used for this.
 */
export async function sharedColumns(
  conn: IsolatedConnection,
  other: string,
  table: string,
  without: string[] = ["id"],
): Promise<string[]> {
  const rows = await conn.getAllAsync<{ name: string }>(
    `SELECT name FROM pragma_table_info(${sqlString(table)}, 'main')
     INTERSECT SELECT name FROM pragma_table_info(${sqlString(table)}, ${sqlString(other)})
     ORDER BY name`,
  );
  return rows.map((r) => r.name).filter((name) => !without.includes(name));
}

/** A movement as the other device names it: Admin by seed name, hero by uuid (else name). */
const exerciseIdentity = (schema: string, idExpr: string) =>
  `(SELECT CASE e.creator WHEN 'Admin' THEN 'A:' || e.enName ELSE 'H:' || ifnull(e.uuid, e.enName) END
    FROM ${schema}.exercises e WHERE e.id = ${idExpr})`;

/** A quest as the other device names it: Admin by seed title, hero by uuid (else titles). */
const questIdentity = (schema: string, idExpr: string) =>
  `(SELECT CASE q.author WHEN 'Admin' THEN 'A:' || q.enTitle
      ELSE 'H:' || ifnull(q.uuid, q.enTitle || '/' || q.frTitle) END
    FROM ${schema}.quests q WHERE q.id = ${idExpr})`;

/**
 * A hero row and its children as one text, the same on every device (no local ids): the total order
 * that settles two edits of one row in the same second (roadmap 4.18b). Plain JSON text compared as
 * a string, since SQLite core has no hash function and none is needed for a tie-break.
 */
export function canonical(
  schema: string,
  table: "exercises" | "quests" | "adventures",
  alias: string,
  columns: string[],
): string {
  const own = columns.map((c) =>
    c === "prerequisiteExerciseId"
      ? exerciseIdentity(schema, `${alias}."${c}"`)
      : table === "adventures" && c === "questId"
        ? // A step whose quest is gone is NULL on both devices (the merge writes it as 0).
          questIdentity(schema, `${alias}."${c}"`)
        : `${alias}."${c}"`,
  );
  const children =
    table === "exercises"
      ? `(SELECT json_group_array(muscle ORDER BY muscle) FROM ${schema}.exercise_muscles
          WHERE exerciseId = ${alias}.id)`
      : table === "adventures"
        ? `(SELECT json_group_array(json_array(${questIdentity(schema, "s.questId")}, s.stepIndex,
              s.enNarrative, s.frNarrative, s.deNarrative, s.esNarrative,
              s.enOutroNarrative, s.frOutroNarrative, s.deOutroNarrative, s.esOutroNarrative,
              s.imagePath) ORDER BY s.stepIndex)
            FROM ${schema}.adventure_steps s WHERE s.adventureId = ${alias}.id)`
        : `(SELECT json_group_array(json_array(${exerciseIdentity(schema, "qe.exerciseId")}, qe.sortOrder,
            qe.targetType, qe.targetMin, qe.targetMax, qe.imagesJson) ORDER BY qe.sortOrder)
          FROM ${schema}.quest_exercises qe WHERE qe.questId = ${alias}.id)`;
  return `json_array(${[...own, children].join(", ")})`;
}

/** A session's sets as one text, for two corrections stamped in the same second. */
export function setsCanon(schema: string, alias: string, columns: string[]): string {
  const cols = columns.filter((c) => c !== "exerciseId").map((c) => `c."${c}"`);
  return `(SELECT json_group_array(json_array(${exerciseIdentity(schema, "c.exerciseId")}, ${cols.join(", ")})
      ORDER BY c.roundIndex, c.sortOrder, c.id)
    FROM ${schema}.completed_exercises c WHERE c.sessionId = ${alias}.id)`;
}

/** The columns `canonical` reads, for each table, in the comparison and in the merge. */
export type CanonicalColumns = {
  exercises: string[];
  quests: string[];
  adventures: string[];
  sets: string[];
};

export async function canonicalColumns(
  conn: IsolatedConnection,
  other: string,
): Promise<CanonicalColumns> {
  return {
    exercises: await sharedColumns(conn, other, "exercises"),
    quests: await sharedColumns(conn, other, "quests"),
    adventures: await sharedColumns(conn, other, "adventures"),
    sets: await sharedColumns(conn, other, "completed_exercises", ["id", "sessionId"]),
  };
}

/**
 * A device's hero-authored content as `(identity, updatedAt)` rows, over `schema`. Hero rows have
 * no cross-device id yet (roadmap 4.18 phase 4), so an exercise is named by its English name, a
 * quest by its titles, a preference by its key. Good enough to tell "something was written here".
 */
function heroContent(
  schema: string,
  named: boolean,
  canon: CanonicalColumns | null,
  adventures: boolean,
): string {
  const keys = MERGED_PREFERENCES.map(sqlString).join(", ");
  // By uuid (0066), as `mergePeer` matches them, so a rename is a change to one row and not a row
  // gone plus a row new. A database from before 0066 has no such column and keeps its names.
  const exercise = named ? "ifnull(uuid, enName)" : "enName";
  const quest = named ? "ifnull(uuid, enTitle || '/' || frTitle)" : "enTitle || '/' || frTitle";
  // `uuid` is what a content tombstone names; `canon` settles two copies stamped in the same second,
  // and is only read when both devices are on one build (`compareWithPeer`).
  //
  // ponytail: whoever loses a same-second tie takes the winner's copy, and no segment of its
  //           fingerprint moves (the date is the same), so its own file on the server is not
  //           refreshed until something else changes; the winner reads it as `behind` till then.
  //           Same for a tied set correction or feedback, and for a second edit in the same second as
  //           the newest `updatedAt` (the `max(at):count` segment). Nothing is lost or asked twice.
  const uuid = named ? "uuid" : "NULL";
  const canonOf = (table: "exercises" | "quests" | "adventures", columns: string[] | undefined) =>
    canon && columns ? canonical(schema, table, "x", columns) : "NULL";
  return `SELECT 'e:' || ${exercise} AS id, updatedAt AS at, ${uuid} AS uuid,
        ${canonOf("exercises", canon?.exercises)} AS canon
      FROM ${schema}.exercises x WHERE creator = 'hero'
    UNION ALL SELECT 'q:' || ${quest}, updatedAt, ${uuid},
        ${canonOf("quests", canon?.quests)}
      FROM ${schema}.quests x WHERE author = 'hero'
    UNION ALL SELECT 'p:' || key, updatedAt, NULL, ${canon ? "value" : "NULL"}
      FROM ${schema}.user_preferences WHERE key IN (${keys})${
        // The hero's adventures (0075): no row is added for a device without one, so its
        // fingerprint keeps the shape it had. Only where the schema has the uuid column.
        adventures
          ? `
    UNION ALL SELECT 'a:' || ifnull(uuid, enTitle), updatedAt, uuid,
        ${canonOf("adventures", canon?.adventures)}
      FROM ${schema}.adventures x WHERE author = 'hero'`
          : ""
      }`;
}

/**
 * Whether a schema's table has a column: hero content carries a uuid from 0066, a session its
 * edit stamps from 0072, and the other device may be on an older build.
 */
async function hasColumn(
  conn: IsolatedConnection,
  schema: string,
  table: string,
  column: string,
): Promise<boolean> {
  const row = await conn.getFirstAsync<{ n: number }>(
    `SELECT count(*) AS n FROM pragma_table_info(${sqlString(table)}, ${sqlString(schema)}) WHERE name = ${sqlString(column)}`,
  );
  return Number(row?.n ?? 0) > 0;
}

/**
 * Sessions both devices hold that `a` edited later than `b` (`0072`): a corrected set or a feedback
 * given after the copy, each stamp read on its own, as `mergePeer` takes them. An unedited session
 * reads as 0. `b` on a build before 0072 has no stamps, so every edit `a` made is news it lacks;
 * `a` on such a build has none to offer.
 *
 * With `tie` (both devices on one build, see `compareWithPeer`), two equal non-null stamps are
 * settled by the larger content, as `mergePeer` does, and a session with more XP counts too: the
 * larger XP is taken there, never taken away.
 */
function editedLaterIn(
  a: string,
  b: string,
  aStamps: boolean,
  bStamps: boolean,
  tie: CanonicalColumns | null,
): string {
  if (!aStamps) return "0";
  const later = (column: string, content: (schema: string, alias: string) => string) =>
    bStamps
      ? `(ifnull(x.${column}, 0) > ifnull(y.${column}, 0)${
          tie
            ? ` OR (x.${column} IS NOT NULL AND x.${column} = y.${column} AND ${content(a, "x")} > ${content(b, "y")})`
            : ""
        })`
      : `ifnull(x.${column}, 0) > 0`;
  const sets = (schema: string, alias: string) => (tie ? setsCanon(schema, alias, tie.sets) : "");
  const feedback = (_schema: string, alias: string) => `ifnull(${alias}.feedback, '')`;
  return `SELECT count(*) FROM ${a}.completed_sessions x JOIN ${b}.completed_sessions y ON y.uuid = x.uuid
    WHERE ${later("setsEditedAt", sets)} OR ${later("feedbackEditedAt", feedback)}${
      tie ? " OR x.xpEarned > y.xpEarned" : ""
    }`;
}

/**
 * A schema's sessions as the fingerprint names them: how many, the newest, and the sum of the edit
 * stamps, which grows with every edit (`nextEditStamp`) where a max could stand still. Left out
 * while it is 0, so a device nobody edited on keeps the name it had before 0072, and an answer the
 * hero gave about it is not asked again.
 */
function sessionsStamp(schema: string, stamps: boolean): string {
  const total = "total(setsEditedAt) + total(feedbackEditedAt)";
  const edited = stamps
    ? ` || CASE WHEN ${total} > 0 THEN ':' || cast(${total} AS INTEGER) ELSE '' END`
    : "";
  return `SELECT count(*) || ':' || ifnull(max(uuid), '')${edited} FROM ${schema}.completed_sessions`;
}

/**
 * Rows of `a` that `b` lacks, or that `a` wrote later. Named by uuid only when both sides can be:
 * one side's uuid and the other's name never match, and every hero row would read as news.
 *
 * An undated row reads as date 0, as `mergePeer` reads it: with a bare `y.at >= x.at` a NULL
 * is never "as new", so the same undated row read as news against itself, for good, while the
 * merge refused to write it.
 */
function newerIn(
  a: string,
  b: string,
  named: boolean,
  tombstonesOfB: string,
  canon: CanonicalColumns | null,
  adventures: boolean,
): string {
  // Equal dates are settled by content when both devices are on one build, so that `y` only covers
  // `x` when it is later, or equal and not smaller: the same order `mergePeer` writes by.
  const covers = canon
    ? "(ifnull(y.at, 0) > ifnull(x.at, 0) OR (ifnull(y.at, 0) = ifnull(x.at, 0) AND ifnull(y.canon, '') >= ifnull(x.canon, '')))"
    : "ifnull(y.at, 0) >= ifnull(x.at, 0)";
  return `SELECT count(*) FROM (${heroContent(a, named, canon, adventures)}) x
    WHERE NOT EXISTS (SELECT 1 FROM (${heroContent(b, named, canon, adventures)}) y WHERE y.id = x.id AND ${covers})
      AND NOT EXISTS (SELECT 1 FROM (${tombstonesOfB}) t WHERE t.uuid = x.uuid AND t.deletedAt >= ifnull(x.at, 0))`;
}

/** A schema's hero content tombstones (0074), or none on a database written before it. */
async function contentTombstones(conn: IsolatedConnection, schema: string): Promise<string> {
  const table = await conn.getFirstAsync<{ n: number }>(
    `SELECT count(*) AS n FROM ${schema}.sqlite_master WHERE name = 'deleted_content'`,
  );
  return Number(table?.n ?? 0) > 0
    ? `SELECT uuid, deletedAt FROM ${schema}.deleted_content`
    : "SELECT NULL AS uuid, NULL AS deletedAt WHERE 0";
}

/**
 * What this schema's state adds to the fingerprint beyond the first three segments: the XP its
 * sessions hold (a bonus after the copy is news, the other device takes the larger) and its content
 * deletions. Kept apart so an answer given before merge v2 still matches on the first three.
 */
const extraStamp = (schema: string, tombs: string) =>
  `(SELECT cast(total(xpEarned) AS INTEGER) FROM ${schema}.completed_sessions) || ':'
    || (SELECT count(*) || ':' || ifnull(max(deletedAt), 0) FROM (${tombs}))`;

/** The newest migration of a schema: two devices on one value share a build, and only they merge. */
async function newestMigration(conn: IsolatedConnection, schema: string): Promise<number | null> {
  const row = await conn.getFirstAsync<{ at: number | null }>(
    `SELECT max(created_at) AS at FROM ${schema}.__drizzle_migrations`,
  );
  return row?.at === null || row?.at === undefined ? null : Number(row.at);
}

/** A schema's tombstones, or none on a database written before 0064. */
async function tombstones(conn: IsolatedConnection, schema: string): Promise<string> {
  const table = await conn.getFirstAsync<{ n: number }>(
    `SELECT count(*) AS n FROM ${schema}.sqlite_master WHERE name = 'deleted_sessions'`,
  );
  return Number(table?.n ?? 0) > 0
    ? `SELECT uuid FROM ${schema}.deleted_sessions`
    : "SELECT NULL WHERE 0";
}

/**
 * How another device's snapshot stands against this database: what each side has that the other
 * does not. No device clock decides what exists (Joplin #5738: one skewed clock, 3,000 conflicts);
 * clocks only order two versions of one row, hero content by `updatedAt` and an edited session by
 * its stamps, which `nextEditStamp` keeps growing past a stamp from a phone that runs ahead.
 *
 * - **A session the other device deleted that this one still holds with the same tombstone** is the
 *   merge's refusal (its campaign moved past it, `deleteSession` says "locked"), not the other's news: it
 *   is kept here, nothing is deleted, and it must never keep this device from sending the rest.
 * - **Sessions**, by `uuid` (0038), the one name a session keeps across devices. A session the
 *   other device has and this one *deleted* (0064) is not the other's news, it is this one's. A
 *   session both hold is news for the side that edited it later (`setsEditedAt`,
 *   `feedbackEditedAt`, 0072).
 * - **Hero content**: exercises and quests the hero made, the preferences that are theirs.
 *   Taking another device's version replaces all of it, so a device that changed any of it has
 *   something to lose, and is never offered a silent hand-off.
 *
 * `peerChanges` and `localChanges` sum both; `peerOnly` and `localOnly` are sessions alone, for
 * the words the hero reads. `fingerprint` names the other device's state by content, so an answer
 * the hero gave is not asked again merely because that device sealed the same history anew.
 *
 * ponytail: two databases migrated separately from one pre-0038 backup gave the same sessions
 *           different uuids (0038 drew them at random), and read as diverged by that many. Nobody
 *           loses a session choosing either; the phase 4 merge will have to match them on time
 *           and quest.
 *
 * `path` must already have passed `validateBackup`: this reads tables, it does not judge a file.
 */
export type PeerComparison = {
  peerOnly: number;
  localOnly: number;
  peerChanges: number;
  localChanges: number;
  /** When the other device's newest session was performed, epoch seconds, or `null` if none. */
  peerLatest: number | null;
  /** The other device's village name, so a new device can say whose hero it found. */
  peerVillage: string | null;
  /** How many sessions this device has: none is a device that has nothing to recognise yet. */
  localSessions: number;
  fingerprint: string;
};

export function compareWithPeer(path: string): Promise<PeerComparison> {
  return withIsolatedConnection(async (conn) => {
    await conn.execAsync(`ATTACH DATABASE ${sqlString(path)} AS ${CANDIDATE}`);
    const [localGone, peerGone] = [
      await tombstones(conn, "main"),
      await tombstones(conn, CANDIDATE),
    ];
    const [localContentGone, peerContentGone] = [
      await contentTombstones(conn, "main"),
      await contentTombstones(conn, CANDIDATE),
    ];
    // The terms merge v2 added count only between two devices on one build: `mergePeer` refuses
    // another, so counting them there only leads to a take-or-keep whose "take" restores an old file
    // and drops this device's content tombstones, for a gap a previous build never saw.
    const sameBuild =
      (await newestMigration(conn, "main")) === (await newestMigration(conn, CANDIDATE));
    const goneContent = (mine: string, theirs: string) =>
      sameBuild
        ? `(SELECT count(*) FROM (${theirs}) p WHERE NOT EXISTS
            (SELECT 1 FROM (${mine}) l WHERE l.uuid = p.uuid AND l.deletedAt >= p.deletedAt))`
        : "0";
    const sessions = (schema: string) =>
      `SELECT uuid FROM ${schema}.completed_sessions WHERE uuid IS NOT NULL`;
    const peerNamed = await hasColumn(conn, CANDIDATE, "quests", "uuid");
    const named = peerNamed && (await hasColumn(conn, "main", "quests", "uuid"));
    // `exerciseIdentity` names a hero movement by uuid, so both sides must have one (0066).
    const canon = sameBuild && named ? await canonicalColumns(conn, CANDIDATE) : null;
    const peerAdventures = await hasColumn(conn, CANDIDATE, "adventures", "uuid");
    const peerStamps = await hasColumn(conn, CANDIDATE, "completed_sessions", "setsEditedAt");
    const localStamps = await hasColumn(conn, "main", "completed_sessions", "setsEditedAt");
    const row = await conn.getFirstAsync<Record<string, number | string | null>>(
      `SELECT
         (SELECT count(*) FROM (${sessions(CANDIDATE)}) p
            WHERE p.uuid NOT IN (${sessions("main")}) AND p.uuid NOT IN (${localGone})) AS peerOnly,
         (SELECT count(*) FROM (${sessions("main")}) l
            WHERE l.uuid NOT IN (${sessions(CANDIDATE)}) AND l.uuid NOT IN (${peerGone})) AS localOnly,
         (SELECT count(*) FROM (${sessions(CANDIDATE)}) p WHERE p.uuid IN (${localGone})) AS localDeleted,
         (SELECT count(*) FROM (${sessions("main")}) l
            WHERE l.uuid IN (${peerGone}) AND l.uuid NOT IN (${localGone})) AS peerDeleted,
         (${newerIn(CANDIDATE, "main", named, localContentGone, canon, sameBuild)}) AS peerContent,
         (${newerIn("main", CANDIDATE, named, peerContentGone, canon, sameBuild)}) AS localContent,
         (${editedLaterIn(CANDIDATE, "main", peerStamps, localStamps, canon)}) AS peerEdited,
         (${editedLaterIn("main", CANDIDATE, localStamps, peerStamps, canon)}) AS localEdited,
         ${goneContent(localContentGone, peerContentGone)} AS peerGoneContent,
         ${goneContent(peerContentGone, localContentGone)} AS localGoneContent,
         (SELECT max(performedAt) FROM ${CANDIDATE}.completed_sessions) AS peerLatest,
         (SELECT value FROM ${CANDIDATE}.user_preferences WHERE key = 'villageName') AS peerVillage,
         (SELECT count(*) FROM main.completed_sessions) AS localSessions,
         (${sessionsStamp(CANDIDATE, peerStamps)}) AS s,
         (SELECT ifnull(max(at), 0) || ':' || count(*) FROM (${heroContent(CANDIDATE, peerNamed, null, peerAdventures)})) AS c,
         (SELECT count(*) FROM (${peerGone})) AS g,
         ${extraStamp(CANDIDATE, peerContentGone)} AS x`,
    );
    const n = (key: string) => Number(row?.[key] ?? 0);
    return {
      peerOnly: n("peerOnly"),
      localOnly: n("localOnly"),
      peerChanges:
        n("peerOnly") +
        n("peerDeleted") +
        n("peerContent") +
        n("peerEdited") +
        n("peerGoneContent"),
      localChanges:
        n("localOnly") +
        n("localDeleted") +
        n("localContent") +
        n("localEdited") +
        n("localGoneContent"),
      peerLatest:
        row?.peerLatest === null || row?.peerLatest === undefined ? null : n("peerLatest"),
      peerVillage: typeof row?.peerVillage === "string" ? row.peerVillage : null,
      localSessions: n("localSessions"),
      fingerprint: `${row?.s}|${row?.c}|${row?.g}|${row?.x}`,
    };
  });
}

/**
 * This database's own state, named the way `compareWithPeer` names the other's. Sync skips the
 * upload when it has not moved: sealing the same history again would change the file's etag for
 * nothing, and on the other device that looked like new news.
 */
export function stateFingerprint(): Promise<string> {
  return withIsolatedConnection(async (conn) => {
    const gone = await tombstones(conn, "main");
    const row = await conn.getFirstAsync<Record<string, string | number | null>>(
      `SELECT
         (${sessionsStamp("main", true)}) AS s,
         (SELECT ifnull(max(at), 0) || ':' || count(*) FROM (${heroContent("main", true, null, true)})) AS c,
         (SELECT count(*) FROM (${gone})) AS g,
         ${extraStamp("main", await contentTombstones(conn, "main"))} AS x`,
    );
    return `${row?.s}|${row?.c}|${row?.g}|${row?.x}`;
  });
}

/**
 * Preferences that describe this device rather than the hero, and so survive a restore unchanged.
 * A backup carries the database of the device that wrote it; without this, restoring onto a new
 * phone inherited the old phone's backup folder, whose Android permission does not travel, and
 * every later restore stopped on "the destination path does not exist" while Settings still
 * showed the folder. The same held for `deviceId` (two phones claiming one origin, see its note in
 * db/preferences.ts), a pre-`customAvatar` avatar that is a file path on the old phone, the crash log a bug
 * report sends from *this* device, this copy's update check, and the one-per-device greetings.
 */
export const DEVICE_LOCAL_PREFERENCES = [
  "deviceId",
  "backupFolderUri",
  "lastAutoBackupDay",
  "protectDismissedDay",
  "protectDismissals",
  "backupWordsPending",
  "passwordRemindersOn",
  "passwordCheckStep",
  "passwordCheckDue",
  "passwordCheckIgnored",
  // The avatar from before `customAvatar`: a path into this phone's cache (src/customAvatar.ts).
  "customAvatarUri",
  "crashLog",
  "errorLog",
  "eventLog",
  "updateCheck",
  "updateCheckedAt",
  "updateDismissed",
  "updateLatest",
  // Which release notes this copy of the app already showed: another phone's answer is not ours.
  "notesSeenVersion",
  // What this phone's language settings said when the hero last chose one (resolveAppLanguage).
  // Another phone's answer would read as a newer choice and override the restored language.
  "languageChosenOn",
  "guidesSeen",
  "recentCameoLines",
  "comebackGreetedAfter",
  // Whether this phone seals its backups is this phone's choice (src/backupCipher.ts): imported,
  // declining a join left the phone locked, and a plaintext import quietly unset the wish that
  // keeps an Android-restored phone from writing plaintext. Android's own restore does not come
  // through here, so that phone still reads as locked.
  "backupEncryption",
  // The server this device syncs with and whether it waits for Wi-Fi (src/deviceSync.ts): the
  // account itself lives in this device's SecureStore, so these describe this device too.
  "syncServer",
  "syncWifiOnly",
  // What this phone did with its own reminders: when it last asked whether they land well, the
  // settings change it counts ignored reminders from, and the Home offer it closed.
  "reminderAskedAt",
  "reminderStreakFrom",
  "reminderOfferDismissed",
] as const;

/**
 * Preferences a restore drops from the backup without keeping this device's either. A session
 * interrupted on the other device lives there: resumed here while that device finishes it too,
 * it would count, and damage the boss, twice. And one interrupted here names this database's
 * row ids, which the restored database does not share.
 */
const DROPPED_ON_RESTORE = ["savedSession"] as const;

/**
 * Rewrites a staged backup so its device-local preferences are this device's (theirs removed,
 * ours copied in) and an interrupted session is dropped. Runs on the staged file only, after
 * validation and before the swap.
 */
export function keepDeviceSettings(stagedPath: string): Promise<void> {
  const kept = DEVICE_LOCAL_PREFERENCES.map(sqlString).join(", ");
  const dropped = [...DEVICE_LOCAL_PREFERENCES, ...DROPPED_ON_RESTORE].map(sqlString).join(", ");
  return withIsolatedConnection(async (conn) => {
    await conn.execAsync(`ATTACH DATABASE ${sqlString(stagedPath)} AS ${CANDIDATE}`);
    await conn.execAsync(`DELETE FROM ${CANDIDATE}.user_preferences WHERE key IN (${dropped})`);
    await conn.execAsync(
      `INSERT INTO ${CANDIDATE}.user_preferences (key, value, updatedAt)
         SELECT key, value, updatedAt FROM main.user_preferences WHERE key IN (${kept})`,
    );
    // A backup from before `customAvatar` carries no photo at all, while this phone has already
    // ported its own: restoring it must not trade the hero's face for a preset.
    await conn.execAsync(
      `INSERT INTO ${CANDIDATE}.user_preferences (key, value, updatedAt)
         SELECT key, value, updatedAt FROM main.user_preferences WHERE key = 'customAvatar'
           AND NOT EXISTS (SELECT 1 FROM ${CANDIDATE}.user_preferences WHERE key = 'customAvatar')`,
    );
  });
}
