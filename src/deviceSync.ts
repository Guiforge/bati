import * as SecureStore from "expo-secure-store";

import { compareWithPeer, type PeerComparison, validateBackup } from "@/db/backup";
import { uuidv7 } from "@/db/uuid";
import { encryptionStatus, openBackup } from "@/src/backupCipher";
import {
  clearPeerScratch,
  peerScratch,
  pendingSyncSnapshot,
  writeSyncSnapshot,
} from "@/src/backupFiles";
import {
  downloadRemote,
  listRemote,
  loginToNextcloud,
  type NextcloudAccount,
  uploadRemote,
} from "@/src/cloudSync";
import { reportError } from "@/src/reportError";

/**
 * Phone, tablet and whatever comes next, one hero: roadmap 4.18 phases 2 and 3.
 *
 * **One file per device, written only by that device.** Each install uploads its whole history,
 * sealed, as `bati-<install id>.batb`, and only ever reads the others'. No lock, no shared file two
 * devices can race on, and nothing ever deletes another device's file, which is the rotation bug
 * InlitX/streak ships. A few MB per device is a small price, and it is also why this is not
 * Joplin's one-file-per-row design: a fresh device there never finished 13,000 items against
 * OneDrive's throttling.
 *
 * **Sessions are the version vector** (`compareWithPeer`): a device whose sessions are a superset
 * of ours is ahead and is offered as a hand-off; two that each have sessions the other lacks have
 * diverged, and the hero chooses. No device clock takes part. Merging row by row is phase 4.
 *
 * **Encrypted or nothing.** Sync refuses to start with encryption off, and the uploader refuses
 * again (`writeSyncSnapshot`); the server only ever holds `.batb` files.
 *
 * **When it runs**: the snapshot is taken at launch, at the quiet moment `VACUUM INTO` needs (see
 * src/autoBackup.ts for why never at the end of a session); the network half runs after the app
 * is up, and again on demand from Settings. Nothing runs in the background: Android kills that,
 * and Joplin's users paid for counting on it.
 */

const STORE_ACCOUNT = "bati.sync.nextcloud";
const STORE_INSTALL = "bati.sync.install";
/** name → etag of every other device's file the hero has already answered for. */
const STORE_ANSWERED = "bati.sync.answered";

/**
 * This install's name in the sync folder. SecureStore, not the database: a restore or Android's
 * own backup copies the database to a second phone, and two devices under one name would take
 * turns overwriting each other's history. Not `getDeviceId()` for the same reason, see its
 * ponytail note in db/preferences.ts.
 */
async function installId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(STORE_INSTALL);
  if (existing !== null) return existing;
  const fresh = uuidv7();
  await SecureStore.setItemAsync(STORE_INSTALL, fresh);
  return fresh;
}

const fileFor = (id: string) => `bati-${id}.batb`;
const PEER_FILE = /^bati-[0-9a-f-]{36}\.batb$/;

export async function syncAccount(): Promise<NextcloudAccount | null> {
  const value = await SecureStore.getItemAsync(STORE_ACCOUNT);
  return value === null ? null : (JSON.parse(value) as NextcloudAccount);
}

/** Signs in through the browser and remembers the account. `null` if the hero never approved. */
export async function connectNextcloud(
  server: string,
  isCancelled: () => boolean,
): Promise<NextcloudAccount | null> {
  const account = await loginToNextcloud(server, isCancelled);
  if (account !== null) await SecureStore.setItemAsync(STORE_ACCOUNT, JSON.stringify(account));
  return account;
}

/**
 * Forgets the account on this phone. The app password stays valid on the server until the hero
 * revokes it there (Settings > Security in Nextcloud), and the files there stay theirs.
 */
export async function disconnectSync(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_ACCOUNT);
  await SecureStore.deleteItemAsync(STORE_ANSWERED);
}

/**
 * The launch half: seal a snapshot while the database is quiet, if sync is on. Never throws; it
 * sits on the launch path next to `backupIfStaleToday`.
 */
