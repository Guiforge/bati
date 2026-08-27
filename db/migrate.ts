import migrations from "../drizzle/migrations";
import { backupBeforeMigrations } from "../src/autoBackup";
import { reportError } from "../src/reportError";
import { db } from "./client";
import { sqlString } from "./sql";

/**
 * The migration runner, shared between the two entry points that open the database: the React
 * tree (components/DatabaseProvider.tsx) and the headless widget task (src/widget.tsx). It used
 * to live inside DatabaseProvider only, which meant a widget added before the app's first open —
 * or an OS tick landing after a schema bump but before the app ran — queried a database whose
 * migrations had never run, threw, and left the widget blank forever.
 */

function getMigrationKeyFromIdx(idx: number) {
  return `m${String(idx).padStart(4, "0")}`;
}

type SqliteMigrationClient = {
  execAsync: (source: string) => Promise<void>;
  runAsync?: (source: string, params?: readonly unknown[]) => Promise<unknown>;
  getFirstAsync?: <T = unknown>(source: string, params?: readonly unknown[]) => Promise<T | null>;
  getAllAsync?: <T = unknown>(source: string, params?: readonly unknown[]) => Promise<T[]>;
};

/**
 * When the newest migration in `__drizzle_migrations` was written, or `-Infinity` for a database
 * that has never been migrated. A read that fails counts as never: applying is idempotent, and
 * the alternative is skipping migrations because a query went wrong.
 */
async function readLastAppliedAt(client: SqliteMigrationClient): Promise<number> {
  try {
    if (!client.getFirstAsync) return -Infinity;
    const row = await client.getFirstAsync<{ created_at: number | string }>(
      "SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
    );
    if (row?.created_at === undefined || row?.created_at === null) return -Infinity;
    return Number(row.created_at);
  } catch {
    // The table does not exist on a fresh database, and this read runs before it is created.
    return -Infinity;
  }
}

/**
 * Whether one journal entry still has to run. The runner skips on this and `ensureMigrations`
 * decides whether to write a backup on it — through the same function, because two copies of
 * "has this run yet?" that drift is how a backup gets written on every launch, or on none.
 */
function isPending(entry: { when: number }, lastAppliedAt: number): boolean {
  return !(Number.isFinite(lastAppliedAt) && lastAppliedAt >= entry.when);
}

