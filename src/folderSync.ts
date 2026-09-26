import { Directory, File, Paths } from "expo-file-system";

import type { RemoteFile } from "@/src/cloudSync";

/**
 * Device sync through a folder on this phone that another app keeps in step with the other
 * devices: Syncthing (Syncthing-Fork on Android), or any folder-syncing app. Bati never touches
 * the network here; the folder is a Storage Access Framework tree picked once, like the automatic
 * backup's, and its persistable permission is what lets sync read it at every launch.
 *
 * The contract is the WebDAV one: one sealed file per device, `bati-<id>.batb`, written only by its
 * device, nothing deleted. Syncthing then never sees two writers on one name, so it never makes a
 * `.sync-conflict-` copy (which would not match `PEER_FILE` anyway), and its own temporary files
 * (`.syncthing.*.tmp`) do not match either: the receiving side renames only complete files.
 *
 * ponytail: the modification time is the writer's device clock (Syncthing preserves it), where
 *           WebDAV gives the server's. The vault tie-break (`mustJoin`) reads it, so two devices
 *           whose clocks disagree by more than the gap between their key changes pick the wrong
 *           winner, and the loser asks for a password once more. A date inside the sealed header
 *           is the fix if that is ever seen.
 */

/** The file name at the end of a content URI, whose document id carries the whole path. */
function nameOf(entry: File): string {
  let decoded = entry.uri;
  try {
    decoded = decodeURIComponent(entry.uri);
  } catch {
    // A malformed escape is a name some other app wrote; its raw form fails the peer pattern.
  }
  return decoded.split("/").pop()?.split(":").pop() ?? "";
}

function filesIn(folder: Directory): File[] {
  return folder.list().filter((entry): entry is File => entry instanceof File);
}

export function folderRemote(uri: string) {
  const folder = new Directory(uri);
  const find = (name: string) => filesIn(folder).find((entry) => nameOf(entry) === name);

  return {
    list: (): Promise<RemoteFile[]> =>
      Promise.resolve().then(() =>
        filesIn(folder).map((entry) => {
          const info = entry.info();
          const modified = info.modificationTime ?? 0;
          // No etag in a folder: a changed file changes its time or its size.
          return { name: nameOf(entry), etag: `${modified}|${info.size ?? 0}`, modified };
        }),
      ),

    read: async (name: string, destination: File): Promise<void> => {
      const source = find(name);
      if (!source) throw new Error(`${name} is not in the sync folder`);
      if (destination.exists) destination.delete();
      await source.copy(destination);
    },

    /**
     * Copied straight over the device's previous file, under its final name.
     *
     * ponytail: not atomic. Writing under Syncthing's `.syncthing.*.tmp` name and renaming was the
     *           plan, but expo-file-system refuses `rename` on a content URI (measured on the
     *           emulator, 2026-09-26). Syncthing waits about ten seconds after a change before it
     *           reads a file, and a few MB take well under a second to copy, so a half-written file
     *           is unlikely to leave; if one does, the segmented format refuses it and that device
     *           reads as unreadable until its next write. The fix, if that is ever seen, is a
     *           `DocumentsContract.renameDocument` in a local module.
     */
    write: async (source: File, name: string): Promise<void> => {
      // The snapshot has its own name; the folder must get the device's.
      const local = new File(Paths.cache, name);
      await source.copy(local, { overwrite: true });
      try {
        await local.copy(folder, { overwrite: true });
      } finally {
        local.delete();
      }
    },
  };
}

/**
 * The folder as the hero knows it, from a tree URI: `Documents/SyncBati` for
 * `content://…/tree/primary%3ADocuments%2FSyncBati/`. The picker's URI ends with a slash, which
 * left the Settings row showing the whole URI.
 */
export function folderPath(uri: string): string {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    // Shown as is.
  }
  const tree = decoded.split("/tree/").pop() ?? decoded;
  return tree.replace(/\/+$/, "").replace(/^[^:/]*:/, "") || decoded;
}

/** The folder's own name, for the Settings row: "SyncBati" in `Documents/SyncBati`. */
export function folderLabel(uri: string): string {
  return folderPath(uri).split("/").pop() || folderPath(uri);
}
