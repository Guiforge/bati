import * as SecureStore from "expo-secure-store";

import {
  BUILD_MIGRATIONS,
  compareWithPeer,
  type PeerComparison,
  stateFingerprint,
  validateBackup,
} from "@/db/backup";
import { batiCrypto } from "@/modules/bati-crypto";
import { encryptionStatus, MAX_SEALED_BYTES, openBackup, sealingHeader } from "@/src/backupCipher";
import {
  clearPeerScratch,
  peerScratch,
  pendingSyncSnapshot,
  writeSyncSnapshot,
} from "@/src/backupFiles";
import {
  type DavTarget,
  downloadRemote,
  InsecureAddressError,
  isOnThisDevice,
  listRemote,
  loginToNextcloud,
  type NextcloudAccount,
  nextcloudTarget,
  type RemoteFile,
  uploadRemote,
  webdavTarget,
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
 * **What each side has that the other lacks** (`compareWithPeer`: sessions, deletions, the hero's
 * own content) decides the offer. A device with news and nothing to lose is offered as a
 * hand-off; two with news each have diverged, and the hero chooses. No device clock takes part.
 * Merging row by row is phase 4.
 *
 * **Encrypted or nothing, and one vault.** Sync refuses to start with encryption off, and the
 * uploader refuses again (`writeSyncSnapshot`). A device joining a server that already holds
 * sealed files asks for *their* password (`serverState`, `joinPeer`) rather than inventing a key
 * of its own, which would make two vaults that never open each other.
 *
 * **When it runs**: the snapshot is taken at launch, at the quiet moment `VACUUM INTO` needs (see
 * src/autoBackup.ts for why never at the end of a session), and only when the history moved; the
 * network half runs after the app is up, and again on demand from Settings. Nothing runs in the
 * background: Android kills that, and Joplin's users paid for counting on it.
 */

const STORE_ACCOUNT = "bati.sync.account";
const STORE_INSTALL = "bati.sync.install";
/** name → fingerprint of every other device's state the hero has already answered for. */
const STORE_ANSWERED = "bati.sync.answered";
/** The state last uploaded, so an unchanged history is not sealed and sent again. */
const STORE_UPLOADED = "bati.sync.uploaded";
/**
 * name → the verdict on another device's file, stamped with its etag and this device's state.
 * Only verdicts that ask nothing of the hero are kept (`level`, `behind`, `unreadable`): with the
 * same file on both sides they cannot change, and downloading every device's whole history at
 * every launch, on mobile data too, is how a sync gets switched off.
 */
const STORE_VERDICTS = "bati.sync.verdicts";
type Verdict = { stamp: string; state: "level" | "behind" | "unreadable" };

/** More devices than any hero owns; a server listing more is not ours to download. */
const MAX_PEERS = 16;

/**
 * This install's name in the sync folder: random, so it says nothing about when it was made.
 * SecureStore, not the database: a restore or Android's own backup copies the database to a
 * second phone, and two devices under one name would take turns overwriting each other's history.
 */
async function installId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(STORE_INSTALL);
  if (existing !== null) return existing;
  const hex = Array.from(atob(await batiCrypto().randomBytes(16)), (c) =>
    c.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
  const fresh = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
  await SecureStore.setItemAsync(STORE_INSTALL, fresh);
  return fresh;
}

const fileFor = (id: string) => `bati-${id}.batb`;
const PEER_FILE = /^bati-[0-9a-f-]{36}\.batb$/;

/**
 * Where this device syncs: a Nextcloud signed in through the browser, or any WebDAV server, with
 * the name of the preset the hero picked (kDrive, Koofr…) so the Settings row can say it.
 */
export type SyncAccount =
  | ({ kind: "nextcloud" } & NextcloudAccount)
  | { kind: "webdav"; url: string; user: string; password: string; label?: string };

export async function syncAccount(): Promise<SyncAccount | null> {
  const value = await SecureStore.getItemAsync(STORE_ACCOUNT);
  return value === null ? null : (JSON.parse(value) as SyncAccount);
}

function targetFor(account: SyncAccount): DavTarget {
  return account.kind === "nextcloud"
    ? nextcloudTarget(account)
    : webdavTarget(account.url, account.user, account.password);
}

/** What the Settings row shows: the preset's name, or the server's host without its scheme. */
export function accountLabel(account: SyncAccount): string {
  if (account.kind === "webdav" && account.label) return account.label;
  const address = account.kind === "nextcloud" ? account.server : account.url;
  return address.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

async function remember(account: SyncAccount): Promise<SyncAccount> {
  await SecureStore.setItemAsync(STORE_ACCOUNT, JSON.stringify(account));
  return account;
}

/** Signs in through the browser and remembers the account. `null` if the hero never approved. */
export async function connectNextcloud(
  server: string,
  isCancelled: () => boolean,
): Promise<SyncAccount | null> {
  const account = await loginToNextcloud(server, isCancelled);
  return account === null ? null : remember({ kind: "nextcloud", ...account });
}

/**
 * Any WebDAV server: kDrive, Koofr, a NAS, or rclone served on this phone by Round Sync. Plain
 * `http://` is refused unless it is this phone itself, the one place Android lets it through
 * (plugins/withAndroidNetworkSecurity.js), so the hero reads why instead of "did not answer".
 * The server is asked to create and list the folder first, so an account is only remembered once
 * it is known to work. Throws `DavAuthError` for refused credentials.
 */
export async function connectWebDav(
  url: string,
  user: string,
  password: string,
  label?: string,
): Promise<SyncAccount> {
  const address = url.trim();
  if (/^http:\/\//i.test(address) && !isOnThisDevice(address)) throw new InsecureAddressError();
  const account: SyncAccount = { kind: "webdav", url: address, user: user.trim(), password, label };
  await listRemote(targetFor(account));
  return remember(account);
}

/**
 * Forgets the account on this phone, and every file sync left on it: another device's history in
 * plaintext has no business outliving the sync that fetched it. The app password stays valid on
 * the server until the hero revokes it there, and the files there stay theirs.
 */
export async function disconnectSync(): Promise<void> {
  await SecureStore.deleteItemAsync(STORE_ACCOUNT);
  await SecureStore.deleteItemAsync(STORE_ANSWERED);
  await SecureStore.deleteItemAsync(STORE_UPLOADED);
  await SecureStore.deleteItemAsync(STORE_VERDICTS);
  clearPeerScratch();
  pendingSyncSnapshot()?.delete();
}

/**
 * Whether this device's file on `target` is out of date: the history moved, or the key it was
 * sealed with did. Joining a vault or changing the password leaves the history as it was, and
 * without the header in here the file on the server would stay sealed with a key the other devices
 * cannot open (or with the old password the hero just retired) until the next session.
 */
async function changedSinceUpload(
  target: DavTarget,
): Promise<{ changed: boolean; now: string; firstContact: boolean }> {
  const now = `${target.folderUrl}#${await localState()}`;
  const last = await SecureStore.getItemAsync(STORE_UPLOADED);
  return { changed: last !== now, now, firstContact: !last?.startsWith(`${target.folderUrl}#`) };
}

/**
 * What every verdict about a peer assumes: this device's history, the key it is sealed with, and
 * the build reading it (a peer refused as too new may open after an app update). It is also the
 * upload marker, so an update sends this device's file once more, for peers that were waiting on it.
 */
async function localState(): Promise<string> {
  return `${await stateFingerprint()}#${await sealingHeader()}#${BUILD_MIGRATIONS}`;
}

/**
 * The launch half: seal a snapshot while the database is quiet, if sync is on and the history
 * moved. Never throws; it sits on the launch path next to `backupIfStaleToday`.
 */
export async function prepareSyncAtLaunch(): Promise<void> {
  try {
    const account = await syncAccount();
    if (account === null || (await encryptionStatus()) !== "on") return;
    if (!(await changedSinceUpload(targetFor(account))).changed) return;
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
  | { state: "ahead" | "diverged"; comparison: PeerComparison }
  | { state: "level" | "behind" }
  /** Sealed with a key this phone does not hold: the other device's password will open it. */
  | { state: "locked" }
  /** Opened, but not a backup this build can adopt: a newer app version, or not a backup at all. */
  | { state: "unreadable" }
);

export type SyncResult = { uploaded: boolean; peers: Peer[] };

/** Every other device's file in the folder, at most `MAX_PEERS` of them. */
function othersIn(remote: RemoteFile[], own: string): RemoteFile[] {
  return remote.filter((f) => f.name !== own && PEER_FILE.test(f.name)).slice(0, MAX_PEERS);
}

/**
 * The network half: send this device's snapshot when the server lacks it or it moved, then read
 * every other device's and say how it stands. Throws on a network or server failure: the caller
 * decides whether that is worth saying.
 *
 * The opened snapshot of an `ahead` or `diverged` peer is kept at `peerScratch(name, "plain")`,
 * ready for `stagePeerForImport` if the hero takes it; every other scratch file is deleted.
 */
export async function syncNow(options: { snapshotFirst: boolean }): Promise<SyncResult> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  const target = targetFor(account);
  if ((await encryptionStatus()) !== "on") throw new Error("Sync needs encryption on");

  const own = fileFor(await installId());
  const listing = await listRemote(target);

  clearPeerScratch();
  const answered = await answeredPeers();
  const known = await knownVerdicts();
  const here = await localState();
  const verdicts: Record<string, Verdict> = {};
  const peers: Peer[] = [];
  for (const file of othersIn(listing, own)) {
    const stamp = `${file.etag}#${here}`;
    const cached = known[file.name];
    let peer: Peer =
      cached?.stamp === stamp
        ? { name: file.name, etag: file.etag, state: cached.state }
        : await fetchAndJudge(target, file);
    if (peer.state === "level" || peer.state === "behind" || peer.state === "unreadable") {
      verdicts[file.name] = { stamp, state: peer.state };
    }
    // An answer the hero already gave for this exact state is not asked again. Only news from
    // that device (new sessions, new content) changes the fingerprint; sealing the same history
    // anew does not.
    if ("comparison" in peer && answered[file.name] === peer.comparison.fingerprint) {
      peer = { name: file.name, etag: file.etag, state: "level" };
    }
    // Only a snapshot the hero may take is kept; plaintext history does not linger otherwise.
    const plain = peerScratch(file.name, "plain");
    if (!("comparison" in peer) && plain.exists) plain.delete();
    peers.push(peer);
  }
  await SecureStore.setItemAsync(STORE_VERDICTS, JSON.stringify(verdicts));

  const uploaded = (await holdBack(target, peers))
    ? false
    : await uploadIfNeeded(target, own, listing, options.snapshotFirst);
  return { uploaded, peers };
}

async function knownVerdicts(): Promise<Record<string, Verdict>> {
  const value = await SecureStore.getItemAsync(STORE_VERDICTS);
  return value === null ? {} : (JSON.parse(value) as Record<string, Verdict>);
}

/**
 * Whether this device keeps its file to itself this time:
 * - another device is `ahead`: it already holds everything this one has, so sending adds nothing;
 * - this device never sent anything here and another has news for it: a tablet just through
 *   onboarding has a village name and an avatar newer than the phone's, and uploading them first
 *   made a near-empty device look like news to every other one. It listens before it speaks, and
 *   sends once the hero took that device's version or chose to keep this one.
 */
async function holdBack(target: DavTarget, peers: Peer[]): Promise<boolean> {
  if (peers.some((p) => p.state === "ahead")) return true;
  const hasNews = peers.some((p) => p.state === "diverged");
  return hasNews && (await changedSinceUpload(target)).firstContact;
}

async function uploadIfNeeded(
  target: DavTarget,
  own: string,
  listing: RemoteFile[],
  snapshotFirst: boolean,
): Promise<boolean> {
  const { changed, now } = await changedSinceUpload(target);
  const onServer = listing.some((f) => f.name === own);
  if (!changed && onServer) {
    pendingSyncSnapshot()?.delete();
    return false;
  }
  const snapshot = (!snapshotFirst && pendingSyncSnapshot()) || (await writeSyncSnapshot());
  await uploadRemote(target, snapshot, own);
  snapshot.delete();
  await SecureStore.setItemAsync(STORE_UPLOADED, now);
  return true;
}

async function fetchAndJudge(target: DavTarget, file: RemoteFile): Promise<Peer> {
  const base = { name: file.name, etag: file.etag };
  const sealed = peerScratch(file.name, "sealed");
  const plain = peerScratch(file.name, "plain");
  await downloadRemote(target, file.name, sealed);
  try {
    if (sealed.size > MAX_SEALED_BYTES) return { ...base, state: "unreadable" };
    const opened = await openBackup(sealed.uri, plain.uri).catch((error: unknown) => {
      reportError("sync.open", error);
      return null;
    });
    if (opened === null) return { ...base, state: "unreadable" };
    if (opened.result === "needsSecret") return { ...base, state: "locked" };
    if (opened.result !== "opened") return { ...base, state: "unreadable" };

    const path = plain.uri.replace(/^file:\/\//, "");
    if (!(await validateBackup(path)).ok) return { ...base, state: "unreadable" };

    const comparison = await compareWithPeer(path);
    const peerNews = comparison.peerChanges > 0;
    const localNews = comparison.localChanges > 0;
    if (!peerNews) return { ...base, state: localNews ? "behind" : "level" };
    return { ...base, state: localNews ? "diverged" : "ahead", comparison };
  } finally {
    sealed.delete();
  }
}

async function answeredPeers(): Promise<Record<string, string>> {
  const value = await SecureStore.getItemAsync(STORE_ANSWERED);
  return value === null ? {} : (JSON.parse(value) as Record<string, string>);
}

/** "Keep this device's version": not asked again until that device has news. */
export async function rememberAnswer(peer: {
  name: string;
  comparison: { fingerprint: string };
}): Promise<void> {
  const answered = await answeredPeers();
  await SecureStore.setItemAsync(
    STORE_ANSWERED,
    JSON.stringify({ ...answered, [peer.name]: peer.comparison.fingerprint }),
  );
}

/**
 * Before this device's history is replaced by another's, a sealed copy of it goes to the sync
 * folder under a name no device reads as a peer (`bati-<id>-kept-<time>.batb`). It is the copy the
 * hero can still reach from any device, and download and restore by hand, when the automatic
 * backup folder is off and the swap's own `.bak` is private to this phone.
 */
export async function keepThisDeviceOnServer(): Promise<void> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13);
  const snapshot = await writeSyncSnapshot();
  await uploadRemote(targetFor(account), snapshot, `bati-${await installId()}-kept-${stamp}.batb`);
  snapshot.delete();
}

/**
 * What a freshly connected server holds, for the one decision the hero must take before the first
 * sync: `empty` (this device starts the vault), `ready` (a key this phone holds opens what is
 * there, or encryption is on and nothing else is), or `needsSecret` naming a device whose
 * password this phone must learn to join rather than invent a second vault.
 */
export type ServerState = { kind: "empty" | "ready" } | { kind: "needsSecret"; peer: string };

export async function serverState(): Promise<ServerState> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  const target = targetFor(account);
  // The most recently written file: a phone reset months ago can leave a file sealed with a vault
  // nobody uses any more, and joining that one would lock out every live device.
  const others = othersIn(await listRemote(target), fileFor(await installId())).sort(
    (a, b) => b.modified - a.modified,
  );
  const first = others[0];
  if (first === undefined) return { kind: "empty" };

  const sealed = peerScratch(first.name, "sealed");
  const plain = peerScratch(first.name, "plain");
  await downloadRemote(target, first.name, sealed);
  try {
    const opened = await openBackup(sealed.uri, plain.uri);
    return opened.result === "needsSecret"
      ? { kind: "needsSecret", peer: first.name }
      : { kind: "ready" };
  } finally {
    sealed.delete();
    if (plain.exists) plain.delete();
  }
}

/**
 * Opens another device's file with its password or recovery key and makes its key this phone's,
 * so both write into one vault from now on. `false` when the secret does not open it.
 */
export async function joinPeer(peer: string, secret: string): Promise<boolean> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  const sealed = peerScratch(peer, "sealed");
  const plain = peerScratch(peer, "plain");
  await downloadRemote(targetFor(account), peer, sealed);
  try {
    const opened = await openBackup(sealed.uri, plain.uri, secret);
    if (opened.result !== "opened") return false;
    await opened.join?.({ asPrimary: true });
    return true;
  } finally {
    sealed.delete();
    if (plain.exists) plain.delete();
  }
}
