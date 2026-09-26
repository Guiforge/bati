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
  | "unreadable";

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
  "trainingLevel",
  "ownedEquipment",
  "oath",
] as const;

/**
 * A device's hero-authored content as `(identity, updatedAt)` rows, over `schema`. Hero rows have
 * no cross-device id yet (roadmap 4.18 phase 4), so an exercise is named by its English name, a
 * quest by its titles, a preference by its key. Good enough to tell "something was written here".
 */
function heroContent(schema: string): string {
  const keys = MERGED_PREFERENCES.map(sqlString).join(", ");
  return `SELECT 'e:' || enName AS id, updatedAt AS at FROM ${schema}.exercises WHERE creator = 'hero'
    UNION ALL SELECT 'q:' || enTitle || '/' || frTitle, updatedAt FROM ${schema}.quests WHERE author = 'hero'
    UNION ALL SELECT 'p:' || key, updatedAt FROM ${schema}.user_preferences WHERE key IN (${keys})`;
}

/** Rows of `a` that `b` lacks, or that `a` wrote later. */
function newerIn(a: string, b: string): string {
  return `SELECT count(*) FROM (${heroContent(a)}) x
    WHERE NOT EXISTS (SELECT 1 FROM (${heroContent(b)}) y WHERE y.id = x.id AND y.at >= x.at)`;
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
 * does not, with no device clock in it (Joplin #5738: one skewed clock, 3,000 conflicts).
 *
 * - **Sessions**, by `uuid` (0038), the one name a session keeps across devices. A session the
 *   other device has and this one *deleted* (0064) is not the other's news, it is this one's.
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
  fingerprint: string;
};

export function compareWithPeer(path: string): Promise<PeerComparison> {
  return withIsolatedConnection(async (conn) => {
    await conn.execAsync(`ATTACH DATABASE ${sqlString(path)} AS ${CANDIDATE}`);
    const [localGone, peerGone] = [
      await tombstones(conn, "main"),
      await tombstones(conn, CANDIDATE),
    ];
    const sessions = (schema: string) =>
      `SELECT uuid FROM ${schema}.completed_sessions WHERE uuid IS NOT NULL`;
    const row = await conn.getFirstAsync<Record<string, number | string | null>>(
      `SELECT
         (SELECT count(*) FROM (${sessions(CANDIDATE)}) p
            WHERE p.uuid NOT IN (${sessions("main")}) AND p.uuid NOT IN (${localGone})) AS peerOnly,
         (SELECT count(*) FROM (${sessions("main")}) l
            WHERE l.uuid NOT IN (${sessions(CANDIDATE)}) AND l.uuid NOT IN (${peerGone})) AS localOnly,
         (SELECT count(*) FROM (${sessions(CANDIDATE)}) p WHERE p.uuid IN (${localGone})) AS localDeleted,
         (SELECT count(*) FROM (${sessions("main")}) l WHERE l.uuid IN (${peerGone})) AS peerDeleted,
         (${newerIn(CANDIDATE, "main")}) AS peerContent,
         (${newerIn("main", CANDIDATE)}) AS localContent,
         (SELECT max(performedAt) FROM ${CANDIDATE}.completed_sessions) AS peerLatest,
         (SELECT count(*) || ':' || ifnull(max(uuid), '') FROM ${CANDIDATE}.completed_sessions) AS s,
         (SELECT ifnull(max(at), 0) || ':' || count(*) FROM (${heroContent(CANDIDATE)})) AS c,
         (SELECT count(*) FROM (${peerGone})) AS g`,
    );
    const n = (key: string) => Number(row?.[key] ?? 0);
    return {
      peerOnly: n("peerOnly"),
      localOnly: n("localOnly"),
      peerChanges: n("peerOnly") + n("peerDeleted") + n("peerContent"),
      localChanges: n("localOnly") + n("localDeleted") + n("localContent"),
      peerLatest:
        row?.peerLatest === null || row?.peerLatest === undefined ? null : n("peerLatest"),
      fingerprint: `${row?.s}|${row?.c}|${row?.g}`,
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
         (SELECT count(*) || ':' || ifnull(max(uuid), '') FROM main.completed_sessions) AS s,
         (SELECT ifnull(max(at), 0) || ':' || count(*) FROM (${heroContent("main")})) AS c,
         (SELECT count(*) FROM (${gone})) AS g`,
    );
    return `${row?.s}|${row?.c}|${row?.g}`;
  });
}

/**
 * Preferences that describe this device rather than the hero, and so survive a restore unchanged.
 * A backup carries the database of the device that wrote it; without this, restoring onto a new
 * phone inherited the old phone's backup folder, whose Android permission does not travel, and
 * every later restore stopped on "the destination path does not exist" while Settings still
 * showed the folder. The same held for `deviceId` (two phones claiming one origin, see its note in
 * db/preferences.ts), a custom avatar that is a file path on the old phone, the crash log a bug
 * report sends from *this* device, this copy's update check, and the one-per-device greetings.
 */
export const DEVICE_LOCAL_PREFERENCES = [
  "deviceId",
  "backupFolderUri",
  "lastAutoBackupDay",
  "customAvatarUri",
  "crashLog",
  "errorLog",
  "updateCheck",
  "updateCheckedAt",
  "updateDismissed",
  "updateLatest",
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
  });
}
