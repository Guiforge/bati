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
 * (`.syncthing.*.tmp`) do not match either.
 *
 * ponytail: the modification time is the writer's device clock (Syncthing preserves it), where
 *           WebDAV gives the server's. The vault tie-break (`mustJoin`) reads it, so two devices
 *           whose clocks disagree by more than the gap between their key changes pick the wrong
 *           winner, and the loser asks for a password once more. A date inside the sealed header
 *           is the fix if that is ever seen.
 */

/** Syncthing skips any name with this prefix while it is being written, and cleans up stale ones. */
const STAGING_PREFIX = ".syncthing.";

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
     * Written under a staging name Syncthing does not send, then renamed into place: a copy it
     * picked up halfway would otherwise reach the other devices truncated, and read as unreadable
     * until the next write. Between the delete and the rename the file is briefly absent, which
     * every reader takes as "no news", never as a truncated history.
     */
    write: async (source: File, name: string): Promise<void> => {
      const staged = `${STAGING_PREFIX}${name}.tmp`;
      const local = new File(Paths.cache, staged);
      await source.copy(local, { overwrite: true });
      try {
        await local.copy(folder, { overwrite: true });
      } finally {
        local.delete();
      }
      const written = find(staged);
      if (!written) throw new Error("The staged file did not reach the sync folder");
      find(name)?.delete();
      written.rename(name);
    },
  };
}

/** The folder's own name, for the Settings row: "Bati" in `Syncthing/Bati`. */
export function folderLabel(uri: string): string {
  let decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch {
    // Shown as is.
  }
  return decoded.split("/").pop()?.split(":").pop() || decoded;
}
