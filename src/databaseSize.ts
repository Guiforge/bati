import { File } from "expo-file-system";
import { defaultDatabaseDirectory } from "expo-sqlite";
import { SCHEMA_VERSION } from "@/db/schemaVersion";

/**
 * What Android's backup copies: the database file and its write-ahead log, `bati.v3.db` and
 * `-wal` (plugins/withAndroidBackupRules.js). Freed pages stay in the file, so removing a photo
 * does not shrink this number until the file is rebuilt.
 */
export function databaseBytes(): number {
  const base = `file://${defaultDatabaseDirectory}/bati.v${SCHEMA_VERSION}.db`;
  return [base, `${base}-wal`].reduce((sum, uri) => {
    const file = new File(uri);
    return sum + (file.exists ? file.size : 0);
  }, 0);
}
