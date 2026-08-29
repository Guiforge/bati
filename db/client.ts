import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseAsync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";
import { SCHEMA_VERSION } from "./schemaVersion";
import { sqlString } from "./sql";

export { SCHEMA_VERSION };

// Version the filename so a SCHEMA_VERSION bump auto-rebuilds without any read/delete
// dance (native handle deletion is unreliable in Expo Go anyway). __drizzle_migrations
// then tracks per-file which migrations have run. This is the *only* rebuild mechanism.
export const DB_NAME = `bati.v${SCHEMA_VERSION}.db`;

// Dev-only escape hatch to wipe & re-seed the current version without bumping.
// EXPO_PUBLIC_* env vars are inlined by Expo at build time.
const FORCE_DB_RESET = __DEV__ && process.env.EXPO_PUBLIC_FORCE_DB_RESET === "1";
// Only reset once per cold start, even if modules re-evaluate.
const FORCE_DB_RESET_RAN_KEY = "__batiForceDbResetRan" as const;

type DbSingleton = {
  expoDb: ReturnType<typeof openDatabaseSync>;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const GLOBAL_KEY = "__batiDbSingleton" as const;

function createSingleton(): DbSingleton {
  const globalFlags = globalThis as unknown as Record<string, unknown>;
  if (FORCE_DB_RESET && !globalFlags[FORCE_DB_RESET_RAN_KEY]) {
    globalFlags[FORCE_DB_RESET_RAN_KEY] = true;
    // biome-ignore lint/suspicious/noConsole: intentional dev-only signal
    console.log(`[db] FORCE_DB_RESET=1 -> deleting ${DB_NAME} (cold start)`);
    try {
      deleteDatabaseSync(DB_NAME);
    } catch {
      // No existing file to delete — fine.
    }
  }

  const expoDb = openDatabaseSync(DB_NAME, { enableChangeListener: true });
  const db = drizzle(expoDb, { schema });
  return { expoDb, db };
}

const globalAny = globalThis as unknown as Record<string, unknown>;

if (!globalAny[GLOBAL_KEY]) {
  globalAny[GLOBAL_KEY] = createSingleton();
} else {
  // Important: during Fast Refresh, we avoid deleting/recreating the database here.
  // Recreating native handles while components still reference the previous instance
  // is a common cause of NativeDatabase null-pointer crashes.
}

const singleton = globalAny[GLOBAL_KEY] as DbSingleton;
const expoDb = singleton.expoDb;

/**
 * The raw expo-sqlite handle, for the one caller that cannot await.
 *
 * A fatal JS error gives the app a single tick before the runtime tears it down, which is not
 * enough for an awaited insert to flush — and a crash log that loses exactly the crashes that
 * killed the app is worse than none. `src/crashLog.ts` uses `runSync` on this handle for that
 * path only. A function rather than the binding itself so callers never capture a stale handle.
 */
export function getRawDb() {
  return expoDb;
}

/**
 * `VACUUM INTO`, on a connection of its own.
 *
 * It has to be its own, and that cost about an evening to learn. SQLite refuses `VACUUM` while
 * any statement on the connection is still busy, and the shared connection always has one:
 * Drizzle's expo driver prepares statements and keeps them alive. Measured on a device, every
 * snapshot this app has ever attempted failed the same way —
 *
 *     cannot VACUUM - SQL statements in progress
 *
 * — through Drizzle's `db.run(sql.raw(...))` and, when that was suspected, through the raw
 * handle's `execAsync` too. Same error, so it was never about how the statement was issued. The
 * app's SQLite directory had no `bati-export-*.db` in it at all: not one backup, manual or
 * unattended, had ever been written, and each failure reported into a dev console nobody reads.
 *
 * A second connection has nothing in flight by construction, and WAL gives it a consistent read
 * of the same file. It lives here rather than in db/backup.ts because that module is deliberately
 * free of per-platform file openers so it can run on better-sqlite3 — this is the one line of it
 * that cannot be, so it is behind the same door as every other handle in this app.
 */
export async function vacuumIntoFile(destinationPath: string): Promise<void> {
  const isolated = await openDatabaseAsync(DB_NAME);
  try {
    await isolated.execAsync(`VACUUM INTO ${sqlString(destinationPath)}`);
  } finally {
    await isolated.closeAsync();
  }
}

/**
 * Closes the native handle, best effort.
 *
 * Every query after this throws, so the only callers are the ones about to replace the file
 * underneath: the legacy reset below, and the restore in src/backupFiles.ts. A handle that will
 * not close cleanly must not stop the file operation that follows — a half-closed database is
 * still less bad than a half-restored one.
 */
export async function closeDatabase() {
  try {
    const maybeDb = expoDb as unknown as {
      closeSync?: () => void;
      closeAsync?: () => Promise<void>;
    };

    if (typeof maybeDb.closeSync === "function") {
      maybeDb.closeSync();
    } else if (typeof maybeDb.closeAsync === "function") {
      await maybeDb.closeAsync();
    }
  } catch (_e) {
    // Best effort — see the docstring.
  }
}

/** @legacy Remise à zéro destructive, prévue pour l'écran dev, jamais branchée. */
export async function resetDatabase() {
  await closeDatabase();

  try {
    deleteDatabaseSync(DB_NAME);
  } catch (_e) {
    // No database file to delete — the reset has nothing left to do.
  }
}

// Create drizzle instance with schema
export const db = singleton.db;

export { schema };

type TransactionCallback = Parameters<(typeof db)["transaction"]>[0];
export type TransactionTx = Parameters<TransactionCallback>[0];

function isAsyncTransactionUnsupported(e: unknown): boolean {
  // better-sqlite3 (used in Node unit tests) only supports sync callbacks.
  return (
    e instanceof TypeError &&
    typeof e.message === "string" &&
    e.message.includes("Transaction function cannot return a promise")
  );
}

/** Memoised so the probe below runs at most once per process. */
let asyncTransactions: boolean | null = null;

/**
 * Probing with an empty transaction, rather than with the real work, is the whole point:
 * better-sqlite3 rejects an async callback only *after* its body has started writing, so
 * catching that rejection and retrying would apply the same inserts twice.
 */
async function supportsAsyncTransactions(): Promise<boolean> {
  if (asyncTransactions !== null) return asyncTransactions;
  try {
    await db.transaction(async () => {
      // Deliberately empty: the probe must not write anything. See the note above.
    });
    asyncTransactions = true;
  } catch (e) {
    if (!isAsyncTransactionUnsupported(e)) throw e;
    asyncTransactions = false;
  }
  return asyncTransactions;
}

/**
 * The one queue every statement that cannot share the connection has to pass through.
 *
 * SQLite refuses `ATTACH` and `VACUUM INTO` *inside* a transaction, and an async transaction on
 * one JS thread is not a critical section: the runtime is free to run the export button's
 * handler between two of its statements. Without this queue, a widget write in flight turns a
 * perfectly good backup into "that file could not be opened" — and the failed `DETACH` that
 * follows leaves the alias bound until the next relaunch.
 *
 * ponytail: one lock for the whole database, so a slow transaction blocks a backup and vice
 * versa. Worth splitting only if a write ever gets long enough for the delay to be felt.
 */
let pending: Promise<unknown> = Promise.resolve();

/**
 * Runs `fn` once everything queued before it has settled. Never nest — the inner call would
 * wait on the outer one, which is waiting on it.
 */
export function serializeOnDatabase<T>(fn: () => Promise<T>): Promise<T> {
  const run = pending.then(fn, fn);
  // The queue must survive a rejected caller, or one failed backup wedges every later write.
  pending = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Runs `fn` atomically, falling back to a plain call on runtimes without async transactions. */
export function transactionOrFallback<T>(fn: (tx: TransactionTx) => Promise<T>): Promise<T> {
  return serializeOnDatabase(async () => {
    if (!(await supportsAsyncTransactions())) {
      return await fn(db as unknown as TransactionTx);
    }
    return await db.transaction(fn);
  });
}
