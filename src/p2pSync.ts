import { Directory, File } from "expo-file-system";

import type { RemoteFile } from "@/src/cloudSync";
import { currentSession } from "@/src/p2p/current";
import { PeerGone } from "@/src/p2p/session";
import { p2pDir, received } from "@/src/p2p/transfer";

/**
 * The other device as a sync "server" (SPEC.md S1 to S6): what `deviceSync` lists, reads and writes
 * through, while the sync sheet holds a session open. Everything above it (vaults, verdicts, the
 * merge, the restore) is the same as for WebDAV or a folder.
 */
export type P2pAccount = { kind: "p2p"; peerId: string; name: string };

/** S2: the peer's file and this device's outbox, both at `modified: 0`, so `mustJoin` decides by name. */
async function list(): Promise<RemoteFile[]> {
  const session = currentSession();
  if (session === null) throw new PeerGone();
  const peer = await session.peerFile();
  const own = await session.ownFile();
  return [peer, own]
    .filter((f) => f !== null)
    .map((f) => ({ name: f.name, etag: f.sha, size: f.size, modified: 0 }));
}

/** S3: the verified copy that arrived, never anything still on its way. */
async function read(name: string, destination: File): Promise<void> {
  const got = received();
  if (got === null || got.file.name !== name)
    throw new Error(`${name} has not arrived from the other device`);
  if (destination.exists) destination.delete();
  await got.file.copy(destination);
}

/** S4, S5: only this device's own name goes to the peer; a kept copy never does. */
function write(source: File, name: string): Promise<string> {
  if (name.includes("-kept-")) throw new Error("A kept copy stays on this device");
  const session = currentSession();
  if (session === null) throw new PeerGone();
  return session.send(source, name);
}

export function p2pRemote(account: P2pAccount) {
  return { id: `p2p:${account.peerId}`, folder: account.name, user: "", list, read, write };
}

const keptDir = () => new Directory(p2pDir(), "kept");
const KEPT = 3;

/**
 * S6: the copy of this device made before a swap stays here, the last 3, listed in Settings under
 * "Copies kept before a swap". The caller also puts one where it lasts (the backup folder, or a
 * "Save a copy" the hero made) before the swap is allowed.
 */
export async function keepHere(snapshot: File, name: string): Promise<void> {
  const dir = keptDir();
  if (!dir.exists) dir.create();
  await snapshot.copy(new File(dir, name));
  const copies = keptCopies();
  for (const old of copies.slice(KEPT)) old.delete();
}

/** Newest first. Names carry their time (`-kept-<yyyymmddThhmmss>-`), so they sort. */
export function keptCopies(): File[] {
  const dir = keptDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((f): f is File => f instanceof File && f.name.endsWith(".batb"))
    .sort((a, b) => b.name.localeCompare(a.name));
}
