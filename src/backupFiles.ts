import { Directory, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { defaultDatabaseDirectory } from "expo-sqlite";

import { snapshotDatabaseTo } from "@/db/backup";
import { closeDatabase, DB_NAME, serializeOnDatabase } from "@/db/client";
import { dayKey } from "@/db/dates";
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

/**
 * `bati-export-v3-2026-08-15.db` — dated, for the human scrolling their files app. The hero's
 * own day, not UTC's: a backup taken at half past midnight in Paris is today's, not yesterday's.
 */
function exportFileName(now: Date) {
  return `${EXPORT_PREFIX}v${SCHEMA_VERSION}-${dayKey(now)}.db`;
}

/**
 * Writes a fresh dated snapshot in the app's own directory and returns it.
 *
 * Stale snapshots are cleared before writing rather than after the file has been handed on: when
 * `shareAsync` resolves, the receiving app may still be reading ours, and deleting it out from
 * under a lazy reader would hand the user a truncated backup. This way at most one stale
 * snapshot exists, and it costs one database's worth of disk.
 */
async function writeSnapshot(): Promise<File> {
  for (const entry of new Directory(`file://${DB_DIR}`).list()) {
    if (entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
  }

  const name = exportFileName(new Date());
  await snapshotDatabaseTo(pathIn(name));
  return fileIn(name);
}

/** Writes a snapshot and hands it to the OS share sheet. */
export async function exportBackup(): Promise<void> {
  // Checked before the snapshot is written: without a share sheet the file would land in
  // app-private storage the user has no way to reach, and reporting "backup ready" for a file
  // nobody can open is worse than reporting the failure.
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("No share sheet available — the backup would be unreachable");
  }

  const snapshot = await writeSnapshot();

  await Sharing.shareAsync(snapshot.uri, {
    mimeType: "application/octet-stream",
    dialogTitle: snapshot.name,
  });
}

/**
 * Writes a snapshot straight into a folder the hero picks. Returns `false` if they backed out.
 *
 * The share sheet hands the file to another app, which is not the same thing as having a copy:
 * on a device with nothing installed that accepts a `.db`, the sheet is a dead end. This is the
 * other half of the same snapshot — the folder picker returns a Storage Access Framework tree,
 * so the file is written locally first (`VACUUM INTO` needs a real path) and copied in after.
 *
 * The snapshot is written *after* the picker resolves, so backing out leaves nothing behind.
 */
export async function saveBackupToFolder(): Promise<boolean> {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (error) {
    // The picker signals "the user backed out" by throwing, so this is the one place that has to
    // tell a cancellation apart from a failure. Everything else here treats a throw as a failure.
    if (!isPickerCancelled(error)) throw error;
    return false;
  }

  const snapshot = await writeSnapshot();
  // Snapshots are named by the day, so a second save into the same folder aims at a name that is
  // already taken and the copy refuses. Replacing is what the hero means by saving again: the
  // file under that name is this app's own backup, from the same day, under a name only this app
  // writes. Without the flag they get "the backup could not be created" for a folder they picked
  // precisely because last time worked.
  await snapshot.copy(folder, { overwrite: true });
  return true;
}

function isPickerCancelled(error: unknown): boolean {
  const coded = error as { code?: unknown; message?: unknown } | null;
  return (
    coded?.code === "ERR_PICKER_CANCELLED" ||
    // The code is derived from the native exception's class name, so a rename upstream would
    // turn every cancellation into "the backup could not be created". The message is the belt.
    /cancel/i.test(String(coded?.message ?? ""))
  );
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
 *
 * It queues on the database like every write does, so a transaction still in flight when the
 * hero confirmed — a session being saved, a widget refresh — finishes before the handle closes,
 * instead of having its journal deleted out from under it in step 4.
 */
export function commitRestore(): Promise<void> {
  return serializeOnDatabase(async () => {
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
  });
}
