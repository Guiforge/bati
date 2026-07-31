import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// Increment this for a breaking schema/content change that needs a fresh start.
// No retro-compat: the DB filename is version-suffixed, so a bump simply opens a new
// empty file and re-runs every migration from scratch — the old file is just orphaned.
export const SCHEMA_VERSION = 3;

// Version the filename so a SCHEMA_VERSION bump auto-rebuilds without any read/delete
// dance (native handle deletion is unreliable in Expo Go anyway). __drizzle_migrations
// then tracks per-file which migrations have run. This is the *only* rebuild mechanism.
const DB_NAME = `bati.v${SCHEMA_VERSION}.db`;

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
let expoDb = singleton.expoDb;

export function reopenDatabase() {
  expoDb = openDatabaseSync(DB_NAME, {
    enableChangeListener: true,
  });
}

/**
 * The raw expo-sqlite handle, for the one caller that cannot await.
 *
 * A fatal JS error gives the app a single tick before the runtime tears it down, which is not
 * enough for an awaited insert to flush — and a crash log that loses exactly the crashes that
 * killed the app is worse than none. `src/crashLog.ts` uses `runSync` on this handle for that
 * path only. A function rather than the binding itself because `reopenDatabase` reassigns it.
 */
export function getRawDb() {
  return expoDb;
}

export async function resetDatabase() {
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
    // Best effort: this is a destructive reset, and a handle that will not close cleanly
    // must not stop the file below from being deleted.
  }

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

/** Runs `fn` atomically, falling back to a plain call on runtimes without async transactions. */
export async function transactionOrFallback<T>(fn: (tx: TransactionTx) => Promise<T>): Promise<T> {
  if (!(await supportsAsyncTransactions())) {
    return await fn(db as unknown as TransactionTx);
  }
  return await db.transaction(fn);
}
