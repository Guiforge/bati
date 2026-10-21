import { backupBeforeMigrations, copyBeforeMigrations } from "../src/autoBackup";
import { reportError } from "../src/reportError";
import { db } from "./client";
import {
  buildMigrationConfig,
  hasPendingMigrations,
  isPending,
  migrateClient,
  readLastAppliedAt,
  type SqliteMigrationClient,
} from "./migrationRunner";

/**
 * The migration runner, shared between the two entry points that open the database: the React
 * tree (components/DatabaseProvider.tsx) and the headless widget task (src/widget.tsx). It used
 * to live inside DatabaseProvider only, which meant a widget added before the app's first open —
 * or an OS tick landing after a schema bump but before the app ran — queried a database whose
 * migrations had never run, threw, and left the widget blank forever.
 */

// One writer for "migrations have run in this process". Memoised on the promise so the React
// tree and the widget task can both call it; concurrency across *connections* is already
// serialized by BEGIN IMMEDIATE + the idempotent __drizzle_migrations check.
let migrated: Promise<void> | null = null;

export function ensureMigrations(): Promise<void> {
  if (!migrated) {
    const client = (db as unknown as { $client?: SqliteMigrationClient }).$client;
    if (!client) {
      return Promise.reject(new Error("Database client not available for migrations"));
    }
    const config = buildMigrationConfig();
    const promise = (async () => {
      // The one moment a backup is worth writing unattended, and the one moment this database
      // can be damaged in a way no undo covers. Gated on there being something to run so an
      // ordinary launch — every launch but the first after an update — pays one indexed read.
      //
      // Caught here rather than trusted: `backupBeforeMigrations` handles its own failures today,
      // so this catch is unreachable — and that is exactly the point. A folder that cannot be
      // written is not a reason an app fails to start, and without this line that promise is one
      // future `throw` inside autoBackup away from being a launch that never completes.
      if (!(await hasPendingMigrations(client))) {
        // Every launch but the first after an update lands here. Returning now skips a
        // CREATE TABLE IF NOT EXISTS, a second read of the journal and a BEGIN IMMEDIATE that
        // takes the write lock to apply nothing. Safe on the same predicate the runner uses:
        // a database with no `__drizzle_migrations` reads as `-Infinity`, which is pending.
        return;
      }
      await backupBeforeMigrations().catch((e) => reportError("backup.auto.gate", e));
      // A fresh install has nothing to lose and reads -Infinity here. Before BEGIN IMMEDIATE:
      // VACUUM INTO is illegal inside a transaction.
      // Asked again, not trusted from above: the widget task and the app each run this, and the
      // other may have migrated while the folder copy was being written. Copying then would
      // replace the old state with the new one, which is the one thing the copy must never do.
      const stillAt = await readLastAppliedAt(client);
      if (
        Number.isFinite(stillAt) &&
        config.journal.entries.some((entry) => isPending(entry, stillAt))
      ) {
        await copyBeforeMigrations().catch((e) => reportError("backup.premigrate.gate", e));
      }

      await migrateClient(client);
    })();
    promise.catch(() => {
      // Don't cache a failure — let the next caller retry. Same pattern as streakMemo.
      if (migrated === promise) migrated = null;
    });
    migrated = promise;
  }
  return migrated;
}
