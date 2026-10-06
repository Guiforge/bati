import { sealedCopiesInBackupFolder } from "@/src/autoBackup";
import {
  decryptStagedImport,
  discardStagedImport,
  stageBackupForImport,
  stageBackupFrom,
} from "@/src/backupFiles";
import { joinPeer, serverState, syncAccount } from "@/src/deviceSync";
import { reportError } from "@/src/reportError";

/**
 * Getting a key back on a phone that has lost it: a database Android restored onto a new phone says the hero wanted
 * encryption (`encryptionStatus() === "locked"`) and holds no key. The way out is the password or the twelve words
 * the hero already has, tried against something sealed with that key, and never a new key: a new password makes
 * a second vault that every older copy stays closed to.
 *
 * Three places hold something to try, in the order a hero thinks of them:
 *   - `server`: another device of theirs, or the sync folder, whose file asks for a password;
 *   - `folder`: the sealed copies in the backup folder (the newest few);
 *   - `file`: a file they choose, for a hero with no server and no folder.
 */
export type UnlockSource = "server" | "folder" | "file";

export type UnlockResult =
  /** The key is this phone's again. */
  | "unlocked"
  /** The password or words open nothing that was tried. */
  | "wrong"
  /** Something to read the key from was found and it is not a Bati backup, or none was found. */
  | "nothingToTry"
  /** A backup of a version this build cannot read: update Bati. */
  | "newerVersion"
  /** The hero backed out of the file picker. */
  | "cancelled";

/** Which sources have anything behind them: the hero is not offered a choice that leads nowhere. */
export async function unlockSources(): Promise<{ server: boolean; folder: boolean }> {
  const [account, copies] = await Promise.all([
    syncAccount().catch((error: unknown) => {
      reportError("vault.unlock.account", error);
      return null;
    }),
    sealedCopiesInBackupFolder().catch((error: unknown) => {
      reportError("vault.unlock.copies", error);
      return [];
    }),
  ]);
  return { server: account !== null, folder: copies.length > 0 };
}

/** The secret is a password or the twelve words, whichever the hero has: the cipher tells them apart. */
export function unlockWith(source: UnlockSource, secret: string): Promise<UnlockResult> {
  if (source === "server") return unlockFromServer(secret);
  return source === "folder" ? unlockFromFolder(secret) : unlockFromChosenFile(secret);
}

async function unlockFromServer(secret: string): Promise<UnlockResult> {
  const state = await serverState();
  // A server with no vault, or one whose files this phone cannot read at all, has nothing to unlock from.
  if (state.kind === "newerVersion") return "newerVersion";
  if (state.kind !== "needsSecret") return "nothingToTry";
  return (await joinPeer(state.peer, secret)) ? "unlocked" : "wrong";
}

async function unlockFromFolder(secret: string): Promise<UnlockResult> {
  const copies = await sealedCopiesInBackupFolder();
  let result: UnlockResult = "nothingToTry";
  for (const copy of copies) {
    try {
      await stageBackupFrom(copy);
      result = await openStaged(secret);
    } catch (error) {
      // One copy that cannot be read (cut short, not ours) must not hide the next one.
      reportError("vault.unlock.folder", error);
    } finally {
      discardStagedImport();
    }
    if (result === "unlocked" || result === "newerVersion") return result;
  }
  return result;
}

async function unlockFromChosenFile(secret: string): Promise<UnlockResult> {
  try {
    if ((await stageBackupForImport()) === null) return "cancelled";
    return await openStaged(secret);
  } catch (error) {
    reportError("vault.unlock.file", error);
    return "nothingToTry";
  } finally {
    discardStagedImport();
  }
}

/** The staged file, opened with what the hero typed; its key becomes this phone's when it opens. */
async function openStaged(secret: string): Promise<UnlockResult> {
  const opened = await decryptStagedImport(secret);
  if (opened.result === "newerVersion") return "newerVersion";
  if (opened.result === "wrongSecret" || opened.result === "needsSecret") return "wrong";
  if (opened.result !== "opened" || opened.join === undefined) return "nothingToTry";
  await opened.join({ asPrimary: true });
  return "unlocked";
}