export async function prepareSyncAtLaunch(): Promise<void> {
  try {
    if ((await syncAccount()) === null || (await encryptionStatus()) !== "on") return;
    await writeSyncSnapshot();
  } catch (error) {
    reportError("sync.prepare", error);
  }
}

/** What another device's file says, once opened and compared. */
export type Peer = {
  name: string;
  etag: string;
} & (
  | { state: "ahead" | "diverged"; comparison: PeerComparison; index: number }
  | { state: "level" | "behind" }
  /** Sealed with a key this phone does not hold: the other device's password will open it. */
  | { state: "locked" }
  /** Opened, but not a backup this build can adopt, typically a newer app version. */
  | { state: "unreadable" }
);

export type SyncResult = { uploaded: boolean; peers: Peer[] };

/**
 * The network half: send this device's snapshot, then read every other device's and say how it
 * stands. Throws on a network or server failure: the caller decides whether that is worth saying.
 *
 * The opened snapshot of an `ahead` or `diverged` peer is kept at `peerScratch(index, "plain")`,
 * ready for `stagePeerForImport` if the hero takes it; every other scratch file is deleted.
 */
export async function syncNow(options: { snapshotFirst: boolean }): Promise<SyncResult> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  if ((await encryptionStatus()) !== "on") throw new Error("Sync needs encryption on");

  const own = fileFor(await installId());
  const snapshot = options.snapshotFirst ? await writeSyncSnapshot() : pendingSyncSnapshot();
  if (snapshot !== null) {
    await uploadRemote(account, snapshot, own);
    snapshot.delete();
  }

  clearPeerScratch();
  const answered = await answeredPeers();
  const peers: Peer[] = [];
  const remote = (await listRemote(account)).filter(
    (f) => f.name !== own && PEER_FILE.test(f.name),
  );

  for (const [index, file] of remote.entries()) {
    const sealed = peerScratch(index, "sealed");
    const plain = peerScratch(index, "plain");
    await downloadRemote(account, file.name, sealed);
    let peer = await judgePeer(file, index, sealed.uri, plain.uri);
    sealed.delete();
    // An answer the hero already gave for this exact file is not asked again. A new write from
    // that device changes the etag, and then it is.
    if ("index" in peer && answered[file.name] === file.etag) {
      peer = { name: file.name, etag: file.etag, state: "level" };
    }
    // Only a snapshot the hero may take is kept; plaintext history does not linger otherwise.
    if (!("index" in peer) && plain.exists) plain.delete();
    peers.push(peer);
  }

  return { uploaded: snapshot !== null, peers };
}

async function judgePeer(
  file: { name: string; etag: string },
  index: number,
  sealedUri: string,
  plainUri: string,
): Promise<Peer> {
  const base = { name: file.name, etag: file.etag };
  const opened = await openBackup(sealedUri, plainUri).catch((error: unknown) => {
    reportError("sync.open", error);
    return "corrupt" as const;
  });
  if (opened === "needsSecret" || opened === "wrongSecret") return { ...base, state: "locked" };
  if (opened !== "opened") return { ...base, state: "unreadable" };

  const path = plainUri.replace(/^file:\/\//, "");
  const check = await validateBackup(path);
  if (!check.ok) return { ...base, state: "unreadable" };

  const comparison = await compareWithPeer(path);
  if (comparison.peerOnly === 0) {
    return { ...base, state: comparison.localOnly === 0 ? "level" : "behind" };
  }
  return {
    ...base,
    state: comparison.localOnly === 0 ? "ahead" : "diverged",
    comparison,
    index,
  };
}

async function answeredPeers(): Promise<Record<string, string>> {
  const value = await SecureStore.getItemAsync(STORE_ANSWERED);
  return value === null ? {} : (JSON.parse(value) as Record<string, string>);
}

/** "Keep this device's version": not asked again until that device writes something new. */
export async function rememberAnswer(peer: { name: string; etag: string }): Promise<void> {
  const answered = await answeredPeers();
  await SecureStore.setItemAsync(
    STORE_ANSWERED,
    JSON.stringify({ ...answered, [peer.name]: peer.etag }),
  );
}
