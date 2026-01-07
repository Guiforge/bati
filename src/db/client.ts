import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// Increment this when doing breaking schema changes that require a fresh start
// (No retro-compat: bumping this forces a full DB rebuild on device.)
export const SCHEMA_VERSION = 3;

const DB_INIT_DEBUG = __DEV__ && process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG === "1";

// In Expo Go / dev, database deletion can be unreliable if native handles linger.
// Since we don't need retro-compat here, we version the filename in dev to
// guarantee a clean DB when SCHEMA_VERSION changes.
const DB_NAME = __DEV__ ? `bati.dev.v${SCHEMA_VERSION}.db` : "bati.db";

// Only allow FORCE_DB_RESET during dev, and only when explicitly enabled.
// Note: Expo inlines EXPO_PUBLIC_* env vars at build time.
const FORCE_DB_RESET = __DEV__ && process.env.EXPO_PUBLIC_FORCE_DB_RESET === "1";

// Ensure we only perform a force reset once per cold start (even if modules re-evaluate).
const FORCE_DB_RESET_RAN_KEY = "__batiForceDbResetRan" as const;

type DbSingleton = {
  expoDb: ReturnType<typeof openDatabaseSync>;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const GLOBAL_KEY = "__batiDbSingleton" as const;

// Check and reset database if schema version is outdated BEFORE opening
function checkSchemaVersion() {
  try {
    const globalFlags = globalThis as unknown as Record<string, unknown>;

    if (FORCE_DB_RESET && !globalFlags[FORCE_DB_RESET_RAN_KEY]) {
      globalFlags[FORCE_DB_RESET_RAN_KEY] = true;
      // biome-ignore lint/suspicious/noConsole: intentional dev-only signal
      console.log(`[db] FORCE_DB_RESET=1 -> deleting ${DB_NAME} (cold start)`);
      deleteDatabaseSync(DB_NAME);
    }

    const tempDb = openDatabaseSync(DB_NAME, {
      enableChangeListener: true,
    });
    try {
      const result = tempDb.getFirstSync<{ value: string }>(
        "SELECT value FROM user_preferences WHERE key = 'schema_version'",
      );
      const currentVersion = result ? parseInt(result.value, 10) : 0;

      if (currentVersion < SCHEMA_VERSION) {
        tempDb.closeSync();
        deleteDatabaseSync(DB_NAME);
      } else {
        tempDb.closeSync();
      }
    } catch (e) {
      // Table doesn't exist or query failed - check if old database exists.
      // This is expected on fresh install (no tables yet).
      if (DB_INIT_DEBUG) {
        // biome-ignore lint/suspicious/noConsole: Debug logging
        console.log("[db] Schema version check failed (expected on fresh install):", e);
      }
      try {
        const tables = tempDb.getAllSync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
        );
        if (tables.length > 0) {
          tempDb.closeSync();
          deleteDatabaseSync(DB_NAME);
        } else {
          tempDb.closeSync();
        }
      } catch {
        tempDb.closeSync();
      }
    }
  } catch {
    // Database doesn't exist yet - that's fine
  }
}

function createSingleton(): DbSingleton {
  // Only do destructive operations during cold start (not on Fast Refresh).
  checkSchemaVersion();
  const expoDb = openDatabaseSync(DB_NAME, {
    enableChangeListener: true,
  });

  // Create drizzle instance with schema
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
  } catch (_e) {}

  try {
    deleteDatabaseSync(DB_NAME);
  } catch (_e) {}
}

// Create drizzle instance with schema
export const db = singleton.db;

export { schema };
