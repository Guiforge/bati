import { drizzle } from "drizzle-orm/expo-sqlite";
import { deleteDatabaseSync, openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

export function resetDatabase() {
  try {
    deleteDatabaseSync("bati.db");
  } catch (e) {
    console.error("Error resetting database:", e);
  }
}

// Open database with change listener for live queries
const expoDb = openDatabaseSync("bati.db", { enableChangeListener: true });

// Create drizzle instance with schema
export const db = drizzle(expoDb, { schema });

export { schema };
