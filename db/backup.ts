import { sql } from "drizzle-orm";

import migrations from "../drizzle/migrations";
import { db, serializeOnDatabase } from "./client";
import { sqlString } from "./migrate";
import { SCHEMA_VERSION } from "./schemaVersion";

/**
 * Backup and restore, the SQL half.
 *
 * Everything here runs on the connection that is already open, which is what keeps it testable
 * on better-sqlite3: no second database handle, no per-platform file opener. The disk half — the
 * picker, the copy, the swap — lives in src/backupFiles.ts.
 *
 * Sharing the connection has one cost, and `serializeOnDatabase` is what pays it: `ATTACH` and
 * `VACUUM INTO` are both illegal inside a transaction, so neither may start while a write is in
 * flight. Both entry points below queue behind every transaction, and vice versa.
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
export async function stampDatabaseIdentity(): Promise<void> {
  await db.run(sql.raw(`PRAGMA application_id = ${BATI_APPLICATION_ID}`));
  await db.run(sql.raw(`PRAGMA user_version = ${SCHEMA_VERSION}`));
}

/**
 * Writes a consistent snapshot of the live database to `destinationPath`.
 *
 * One statement, and the same one for both callers: the file the user shares, and the `.bak`
 * taken just before a restore. `VACUUM INTO` refuses a destination that already exists, so the
 * caller deletes it first.
 */
export function snapshotDatabaseTo(destinationPath: string): Promise<void> {
  return serializeOnDatabase(async () => {
    await db.run(sql.raw(`VACUUM INTO ${sqlString(destinationPath)}`));
  });
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
 *
 * Drizzle also wraps driver errors — the useful text ("file is not a database") sits on `cause`
 * while the outer message only repeats the SQL — so both levels are read.
 */
function rejectionForError(error: unknown): BackupRejection {
  const cause = error instanceof Error ? error.cause : undefined;
  const message = [error, cause]
    .map((candidate) => (candidate instanceof Error ? candidate.message : ""))
    .join(" ")
    .toLowerCase();

  if (message.includes("not a database")) return "notSqlite";
  if (message.includes("malformed") || message.includes("corrupt")) return "corrupt";
  return "unreadable";
}

async function readPragma(name: string): Promise<number | null> {
  const row = await db.get<Record<string, unknown>>(sql.raw(`PRAGMA ${CANDIDATE}.${name}`));
  const value = row ? Object.values(row)[0] : null;
  return typeof value === "number" ? value : null;
}

async function inspectAttachedCandidate(): Promise<BackupCheck> {
  // `ATTACH` creates the file when it is missing, so a candidate that vanished between the copy
  // and here attaches happily as an empty database — and every check below would then pass it
  // off as "a database, but not Bati's". Zero pages is the only trace left of that, and no real
  // backup has any: `VACUUM INTO` always writes at least the schema.
  if ((await readPragma("page_count")) === 0) return { ok: false, reason: "unreadable" };

  const integrity = await db.get<Record<string, unknown>>(
    sql.raw(`PRAGMA ${CANDIDATE}.integrity_check`),
  );
  if (Object.values(integrity ?? {})[0] !== "ok") return { ok: false, reason: "corrupt" };

  if ((await readPragma("application_id")) !== BATI_APPLICATION_ID) {
    return { ok: false, reason: "notBati" };
  }

  if ((await readPragma("user_version")) !== SCHEMA_VERSION) {
    return { ok: false, reason: "incompatibleVersion" };
  }

  // The backup's newest migration has to be one this build knows. Comparing against the maximum
  // alone would accept a divergent history whose timestamps merely happen to be lower, and the
  // runner that will process this file afterwards works by timestamp too (db/migrate.ts) — so
  // this matches it rather than being stricter than the thing it feeds.
  const latest = await db.get<{ when: number | string | null }>(
    sql.raw(`SELECT max(created_at) AS "when" FROM ${CANDIDATE}.__drizzle_migrations`),
  );
  const when = latest?.when === null || latest?.when === undefined ? null : Number(latest.when);
  if (when === null || !knownMigrationTimes().has(when)) {
    return { ok: false, reason: "incompatibleVersion" };
  }

  return { ok: true };
}

/**
 * Decides whether `path` is a backup this build can adopt. Never throws for a bad file — an
 * unusable backup is an answer, not an exception. Programming errors still surface normally.
 */
export function validateBackup(path: string): Promise<BackupCheck> {
  return serializeOnDatabase(async () => {
    let attached = false;

    // An alias left bound by an earlier run — the detach below is allowed to fail — would make
    // every later validation fail on a collision, and stay that way until the app relaunched.
    // Clearing it first is what keeps that from being permanent.
    await detachCandidate();

    try {
      await db.run(sql.raw(`ATTACH DATABASE ${sqlString(path)} AS ${CANDIDATE}`));
      attached = true;
      return await inspectAttachedCandidate();
    } catch (error) {
      return { ok: false, reason: rejectionForError(error) };
    } finally {
      if (attached) await detachCandidate();
    }
  });
}

/** Unbinds the alias, tolerating both "was never bound" and a refusal we cannot act on here. */
async function detachCandidate(): Promise<void> {
  try {
    await db.run(sql.raw(`DETACH DATABASE ${CANDIDATE}`));
  } catch {
    // Deliberate: a failed detach must not overwrite the verdict the caller already has, and
    // "no such database" is the normal answer on the pre-emptive call above. The next
    // validation clears it either way.
  }
  // `try`/`catch` rather than `.catch()`: db.run is a promise on expo-sqlite but returns its
  // result directly on better-sqlite3, so the method does not exist under the test driver.
}
