import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// Increment this when doing breaking schema changes that require a fresh start
export const SCHEMA_VERSION = 2;

// Check and reset database if schema version is outdated BEFORE opening
(function checkSchemaVersion() {
  try {
    const tempDb = openDatabaseSync("bati.db");
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
})();

// Open database with change listener for live queries
let expoDb = openDatabaseSync("bati.db", { enableChangeListener: true });

export function reopenDatabase() {
  expoDb = openDatabaseSync("bati.db", { enableChangeListener: true });
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
export const db = drizzle(expoDb, { schema });

export { schema };