// ponytail: hand-rolled instead of drizzle-orm/expo-sqlite/migrator's `useMigrations`
// on purpose — that helper's `useNewConnection` transactions interact badly with Drizzle's
// sync `prepareSync` on Android, and we need to seed inside one BEGIN IMMEDIATE. Revisit
// dropping this for `useMigrations` once that Android issue is confirmed fixed.
async function runMigrationsAsync(
  client: SqliteMigrationClient,
  config: {
    journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
    migrations: Record<string, string>;
  },
  opts: { debug: boolean },
) {
  // Create migrations table (same default name Drizzle uses).
  await client.execAsync(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at NUMERIC
    )
  `);

  const lastCreatedAt = await readLastAppliedAt(client);

  const entries = config.journal.entries;
  // ponytail: hand-rolled migration runner — drizzle's own could not be used on this driver.
  //           Ceiling: it is the riskiest code in the app and the least covered. Worth its own
  //           audit against a real upgraded database before it is touched again.
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: see the ponytail note above
  async function runEntry(txn: {
    execAsync: (source: string) => Promise<void>;
    runAsync?: SqliteMigrationClient["runAsync"];
  }) {
    for (const entry of entries) {
      if (!isPending(entry, lastCreatedAt)) continue;

      const key = getMigrationKeyFromIdx(entry.idx);
      const raw = config.migrations[key];
      if (!raw) throw new Error(`Missing migration: ${entry.tag}`);

      const statements = raw
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (opts.debug) {
        // biome-ignore lint/suspicious/noConsole: Debug logging
        console.log(
          "[db/migrate] Applying migration",
          entry.tag,
          `(idx=${entry.idx}, stmts=${statements.length})`,
        );
      }

      for (const [i, stmt] of statements.entries()) {
        if (opts.debug) {
          // biome-ignore lint/suspicious/noConsole: Debug logging
          console.log(
            `[db/migrate]  stmt ${i + 1}/${statements.length}:`,
            stmt.slice(0, 120).replace(/\s+/g, " "),
          );
        }
        try {
          await txn.execAsync(stmt);
        } catch (e) {
          console.error(
            `[db/migrate] Error executing statement ${i + 1}/${statements.length} in migration ${entry.tag}:`,
          );
          console.error(stmt);
          console.error(e);

          // Extra diagnostics for common schema/index issues.
          // Helps confirm whether a UNIQUE index exists even when the SQL migration file says otherwise.
          try {
            if (client.getAllAsync) {
              const isAdventuresStmt = /\b(adventures)\b/i.test(stmt);
              if (isAdventuresStmt) {
                const getAllAsync = client.getAllAsync;
                const getFirstAsync = client.getFirstAsync;

                const indexes = await getAllAsync<{ name: string; sql: string | null }>(
                  "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='adventures' ORDER BY name",
                );
                console.error("[db/migrate] adventures indexes:", indexes);

                if (getFirstAsync) {
                  const tableSql = await getFirstAsync<{ sql: string | null }>(
                    "SELECT sql FROM sqlite_master WHERE type='table' AND name='adventures' LIMIT 1",
                  );
                  console.error("[db/migrate] adventures table SQL:", tableSql?.sql);
                }
              }
            }
          } catch (_diagErr) {
            // Ignore diagnostics failures.
          }
          throw e;
        }
      }

      // Record applied migration.
      if (txn.runAsync) {
        await txn.runAsync("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)", [
          entry.tag,
          entry.when,
        ]);
      } else {
        await txn.execAsync(
          `INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${sqlString(entry.tag)}, ${entry.when})`,
        );
      }
    }
  }

  // Use a single connection transaction to avoid issues with `useNewConnection` transactions
  // interacting poorly with Drizzle's sync `prepareSync` on Android.
  await client.execAsync("BEGIN IMMEDIATE");
  try {
    await runEntry(client);
    await client.execAsync("COMMIT");
  } catch (e) {
    console.error("[db/migrate] Migration failed:", e);
    await client.execAsync("ROLLBACK");
    throw e;
  }
}

function migrationsDebugEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG === "1";
}

/**
 * Allows quickly isolating a hanging migration on-device.
 * Examples:
 * - EXPO_PUBLIC_MIGRATION_MAX_IDX=0  -> only schema
 * - EXPO_PUBLIC_MIGRATION_MAX_IDX=1  -> schema + seed_exercises
 * Default: run all migrations.
 */
function buildMigrationConfig() {
  const rawMaxIdx = process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
  const parsedMaxIdx = rawMaxIdx === undefined ? Number.POSITIVE_INFINITY : Number(rawMaxIdx);
  const migrationMaxIdx = Number.isFinite(parsedMaxIdx) ? parsedMaxIdx : Number.POSITIVE_INFINITY;

  const entries = migrations.journal?.entries ?? [];
  const filteredEntries = entries.filter((e) => e.idx <= migrationMaxIdx);

  const filteredMigrations: Record<string, string> = {};
  for (const entry of filteredEntries) {
    const key = getMigrationKeyFromIdx(entry.idx);
    const sql = (migrations.migrations as Record<string, unknown> | undefined)?.[key];
    if (typeof sql === "string") filteredMigrations[key] = sql;
  }

  if (migrationsDebugEnabled()) {
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log("[db/migrate] migrationMaxIdx:", migrationMaxIdx);
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log("[db/migrate] journalEntries:", filteredEntries.length, "/", entries.length);
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log("[db/migrate] migrationKeys:", Object.keys(filteredMigrations));
    const m0000 = filteredMigrations.m0000;
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log("[db/migrate] m0000Type:", typeof m0000, "len:", m0000?.length);
    // biome-ignore lint/suspicious/noConsole: Debug logging
    console.log("[db/migrate] m0000Sample:", m0000?.slice?.(0, 120));
  }

  return {
    journal: {
      ...migrations.journal,
      entries: filteredEntries,
    },
    migrations: filteredMigrations,
  };
}

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
      const lastAppliedAt = await readLastAppliedAt(client);
      if (config.journal.entries.some((entry) => isPending(entry, lastAppliedAt))) {
        await backupBeforeMigrations().catch((e) => reportError("backup.auto.gate", e));
      }

      await runMigrationsAsync(client, config, { debug: migrationsDebugEnabled() });
    })();
    promise.catch(() => {
      // Don't cache a failure — let the next caller retry. Same pattern as streakMemo.
      if (migrated === promise) migrated = null;
    });
    migrated = promise;
  }
  return migrated;
}
