import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

console.log("[DB] client.ts module loading...");

// Increment this when doing breaking schema changes that require a fresh start
export const SCHEMA_VERSION = 2;
const FORCE_DB_RESET = __DEV__ && process.env.EXPO_PUBLIC_FORCE_DB_RESET === "1";

type DbSingleton = {
  expoDb: ReturnType<typeof openDatabaseSync>;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

const GLOBAL_KEY = "__batiDbSingleton" as const;

// Check and reset database if schema version is outdated BEFORE opening
function checkSchemaVersion() {
  try {
    if (FORCE_DB_RESET) {
      console.log("Force resetting database for testing...");
      deleteDatabaseSync("bati.db");
    }

    const tempDb = openDatabaseSync("bati.db", {
      enableChangeListener: true,
    });
    try {
      const result = tempDb.getFirstSync<{ value: string }>(
        "SELECT value FROM user_preferences WHERE key = 'schema_version'",
      );
      const currentVersion = result ? parseInt(result.value, 10) : 0;

      if (currentVersion < SCHEMA_VERSION) {
        console.log(
          `Schema version mismatch: ${currentVersion} < ${SCHEMA_VERSION}, resetting database`,
        );
        tempDb.closeSync();
        deleteDatabaseSync("bati.db");
      } else {
        tempDb.closeSync();
      }
    } catch {
      // Table doesn't exist or query failed - check if old database exists
      try {
        const tables = tempDb.getAllSync<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
        );
        if (tables.length > 0) {
          // Has tables but no schema_version - old database, reset it
          console.log("Old database without schema_version detected, resetting...");
          tempDb.closeSync();
          deleteDatabaseSync("bati.db");
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

  console.log("[DB] Opening database...");
  const expoDb = openDatabaseSync("bati.db", {
    enableChangeListener: true,
  });
  console.log("[DB] Database opened successfully");

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
  if (FORCE_DB_RESET) {
    console.warn(
      "[DB] EXPO_PUBLIC_FORCE_DB_RESET is set, but the DB singleton already exists (Fast Refresh). " +
        "Restart the dev client for a clean reset.",
    );
  }
}

const singleton = globalAny[GLOBAL_KEY] as DbSingleton;
let expoDb = singleton.expoDb;

export function reopenDatabase() {
  expoDb = openDatabaseSync("bati.db", {
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
  } catch (e) {
    console.warn("Error closing database before reset:", e);
  }

  try {
    deleteDatabaseSync("bati.db");
  } catch (e) {
    console.error("Error resetting database:", e);
  }
}

// Create drizzle instance with schema
export const db = singleton.db;

export { schema };
