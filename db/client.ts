import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

// Open database with change listener for live queries
const expoDb = openDatabaseSync("bati.db", { enableChangeListener: true });

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
