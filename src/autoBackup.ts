import { Directory } from "expo-file-system";

import { preferences } from "@/db/preferences";
import { pickBackupFolder, saveBackupToFolder } from "@/src/backupFiles";
import { reportError } from "@/src/reportError";

/**
 * Backups that write themselves, and the whole of the "sync with Drive / Dropbox / …" answer.
 *
 * A folder the hero picks once is a Storage Access Framework tree, and every cloud client worth
 * naming — Drive, Dropbox, Nextcloud, OneDrive, Syncthing — publishes one as a
 * `DocumentsProvider`. So they all appear *inside the picker the app already opens*: one
 * integration covers every backend, with no OAuth, no SDK per vendor, no credential at rest and
 * no network request. The app never learns which provider was chosen, which is the point.
 *
 * The trigger is `ensureMigrations()` (db/migrate.ts), before the runner. Migrations are the one
 * moment this database can be damaged in a way no undo covers, and they are also the only moment
 * worth spending a write on: an ordinary launch has nothing new to save that the hero did not
 * just watch happen.
 *
 * This module is the single writer of the `backupFolderUri` preference. Everything else asks it.
 */

/** The tree the hero chose, or `null` when the feature is off. */
async function rememberedFolder(): Promise<Directory | null> {
  const uri = await preferences.getBackupFolderUri();
  return uri === null ? null : new Directory(uri);
}

/**
 * `content://…/tree/primary%3ADocuments%2FBati` → `Documents/Bati`.
 *
 * A stored URI the hero can neither see nor revoke is exactly the kind of invisible state that
 * goes wrong silently, so Settings shows the folder back to them. The raw URI would be worse
 * than nothing — it names a provider authority, not a place anybody recognises.
 *
 * Everything after the last colon is the document id's path, which is the human half. Picking
 * the root of a volume leaves that half empty; the volume name is then the best available
 * answer, and it is at least the word Android's own picker used.
 */
export function backupFolderLabel(uri: string): string {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch (error) {
    // A URI we cannot decode is still a URI we can show a tail of, and a backup folder is not
    // worth a crash. Reported rather than swallowed so a provider with odd escaping is findable.
    reportError("backup.folderLabel", error);
  }

  const segments = decoded.split(":");
  const path = segments.pop() ?? "";
  if (path !== "") return path;

  const volume = segments.pop()?.split("/").pop();
  return volume === undefined || volume === "" ? uri : volume;
}

/** The folder shown in Settings, or `null` when automatic backup is off. */
export async function autoBackupFolder(): Promise<string | null> {
  const uri = await preferences.getBackupFolderUri();
  return uri === null ? null : backupFolderLabel(uri);
}

/**
 * Asks for a folder, remembers it, and writes a snapshot into it straight away.
 *
 * The immediate write is not a nicety: it is the only proof the hero gets that the permission
 * took and the folder is writable. Without it, "on" would mean "on, probably, you will find out
 * at the next update" — and the next update is precisely when finding out is too late. A folder
 * that fails this first write is never remembered.
 *
 * Returns the folder's label, or `null` if the hero backed out of the picker.
 */
export async function enableAutoBackup(): Promise<string | null> {
  const folder = await pickBackupFolder();
  if (!folder) return null;

  await saveBackupToFolder(folder);
  await preferences.setBackupFolderUri(folder.uri);
  return backupFolderLabel(folder.uri);
}

/** Forgets the folder. The snapshots already written are the hero's, and stay where they are. */
export async function disableAutoBackup(): Promise<void> {
  await preferences.clearBackupFolderUri();
}

/**
 * Writes a snapshot before the migration runner touches anything, when a folder is remembered.
 *
 * Never throws: it is called from inside `ensureMigrations`, and a backup that cannot be written
 * must not be the reason an app fails to start. A launch with no folder remembered — every launch
 * for a hero who never turned this on — costs one indexed read and returns.
 */
export async function backupBeforeMigrations(): Promise<void> {
  let folder: Directory | null = null;
  try {
    folder = await rememberedFolder();
  } catch (error) {
    // Reading preferences *before* migrations means the table may not exist yet. A database that
    // old has no remembered folder either, so there is nothing to save and nothing to report.
    if (!isMissingTable(error)) reportError("backup.auto.read", error);
    return;
  }

  if (!folder) return;

  try {
    await saveBackupToFolder(folder);
  } catch (error) {
    reportError("backup.auto", error);
    // ponytail: one failure turns the feature off, rather than a retry counter. The ceiling is
    //           that a transient failure — a full disk, an unmounted card — costs the hero a
    //           trip to Settings. It buys the only honest report available: `reportError` writes
    //           to a dev console nobody ships, so the Settings row falling back to "Off" is the
    //           single signal a real hero can see. Add a counter when a real device produces a
    //           failure that recovers on its own.
    await disableAutoBackup().catch((e) => reportError("backup.auto.forget", e));
  }
}

/** A pre-migration read of a table a migration has not created yet. Not a failure worth logging. */
function isMissingTable(error: unknown): boolean {
  return /no such table/i.test(String((error as { message?: unknown } | null)?.message ?? ""));
}
