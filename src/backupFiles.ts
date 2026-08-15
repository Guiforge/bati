import { Directory, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { defaultDatabaseDirectory } from "expo-sqlite";

import { snapshotDatabaseTo } from "@/db/backup";
import { closeDatabase, DB_NAME } from "@/db/client";
import { SCHEMA_VERSION } from "@/db/schemaVersion";

/**
 * Backup and restore, the disk half: picking, sharing, and the file swap.
 *
 * The decisions live in db/backup.ts, which is pure SQL and covered by tests. What is left here
 * is sequencing, and the order is the whole point — see `commitRestore`.
 */

/** A real filesystem path (`/data/user/0/<pkg>/files/SQLite`), which is what SQLite needs. */
const DB_DIR = defaultDatabaseDirectory as string;

/** The picked file, copied next to the database so it lands on the same filesystem. */
const IMPORT_NAME = "bati-import.tmp.db";

/**
 * The database as it was just before the last restore, and the rollback source if the swap
 * fails. It *is* the previous file, renamed rather than copied — see `commitRestore`.
 */
const SAFETY_NAME = `${DB_NAME}.bak`;

/** The snapshot handed to the share sheet. One at a time, replaced on the next export. */
const EXPORT_PREFIX = "bati-export-";

function pathIn(name: string) {
  return `${DB_DIR}/${name}`;
}

/** expo-file-system speaks URIs; SQLite speaks paths. This is the only place they meet. */
function fileIn(name: string) {
  return new File(`file://${pathIn(name)}`);
}

function deleteIfPresent(name: string) {
  const file = fileIn(name);
  if (file.exists) file.delete();
}

/** `bati-export-v3-2026-08-15.db` — dated, for the human scrolling their files app. */
function exportFileName(now: Date) {
  return `${EXPORT_PREFIX}v${SCHEMA_VERSION}-${now.toISOString().slice(0, 10)}.db`;
}

/**
 * Writes a snapshot and hands it to the OS share sheet.
 *
 * Stale snapshots are cleared before writing rather than after sharing: when `shareAsync`
 * resolves, the receiving app may still be reading ours, and deleting it out from under a lazy
 * reader would hand the user a truncated backup. This way at most one stale snapshot exists.
 */
export async function exportBackup(): Promise<void> {
  for (const entry of new Directory(`file://${DB_DIR}`).list()) {
    if (entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
  }

  // Checked before the snapshot is written: without a share sheet the file would land in
  // app-private storage the user has no way to reach, and reporting "backup ready" for a file
  // nobody can open is worse than reporting the failure.
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("No share sheet available — the backup would be unreachable");
  }

  const name = exportFileName(new Date());
  await snapshotDatabaseTo(pathIn(name));

  await Sharing.shareAsync(`file://${pathIn(name)}`, {
    mimeType: "application/octet-stream",
    dialogTitle: name,
  });
}

/**
 * Opens the picker and copies the chosen file next to the database.
 *
 * Returns the path to validate, or `null` if the user backed out. Nothing destructive has
 * happened when this returns — the copy is a new file under a name of ours.
 */
export async function stageBackupForImport(): Promise<string | null> {
  // Backups have no registered MIME type and Android's picker greys out what it cannot name, so
  // the filter stays open. Validation decides what is acceptable, never the file extension.
  const picked = await File.pickFileAsync({ mimeTypes: ["*/*"] });
  if (picked.canceled || !picked.result) return null;

  deleteIfPresent(IMPORT_NAME);
  await picked.result.copy(fileIn(IMPORT_NAME));
  return pathIn(IMPORT_NAME);
}

/** Throws away a staged import. The app is untouched, so there is nothing else to undo. */
export function discardStagedImport(): void {
  deleteIfPresent(IMPORT_NAME);
}

/**
 * Replaces the database with the staged import. Destructive, and last for a reason.
 *
 * The order matters more than anything else in this file:
 *
 * 1. the caller has already validated the staged file;
 * 2. the caller has already shown the blocking screen, so React has unmounted every consumer
 *    and nothing is left to query a database that is about to close;
 * 3. the handle closes;
 * 4. the journal sidecars go, because they describe the *old* file — leaving one behind lets
 *    SQLite roll it back into the new database on the next launch, which corrupts it;
 * 5. the old database is renamed aside to `.bak` — that rename *is* the safety copy, so the
 *    file the hero had is never deleted, only moved;
 * 6. the staged file takes the now-free name.
 *
 * Renaming aside rather than overwriting in place is the whole reason for step 5. `File.move`
 * with `overwrite` deletes the destination *before* it attempts the rename, so a failure there
 * would leave no database at all — while this screen tells the hero nothing was replaced. With
 * the old file parked under another name, a failed step 6 can put it straight back.
 */
export async function commitRestore(): Promise<void> {
  await closeDatabase();

  for (const suffix of ["-journal", "-wal", "-shm"]) {
    deleteIfPresent(`${DB_NAME}${suffix}`);
  }

  // Only the previous restore's `.bak` is expendable here; the live database never is.
  deleteIfPresent(SAFETY_NAME);
  const parkedAside = fileIn(DB_NAME).exists;
  if (parkedAside) await fileIn(DB_NAME).move(fileIn(SAFETY_NAME));

  try {
    await fileIn(IMPORT_NAME).move(fileIn(DB_NAME));
  } catch (error) {
    // `overwrite` here because a half-finished move may have left a partial file under the
    // real name, and a partial import is exactly what must not survive this.
    if (parkedAside) await fileIn(SAFETY_NAME).move(fileIn(DB_NAME), { overwrite: true });
    throw error;
  }
}
