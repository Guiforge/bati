import { Directory, File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { defaultDatabaseDirectory } from "expo-sqlite";

import { snapshotDatabaseTo } from "@/db/backup";
import { closeDatabase, DB_NAME, serializeOnDatabase } from "@/db/client";
import { dayKey } from "@/db/dates";
import { SCHEMA_VERSION } from "@/db/schemaVersion";
import { encryptionStatus, type OpenResult, openBackup, sealBackup } from "@/src/backupCipher";
import { reportError } from "@/src/reportError";

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

/** An encrypted import, decrypted. It replaces `IMPORT_NAME` only once it has authenticated. */
const IMPORT_PLAIN = "bati-import-plain.tmp.db";

/**
 * The database as it was just before the last restore, and the rollback source if the swap
 * fails. It *is* the previous file, renamed rather than copied — see `commitRestore`.
 */
const SAFETY_NAME = `${DB_NAME}.bak`;

/** The snapshot handed to the share sheet. One at a time, replaced on the next export. */
const EXPORT_PREFIX = "bati-export-";

/**
 * The plaintext `VACUUM INTO` writes before it is sealed. It carries the export prefix so the
 * sweep at the top of `writeSnapshot` takes it too, should a crash ever leave one behind.
 */
const PLAIN_SNAPSHOT = `${EXPORT_PREFIX}plain.tmp.db`;

/** `.batb` for a sealed snapshot (src/backupCipher.ts), `.db` for a plain one. */
const extension = (encrypted: boolean) => (encrypted ? ".batb" : ".db");

/**
 * How many snapshots survive in a chosen folder. More than one because the reason to keep a
 * backup at all is that the newest thing might be the broken thing; not many more because these
 * are whole databases sitting in the hero's own storage, and nobody asked us to fill it.
 */
const KEEP_SNAPSHOTS = 5;

/**
 * The tail of a snapshot's URI — `…/bati-export-v3-2026-08-15.db` — capturing the day, which is
 * what pruning sorts on.
 *
 * Matched against the *URI* rather than `entry.name`, and that is not a style choice. A Storage
 * Access Framework tree hands back **document** URIs, whose whole document id is one
 * percent-encoded segment: `…/document/primary%3ADocuments%2Fbati-export-v3-2026-08-15.db`.
 * `File.name` is `Paths.basename`, which only recovers the filename from that if `new URL()`
 * parses the `content://` scheme — and React Native's `URL` is a partial polyfill that does not
 * have to. Where it does not, `name` is the encoded segment and a name-anchored pattern matches
 * nothing, so the prune would silently never run on a device while every test stayed green.
 * Decoding the URI turns `%2F` back into a separator and makes both shapes match.
 */
const SNAPSHOT_URI = new RegExp(
  `(?:^|/)${EXPORT_PREFIX}v\\d+-(\\d{4}-\\d{2}-\\d{2})\\.(?:db|batb)$`,
);

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
 * `bati-export-v3-2026-08-15` — dated, for the human scrolling their files app. The hero's own
 * day, not UTC's: a backup taken at half past midnight in Paris is today's, not yesterday's.
 * A stem: `writeSnapshot` adds the extension once it knows whether the file is sealed.
 */
function exportFileStem(now: Date) {
  return `${EXPORT_PREFIX}v${SCHEMA_VERSION}-${dayKey(now)}`;
}

/**
 * `bati-export-before-restore-v3-2026-09-19-091502`: the database a restore is about to
 * replace. To the second, because two restores on one day must not overwrite each other: the
 * second one's "before" is the first one's backup, and the hero's own data is the file under
 * the first name. `SNAPSHOT_URI` does not match it, so pruning never takes one; they are rare
 * and they are the only copy of what a restore threw away.
 */
export function preRestoreFileStem(now: Date) {
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  return `${EXPORT_PREFIX}before-restore-v${SCHEMA_VERSION}-${dayKey(now)}-${time}`;
}

/**
 * Writes a fresh dated snapshot in the app's own directory and returns it.
 *
 * Stale snapshots are cleared before writing rather than after the file has been handed on: when
 * `shareAsync` resolves, the receiving app may still be reading ours, and deleting it out from
 * under a lazy reader would hand the user a truncated backup. This way at most one stale
 * snapshot exists, and it costs one database's worth of disk.
 */
async function writeSnapshot(stem = exportFileStem(new Date())): Promise<File> {
  for (const entry of new Directory(`file://${DB_DIR}`).list()) {
    if (entry.name.startsWith(EXPORT_PREFIX)) entry.delete();
  }

  // Asked on every write rather than once: the hero can switch it on between two backups, and a
  // plaintext copy written after they asked for encryption is the one outcome that must not be.
  const encrypted = (await encryptionStatus()) === "on";
  const name = stem + extension(encrypted);
  if (!encrypted) {
    await snapshotDatabaseTo(pathIn(name));
    return fileIn(name);
  }

  await sealedSnapshotTo(name);
  return fileIn(name);
}

/**
 * `VACUUM INTO` needs a real path and writes plaintext; the seal reads it and it goes. On a
 * failure too: the plaintext is swept by the next export anyway, but not leaving it is free.
 */
async function sealedSnapshotTo(name: string): Promise<void> {
  deleteIfPresent(name);
  await snapshotDatabaseTo(pathIn(PLAIN_SNAPSHOT));
  await sealBackup(pathIn(PLAIN_SNAPSHOT), pathIn(name)).finally(() =>
    deleteIfPresent(PLAIN_SNAPSHOT),
  );
}

/**
 * What device sync uploads: this device's whole history, sealed, under a name the export sweep
 * leaves alone, because it is written at launch and sent once the app is up (src/deviceSync.ts).
 * Always sealed: sync refuses to run with encryption off, and this refuses too, so a plaintext
 * history can never reach a server even if a caller forgets to ask.
 */
const SYNC_OUT = "bati-sync-out.batb";

export async function writeSyncSnapshot(): Promise<File> {
  if ((await encryptionStatus()) !== "on") throw new Error("Sync needs encryption on");
  await sealedSnapshotTo(SYNC_OUT);
  return fileIn(SYNC_OUT);
}

/** The snapshot written by `writeSyncSnapshot` and not sent yet, or `null`. */
export function pendingSyncSnapshot(): File | null {
  const file = fileIn(SYNC_OUT);
  return file.exists ? file : null;
}

/** Scratch files for other devices' snapshots: sealed as downloaded, then opened. */
const PEER_PREFIX = "bati-peer-";

export function peerScratch(index: number, kind: "sealed" | "plain"): File {
  return fileIn(`${PEER_PREFIX}${index}.tmp${kind === "sealed" ? ".batb" : ".db"}`);
}

/** Deletes every peer scratch file. Run before a sync, and after one for whatever it did not keep. */
export function clearPeerScratch(keep?: File): void {
  for (const entry of new Directory(`file://${DB_DIR}`).list()) {
    if (entry.name.startsWith(PEER_PREFIX) && entry.uri !== keep?.uri) entry.delete();
  }
}

/**
 * Moves an already-opened peer snapshot into the import slot, where the ordinary restore takes
 * over: the same validation, the same pre-restore copy, the same swap. A second door to restore
 * goes through the first door's handler.
 */
export async function stagePeerForImport(plain: File): Promise<string> {
  deleteIfPresent(IMPORT_NAME);
  await plain.move(fileIn(IMPORT_NAME));
  return pathIn(IMPORT_NAME);
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
 * Opens the folder picker. Returns `null` if the hero backed out, which is not a failure.
 *
 * The tree it returns carries a *persistable* URI permission — expo-file-system's
 * `FilePickerContract` takes it on the result of `ACTION_OPEN_DOCUMENT_TREE` — so
 * `folder.uri` is worth storing and reconstructing later with `new Directory(uri)`. That is
 * what `src/autoBackup.ts` does, and the only reason unattended backups are possible at all.
 */
export async function pickBackupFolder(): Promise<Directory | null> {
  try {
    return await Directory.pickDirectoryAsync();
  } catch (error) {
    // The picker signals "the user backed out" by throwing, so this is the one place that has to
    // tell a cancellation apart from a failure. Everything else here treats a throw as a failure.
    if (!isPickerCancelled(error)) throw error;
    return null;
  }
}

/**
 * Writes a snapshot straight into a folder. Returns `false` if the hero backed out of the picker.
 *
 * The share sheet hands the file to another app, which is not the same thing as having a copy:
 * on a device with nothing installed that accepts a `.db`, the sheet is a dead end. This is the
 * other half of the same snapshot — the folder is a Storage Access Framework tree, so the file
 * is written locally first (`VACUUM INTO` needs a real path) and copied in after.
 *
 * Pass a `folder` to write into a tree already granted; without one it asks. The snapshot is
 * written *after* the picker resolves, so backing out leaves nothing behind.
 */
export async function saveBackupToFolder(folder?: Directory, stem?: string): Promise<boolean> {
  const target = folder ?? (await pickBackupFolder());
  if (!target) return false;

  const snapshot = await writeSnapshot(stem);
  // Snapshots are named by the day, so a second save into the same folder aims at a name that is
  // already taken and the copy refuses. Replacing is what the hero means by saving again: the
  // file under that name is this app's own backup, from the same day, under a name only this app
  // writes. Without the flag they get "the backup could not be created" for a folder they picked
  // precisely because last time worked.
  await snapshot.copy(target, { overwrite: true });

  // After the copy, and deliberately not allowed to undo it. The file is written; pruning is
  // housekeeping, and a folder that refuses a delete — a provider that only grants create, a
  // file another app has open — must not turn a backup that succeeded into "the backup could
  // not be created". Unattended, it would be worse than a wrong toast: `backupBeforeMigrations`
  // forgets the folder on a throw, so a failed prune would switch the feature off for good.
  try {
    pruneSnapshotsIn(target);
  } catch (error) {
    reportError("backup.prune", error);
  }

  return true;
}

/**
 * Deletes all but the newest `KEEP_SNAPSHOTS` Bati snapshots in a folder.
 *
 * Every write into a chosen tree ends here, so nothing accumulates unattended. The filter is the
 * safety: this runs inside a folder the hero picked, which may be their Documents root, and only
 * names this app writes are ever considered — never "everything but the newest five files".
 *
 * Sorted on the captured day rather than the whole name: `v3` and `v10` do not sort as numbers,
 * so a name-ordered prune would start deleting the newest schema's backups first.
 */
function pruneSnapshotsIn(folder: Directory): void {
  const snapshots: { day: string; entry: File }[] = [];
  for (const entry of folder.list()) {
    if (!(entry instanceof File)) continue;
    const day = SNAPSHOT_URI.exec(decodeUri(entry.uri))?.[1];
    if (day) snapshots.push({ day, entry });
  }

  snapshots.sort((a, b) => b.day.localeCompare(a.day));
  for (const stale of snapshots.slice(KEEP_SNAPSHOTS)) stale.entry.delete();
}

/** A URI that will not decode is left as it is: the pattern simply will not match it, which is
 * the safe answer — an unrecognised file is one this app did not write and must not delete. */
function decodeUri(uri: string): string {
  try {
    return decodeURIComponent(uri);
  } catch {
    return uri;
  }
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

/**
 * Decrypts the staged import in place, when it is sealed. `"notEncrypted"` leaves a plain backup
 * exactly as it was, so every import goes through here and validation stays the one gate after.
 *
 * Without a `secret` it tries the keys this phone holds; `"needsSecret"` and `"wrongSecret"` ask
 * the caller for the hero's password or recovery key. Rejects on a file whose body does not
 * authenticate, which is a damaged backup and is reported as one.
 */
export async function decryptStagedImport(secret?: string): Promise<OpenResult> {
  deleteIfPresent(IMPORT_PLAIN);
  const result = await openBackup(pathIn(IMPORT_NAME), pathIn(IMPORT_PLAIN), secret);
  if (result === "opened") {
    await fileIn(IMPORT_PLAIN).move(fileIn(IMPORT_NAME), { overwrite: true });
  }
  return result;
}

/** Throws away a staged import. The app is untouched, so there is nothing else to undo. */
export function discardStagedImport(): void {
  deleteIfPresent(IMPORT_NAME);
  deleteIfPresent(IMPORT_PLAIN);
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
