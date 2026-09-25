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
 * How another device's snapshot stands against this database, counted in sessions.
 *
 * The session `uuid` (0038) is the one name a session keeps across devices, so the two sets of
 * uuids are a version vector with no clock in it: a device whose sessions are a superset of ours
 * is ahead, one that has sessions we lack while lacking some of ours has diverged. Device clocks
 * never enter it, which is the lesson Joplin paid for (#5738: one skewed clock, 3,000 conflicts).
 *
 * ponytail: sessions only. A hero exercise created, a quest edited or a preference changed on one
 *           device does not make it "ahead" by itself. The ceiling is a phone that only edited
 *           settings looking level with the tablet; the upgrade is roadmap 4.18 phase 4, uuids on
 *           every hero-authored table.
 *
 * `path` must already have passed `validateBackup`: this reads a table, it does not judge a file.
 */
export type PeerComparison = {
  /** Sessions the other device has and this one does not. */
  peerOnly: number;
  /** Sessions this device has and the other does not. */
  localOnly: number;
  /** When the other device's newest session was performed, epoch seconds, or `null` if none. */
  peerLatest: number | null;
};

export function compareWithPeer(path: string): Promise<PeerComparison> {
  return withIsolatedConnection(async (conn) => {
    await conn.execAsync(`ATTACH DATABASE ${sqlString(path)} AS ${CANDIDATE}`);
    const row = await conn.getFirstAsync<{
      peerOnly: number;
      localOnly: number;
      peerLatest: number | null;
    }>(
      `SELECT
         (SELECT count(*) FROM ${CANDIDATE}.completed_sessions p
            WHERE p.uuid IS NOT NULL
              AND p.uuid NOT IN (SELECT uuid FROM main.completed_sessions WHERE uuid IS NOT NULL))
           AS peerOnly,
         (SELECT count(*) FROM main.completed_sessions l
            WHERE l.uuid IS NOT NULL
              AND l.uuid NOT IN (SELECT uuid FROM ${CANDIDATE}.completed_sessions WHERE uuid IS NOT NULL))
           AS localOnly,
         (SELECT max(performedAt) FROM ${CANDIDATE}.completed_sessions) AS peerLatest`,
    );
    return {
      peerOnly: Number(row?.peerOnly ?? 0),
      localOnly: Number(row?.localOnly ?? 0),
      peerLatest:
        row?.peerLatest === null || row?.peerLatest === undefined ? null : Number(row.peerLatest),
    };
  });
}
