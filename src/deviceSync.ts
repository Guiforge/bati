import type { File } from "expo-file-system";
import * as SecureStore from "expo-secure-store";

import {
  BUILD_MIGRATIONS,
  compareWithPeer,
  type PeerComparison,
  stateFingerprint,
  validateBackup,
} from "@/db/backup";
import { honourTombstones, keptSessions, mergePeer } from "@/db/merge";
import { deletePreference, getPreference, setPreference } from "@/db/preferences";
import {
  CIPHER_READS,
  encryptionStatus,
  MAX_SEALED_BYTES,
  type OpenOutcome,
  openBackup,
  sealingHeader,
  vaultFormat,
} from "@/src/backupCipher";
import {
  clearPeerScratch,
  peerScratch,
  pendingSyncSnapshot,
  pickBackupFolder,
  writeSyncSnapshot,
} from "@/src/backupFiles";
import {
  type DavTarget,
  type DiagnosticStep,
  diagnoseServer,
  downloadRemote,
  failureOf,
  InsecureAddressError,
  isOnThisDevice,
  listRemote,
  loginToNextcloud,
  type NextcloudAccount,
  nextcloudTarget,
  type RemoteFile,
  revokeNextcloudAppPassword,
  type SyncFailure,
  statRemote,
  uploadRemote,
  webdavTarget,
} from "@/src/cloudSync";
import { folderLabel, folderPath, folderRemote } from "@/src/folderSync";
import { fileFor, installId, PEER_FILE } from "@/src/installId";
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
/** name → fingerprint of every other device's state the hero has already answered for. */
const STORE_ANSWERED = "bati.sync.answered";
/** The state last uploaded, so an unchanged history is not sealed and sent again. */
const STORE_UPLOADED = "bati.sync.uploaded";
/** name -> `state@etag` of what the prompt already told the hero about that device's file. */
const STORE_ANNOUNCED = "bati.sync.announced";
/** The device files seen in any listing, so one a later listing leaves out is looked for by name. */
const STORE_SEEN = "bati.sync.seen";
/** The local state the pending launch snapshot was sealed for: a later state must not send it as its own. */
const STORE_PENDING_STATE = "bati.sync.pendingState";
/** The version of this device's own file on the server, as the server gave it after the last upload. */
const STORE_OWN_ETAG = "bati.sync.ownEtag";
/**
 * name → the verdict on another device's file, stamped with its etag and this device's state.
 * Only verdicts that ask nothing of the hero are kept (`level`, `behind`, `unreadable`): with the
 * same file on both sides they cannot change, and downloading every device's whole history at
 * every launch, on mobile data too, is how a sync gets switched off.
 */
const STORE_VERDICTS = "bati.sync.verdicts";
/**
 * name → the highest counter seen in a file of that device that opened under this phone's own key.
 * SecureStore like the install id, so a restored database cannot reset it: a file must not read as
 * newer than the last one only because the phone was restored.
 */
const STORE_COUNTERS = "bati.sync.counters";
/** name → the etag of the file when the hero forgot that device. A new etag means it is alive. */
const STORE_FORGOTTEN = "bati.sync.forgotten";
type Verdict = {
  stamp: string;
  state: "level" | "behind" | "unreadable" | "oldKey" | "newerVersion" | "replayed";
};

/** More devices than any hero owns; a server listing more is not ours to download. */
const MAX_PEERS = 16;

/**
 * Where this device syncs: a Nextcloud signed in through the browser, any WebDAV server with the
 * name of the preset the hero picked (kDrive, Koofr…) so the Settings row can say it, or a folder
 * on this phone that Syncthing keeps in step (src/folderSync.ts).
 */
export type SyncAccount =
  | ({ kind: "nextcloud" } & NextcloudAccount)
  | { kind: "webdav"; url: string; user: string; password: string; label?: string }
  | { kind: "folder"; uri: string };

export async function syncAccount(): Promise<SyncAccount | null> {
  const value = await SecureStore.getItemAsync(STORE_ACCOUNT);
  return value === null ? null : (JSON.parse(value) as SyncAccount);
}

/**
 * Where sync's files live, whatever carries them: a WebDAV folder on a server, or a folder on this
 * phone that Syncthing replicates. Everything above this seam (vaults, verdicts, the merge) is the
 * same for both.
 */
type Remote = {
  /** The place, stably named, for the upload marker. */
  id: string;
  /** What the sync sheet shows as the folder and the account. */
  folder: string;
  user: string;
  list(): Promise<RemoteFile[]>;
  /** One file by name, `null` when the server does not hold it. Absent where the listing is the folder itself. */
  stat?(name: string): Promise<RemoteFile | null>;
  read(name: string, destination: File): Promise<void>;
  /** The file's version on the server after the write, when the server says one. */
  write(source: File, name: string): Promise<string | undefined>;
};

function davRemote(target: DavTarget): Remote {
  return {
    id: target.folderUrl,
    folder: `${target.folderUrl}/`,
    user: target.user,
    list: () => listRemote(target),
    stat: (name) => statRemote(target, name),
    read: (name, destination) => downloadRemote(target, name, destination),
    write: (source, name) => uploadRemote(target, source, name),
  };
}

function remoteFor(account: SyncAccount): Remote {
  if (account.kind === "folder") {
    return {
      id: account.uri,
      folder: folderPath(account.uri),
      user: "",
      ...folderRemote(account.uri),
    };
  }
  return davRemote(
    account.kind === "nextcloud"
      ? nextcloudTarget(account)
      : webdavTarget(account.url, account.user, account.password),
  );
}

/** What the Settings row shows: the preset's name, the folder's, or the server's host. */
export function accountLabel(account: SyncAccount): string {
  if (account.kind === "folder") return folderLabel(account.uri);
  if (account.kind === "webdav" && account.label) return account.label;
  const address = account.kind === "nextcloud" ? account.server : account.url;
  return address.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

async function remember(account: SyncAccount): Promise<SyncAccount> {
  candidate = null; // whatever was refused before is not the account now
  await SecureStore.setItemAsync(STORE_ACCOUNT, JSON.stringify(account));
  await setPreference(SYNC_SERVER_PREFERENCE, accountLabel(account));
  return account;
}

/**
 * The server this device syncs with, in the database, beside the account in SecureStore. It is
 * how a sync that stopped without the hero asking is noticed at all: whatever removed the
 * account (a bug, a wiped Keystore, a database Android restored onto a new phone), this stays,
 * and `lostSync` finds one without the other. Device-local: a restore keeps this device's.
 */
export const SYNC_SERVER_PREFERENCE = "syncServer";
/** "true" when sync waits for Wi-Fi rather than sending the whole history over mobile data. */
export const SYNC_WIFI_ONLY_PREFERENCE = "syncWifiOnly";

/** The server sync was on with, when the account is gone and the hero never said stop. */
export async function lostSync(): Promise<string | null> {
  const server = await getPreference(SYNC_SERVER_PREFERENCE);
  if (server === null) return null;
  return (await syncAccount()) === null ? server : null;
}

/** Where this account's files are, for the hero who wants to see them: folder and user. */
export function syncFolderOf(account: SyncAccount): { folder: string; user: string } {
  const { folder, user } = remoteFor(account);
  return { folder, user };
}

/** "Forget it": the hero saw that sync stopped and does not want it back. */
export function forgetLostSync(): Promise<void> {
  return deletePreference(SYNC_SERVER_PREFERENCE);
}

export async function syncWifiOnly(): Promise<boolean> {
  return (await getPreference(SYNC_WIFI_ONLY_PREFERENCE)) === "true";
}

export function setSyncWifiOnly(on: boolean): Promise<void> {
  return on
    ? setPreference(SYNC_WIFI_ONLY_PREFERENCE, "true")
    : deletePreference(SYNC_WIFI_ONLY_PREFERENCE);
}

/** How the last runs went, kept across launches so "failing for days" can be said at all. */
const STORE_HEALTH = "bati.sync.health";
export type SyncHealth = {
  lastSuccessAt: number | null;
  failure: SyncFailure | null;
  /** When the current run of failures began, epoch ms. */
  failingSince: number | null;
};

export async function syncHealth(): Promise<SyncHealth> {
  const value = await SecureStore.getItemAsync(STORE_HEALTH);
  return value === null
    ? { lastSuccessAt: null, failure: null, failingSince: null }
    : (JSON.parse(value) as SyncHealth);
}

export async function recordSyncOutcome(failure: SyncFailure | null): Promise<SyncHealth> {
  const previous = await syncHealth();
  const now = Date.now();
  const next: SyncHealth =
    failure === null
      ? { lastSuccessAt: now, failure: null, failingSince: null }
      : { ...previous, failure, failingSince: previous.failingSince ?? now };
  await SecureStore.setItemAsync(STORE_HEALTH, JSON.stringify(next));
  return next;
}

/** Signs in through the browser and remembers the account. `null` if the hero never approved. */
export async function connectNextcloud(
  server: string,
  isCancelled: () => boolean,
): Promise<SyncAccount | null> {
  const signedIn = await loginToNextcloud(server, isCancelled);
  if (signedIn === null) return null;
  const account: SyncAccount = { kind: "nextcloud", ...signedIn };
  // Remembered once the server is known to work, as a WebDAV account is: a 400 on the first listing
  // used to leave an account that failed at every launch, and no way to say why.
  await verified(account);
  return remember(account);
}

/**
 * The account a connection attempt got as far as, when the server then refused it: what "Test the
 * connection" asks about while nothing is remembered yet. Cleared by the next attempt.
 */
let candidate: SyncAccount | null = null;

/** Lists the folder on a new account, which proves it; a refusal leaves it as the candidate to test. */
async function verified(account: SyncAccount): Promise<void> {
  candidate = account;
  await remoteFor(account).list();
  candidate = null;
}

/**
 * The connection test: what the server answers, step by step, for the account just refused or the
 * one that is connected. `[]` when there is nothing to test, or the account is a folder.
 */
export async function testConnection(): Promise<DiagnosticStep[]> {
  const account = candidate ?? (await syncAccount());
  if (account === null || account.kind === "folder") return [];
  if (account.kind === "nextcloud") return diagnoseServer(nextcloudTarget(account), account);
  return diagnoseServer(webdavTarget(account.url, account.user, account.password));
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
  if (/^http:\/\//i.test(address) && !isOnThisDevice(address)) {
    throw new InsecureAddressError("Plain HTTP is only allowed to this phone");
  }
  const account: SyncAccount = { kind: "webdav", url: address, user: user.trim(), password, label };
  await verified(account);
  return remember(account);
}

/**
 * A folder another app keeps in step with the other devices (Syncthing): `uri` for one this app
 * already holds a permission to (the automatic backup's), otherwise picked with the system folder
 * picker, whose permission persists. `null` if the hero backed out of the picker.
 */
export async function connectFolder(uri?: string): Promise<SyncAccount | null> {
  const chosen = uri ?? (await pickBackupFolder())?.uri;
  if (chosen === undefined) return null;
  const account: SyncAccount = { kind: "folder", uri: chosen };
  await remoteFor(account).list();
  return remember(account);
}

/**
 * Forgets the account on this phone, and every file sync left on it: another device's history in
 * plaintext has no business outliving the sync that fetched it. The app password stays valid on
 * the server until the hero revokes it there, and the files there stay theirs.
 */
export async function disconnectSync(): Promise<void> {
  const account = await syncAccount();
  // Nextcloud can take back the app password it gave; any other server keeps it until the hero
  // removes it there, and the stop message says so.
  if (account?.kind === "nextcloud") await revokeNextcloudAppPassword(account);
  // First: the hero asked for this, so it must not read as a sync that was lost.
  await deletePreference(SYNC_SERVER_PREFERENCE);
  await SecureStore.deleteItemAsync(STORE_HEALTH);
  await SecureStore.deleteItemAsync(STORE_LAST_MERGE);
  await SecureStore.deleteItemAsync(STORE_ACCOUNT);
  await SecureStore.deleteItemAsync(STORE_ANSWERED);
  await SecureStore.deleteItemAsync(STORE_UPLOADED);
  await SecureStore.deleteItemAsync(STORE_PENDING_STATE);
  await SecureStore.deleteItemAsync(STORE_SEEN);
  await SecureStore.deleteItemAsync(STORE_ANNOUNCED);
  await SecureStore.deleteItemAsync(STORE_OWN_ETAG);
  await SecureStore.deleteItemAsync(STORE_VERDICTS);
  await SecureStore.deleteItemAsync(STORE_COUNTERS);
  await SecureStore.deleteItemAsync(STORE_FORGOTTEN);
  await SecureStore.deleteItemAsync(STORE_MERGED);
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
  target: Remote,
): Promise<{ changed: boolean; now: string; firstContact: boolean }> {
  const now = `${target.id}#${await localState()}`;
  const last = await SecureStore.getItemAsync(STORE_UPLOADED);
  return { changed: last !== now, now, firstContact: !last?.startsWith(`${target.id}#`) };
}

/**
 * What every verdict about a peer assumes: this device's history, the key it is sealed with, and
 * the build reading it (a peer refused as too new may open after an app update). It is also the
 * upload marker, so an update sends this device's file once more, for peers that were waiting on it.
 */
async function localState(): Promise<string> {
  return `${await stateFingerprint()}#${await sealingHeader()}#${BUILD_MIGRATIONS}#${CIPHER_READS}`;
}

/**
 * The launch half: seal a snapshot while the database is quiet, if sync is on and the history
 * moved. Never throws; it sits on the launch path next to `backupIfStaleToday`.
 */
export async function prepareSyncAtLaunch(): Promise<void> {
  try {
    const account = await syncAccount();
    if (account === null || (await encryptionStatus()) !== "on") return;
    const { changed, now } = await changedSinceUpload(remoteFor(account));
    if (!changed) return;
    await writeSyncSnapshot();
    await SecureStore.setItemAsync(STORE_PENDING_STATE, now);
  } catch (error) {
    reportError("sync.prepare", error);
  }
}

/** What another device's file says, once opened and compared. */
export type Peer = {
  name: string;
  etag: string;
  /** When the server last saw that device's file, epoch ms; absent when it did not say. */
  modified?: number;
} & (
  | { state: "ahead" | "diverged"; comparison: PeerComparison }
  | { state: "level" | "behind" }
  /**
   * Sealed with a key this phone does not hold, of a format at least as high as this phone's
   * vault: the other device's password will open it. `format` orders the vaults to join.
   */
  | { state: "locked"; format: 2 | 3 }
  /**
   * A vault this phone has left: the file opens with a key it keeps for reading, or it is sealed
   * with a key it does not hold in a format older than its own (a phone that never updated,
   * or changed its password in an older build). Never merged, never joined, never holds back this
   * device's upload; the other device is told to update and join the current vault.
   */
  | { state: "oldKey" }
  /** A Bati file of a format after the ones this build reads: update, and it will open. */
  | { state: "newerVersion" }
  /**
   * A file whose counter is lower than the last this phone saw from that device: an older copy
   * handed back (Nextcloud and Syncthing both keep versions). Not merged, never waited on.
   */
  | { state: "replayed" }
  /**
   * Sealed with a key this phone does not hold, but older on the server than this device's own
   * file: that device is the one to learn this phone's password, and asking here too is how two
   * devices that both changed their password offline swapped vaults instead of sharing one.
   */
  | { state: "waiting" }
  /** Opened, but not a backup this build can adopt: a newer app version, or not a backup at all. */
  | { state: "unreadable" }
);

export type SyncResult = {
  uploaded: boolean;
  peers: Peer[];
  /**
   * Set when other devices' files were there and none could be read (a 403 on every one, a server
   * that drops each download): the run learned nothing about them, so it is not an "up to date".
   */
  peerFailure?: SyncFailure;
  /** Sessions another device deleted that this one keeps (their campaign moved on); only set when there are some. */
  keptSessions?: number;
};

/** Every other device's file in the folder. */
function othersIn(remote: RemoteFile[], own: string): RemoteFile[] {
  return remote.filter((f) => f.name !== own && PEER_FILE.test(f.name));
}

async function readRecord(store: string): Promise<Record<string, string>> {
  const value = await SecureStore.getItemAsync(store);
  return value === null ? {} : (JSON.parse(value) as Record<string, string>);
}

/**
 * The listing, plus the files it leaves out that this device knows exist: its own, and every device it
 * has already read. A listing can be late (a NAS, an rclone with its directory cache, a WebDAV behind a
 * proxy) while the server still answers for the file itself; trusting it as the whole folder made a
 * hidden peer invisible (no hold-back for a vault to join, a forgotten device back), and a hidden own
 * file read as missing (the date that decides which vault joins which was gone). One request per such
 * file, never more than `MAX_PEERS`, and none for a device the hero forgot.
 * ponytail: a device whose file was deleted by hand costs one request per sync until it is forgotten.
 */
async function withKnownFiles(
  target: Remote,
  listing: RemoteFile[],
  own: string,
): Promise<RemoteFile[]> {
  const { stat } = target;
  if (!stat) return listing;
  const forgotten = await readRecord(STORE_FORGOTTEN);
  const seenValue = await SecureStore.getItemAsync(STORE_SEEN);
  const seen = seenValue === null ? [] : (JSON.parse(seenValue) as string[]);
  const known = new Set([
    own,
    ...seen,
    ...Object.keys(await readRecord(STORE_COUNTERS)),
    ...Object.keys(await readRecord(STORE_ANSWERED)),
  ]);
  const missing = [...known]
    .filter(
      (name) =>
        PEER_FILE.test(name) &&
        forgotten[name] === undefined &&
        !listing.some((f) => f.name === name),
    )
    .slice(0, MAX_PEERS);
  const found = await Promise.all(missing.map((name) => stat.call(target, name).catch(() => null)));
  const all = [...listing, ...found.filter((f): f is RemoteFile => f !== null)];
  // Remembered for the next listing; newest last, and the oldest go first past twice the places there are.
  const names = all.map((f) => f.name).filter((n) => n !== own && PEER_FILE.test(n));
  const next = [...seen.filter((n) => !names.includes(n)), ...names].slice(-MAX_PEERS * 2);
  if (JSON.stringify(next) !== JSON.stringify(seen)) {
    await SecureStore.setItemAsync(STORE_SEEN, JSON.stringify(next));
  }
  return all;
}

/**
 * The other devices this phone looks at: `othersIn`, without the ones the hero forgot. A device
 * is forgotten for the file it had then; a new file from it (another etag) means it is alive, and
 * it comes back by itself. The forgotten list is tidied here, since this is where it is read.
 */
async function visibleOthers(remote: RemoteFile[], own: string): Promise<RemoteFile[]> {
  const others = othersIn(remote, own);
  const forgotten = await readRecord(STORE_FORGOTTEN);
  // Dropped only for a file listed with another version: absent from one listing is not alive, a late
  // listing would bring a device the hero forgot back.
  const alive = Object.fromEntries(
    Object.entries(forgotten).filter(
      ([name, etag]) => !others.some((f) => f.name === name && f.etag !== etag),
    ),
  );
  if (Object.keys(alive).length !== Object.keys(forgotten).length) {
    await SecureStore.setItemAsync(STORE_FORGOTTEN, JSON.stringify(alive));
  }
  // Cut after the forgotten ones are gone: sixteen stale files that sort first must not hide a
  // live device, even once the hero has forgotten every one of them.
  return others.filter((f) => alive[f.name] === undefined).slice(0, MAX_PEERS);
}

/**
 * "Forget this device": for a device that is not merged (waiting for a password, an old vault, a
 * file that cannot be read, a copy from before), because a phone reinstalled, restored or lost
 * leaves its file on the server for ever and nothing else would ever make it go away. It is
 * hidden, never deleted: the file is the hero's, and on the server. Its counter is dropped too, so
 * if it comes back as the same install after a restore it is not taken for an old copy.
 */
export async function forgetPeer(peer: { name: string; etag: string }): Promise<void> {
  const forgotten = await readRecord(STORE_FORGOTTEN);
  await SecureStore.setItemAsync(
    STORE_FORGOTTEN,
    JSON.stringify({ ...forgotten, [peer.name]: peer.etag }),
  );
  for (const store of [STORE_COUNTERS, STORE_ANSWERED, STORE_VERDICTS]) {
    const { [peer.name]: _gone, ...rest } = await readRecord(store);
    await SecureStore.setItemAsync(store, JSON.stringify(rest));
  }
}

/** Whether a file named for a device really is that device's: the uuid in the name is the id inside. */
const nameIsId = (name: string, installId: string) =>
  name
    .replace(/^bati-/, "")
    .replace(/\.batb$/, "")
    .replaceAll("-", "") === installId;

/**
 * A format 3 file against what this phone knows of that device: it must be named for the install
 * that wrote it, and its counter must not be lower than the last seen. Remembered only here, and
 * only for files that opened under this phone's own key (the caller returns before this for a
 * key kept for reading): a counter read from anything else could be forged to make every real
 * file of that device look old.
 */
async function judgeCounter(
  file: RemoteFile,
  sealedBy: { installId: string; counter: string },
): Promise<"fresh" | "replayed" | "unreadable"> {
  if (!nameIsId(file.name, sealedBy.installId)) return "unreadable";
  const counter = BigInt(sealedBy.counter);
  if (counter > BigInt(Number.MAX_SAFE_INTEGER)) return "unreadable";
  const counters = await readRecord(STORE_COUNTERS);
  const seen = BigInt(counters[file.name] ?? "0");
  if (counter < seen) return "replayed";
  if (counter > seen) {
    await SecureStore.setItemAsync(
      STORE_COUNTERS,
      JSON.stringify({ ...counters, [file.name]: String(counter) }),
    );
  }
  return "fresh";
}

/**
 * The devices still waiting to be given a password: what stops the vault being updated. A new key
 * would have to be told to each of them in turn, so the hero is asked to settle those first. A
 * sync runs first, so this is what the server holds now and not what it held at launch.
 */
export async function vaultUpdateBlockers(): Promise<string[]> {
  const { peers } = await syncNow({ snapshotFirst: false });
  return peers.filter((peer) => peer.state === "locked").map((peer) => peer.name);
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
  const target = remoteFor(account);
  if ((await encryptionStatus()) !== "on") throw new Error("Sync needs encryption on");

  const own = fileFor(await installId());
  const listing = await withKnownFiles(target, await target.list(), own);

  clearPeerScratch();
  const context: JudgeContext = {
    answered: await answeredPeers(),
    known: await knownVerdicts(),
    here: await localState(),
    ownFormat: await vaultFormat(),
    ownFile: listing.find((f) => f.name === own),
    verdicts: {},
    failedToOpen: new Set(),
  };
  const peers: Peer[] = [];
  let firstFailure: unknown;
  let failures = 0;
  for (const file of await visibleOthers(listing, own)) {
    try {
      peers.push(await judge(target, file, context));
    } catch (error) {
      failures++;
      firstFailure ??= error;
      // One file that cannot be fetched or read right now (a ghost in an eventually consistent
      // listing, a 403 or 423 on it, a download cut short) is that device's problem, retried at the
      // next sync. Letting it throw here stopped this device from ever uploading while the file
      // stayed listed, and nothing remembers the failure: a lasting "unreadable" is for a file
      // that was read and is not a backup.
      reportError("sync.peer", error);
    }
  }
  await SecureStore.setItemAsync(STORE_VERDICTS, JSON.stringify(context.verdicts));

  const uploaded = (await holdBack(target, peers))
    ? false
    : await uploadIfNeeded(target, own, listing, options.snapshotFirst, peers);
  const kept = await keptSessions();
  const result: SyncResult =
    peers.length === 0 && failures > 0
      ? { uploaded, peers, peerFailure: failureOf(firstFailure) }
      : { uploaded, peers };
  return kept > 0 ? { ...result, keptSessions: kept } : result;
}

type JudgeContext = {
  answered: Record<string, string>;
  known: Record<string, Verdict>;
  here: string;
  /** The format this phone seals with. */
  ownFormat: 2 | 3 | null;
  ownFile: RemoteFile | undefined;
  /** Filled in: the verdicts worth keeping for the next sync. */
  verdicts: Record<string, Verdict>;
  /**
   * Filled in: the files whose opening threw. "Unreadable" is said about them now, but not kept: a throw
   * is as likely to be this phone's (no room for the plain copy, an I/O error) as the file's, and a kept
   * verdict would stop it ever being downloaded again until one side wrote something new.
   */
  failedToOpen: Set<string>;
};

/** Verdicts that ask nothing of the hero, so with the same file on both sides they cannot change. */
function isKeptVerdict(state: Peer["state"]): state is Verdict["state"] {
  return (
    state === "level" ||
    state === "behind" ||
    state === "unreadable" ||
    state === "oldKey" ||
    state === "newerVersion" ||
    state === "replayed"
  );
}

/**
 * What a peer sealed with a key this phone does not hold turns into: a vault this phone has left
 * (`oldKey`), one that will come to this phone's (`waiting`), or one this phone must join (still
 * `locked`).
 */
function settleLocked(
  peer: Peer & { state: "locked" },
  file: RemoteFile,
  context: JudgeContext,
): Peer {
  const gone = { name: file.name, etag: file.etag, modified: peer.modified };
  // A phone that never updated, or changed its password in an older build, wrote this. Joining it
  // would take this hero's vault a step back; waiting for it would hold back the upload for ever.
  // It is told to update, and nothing here waits on it.
  if (context.ownFormat !== null && peer.format < context.ownFormat) {
    return { ...gone, state: "oldKey" };
  }
  return mustJoin(file, context.ownFile, peer.format, context.ownFormat)
    ? peer
    : { ...gone, state: "waiting" };
}

/** What this sync concludes about one other device, from a kept verdict when one still holds. */
async function judge(target: Remote, file: RemoteFile, context: JudgeContext): Promise<Peer> {
  const stamp = `${file.etag}#${context.here}`;
  const cached = context.known[file.name];
  let peer: Peer =
    cached?.stamp === stamp
      ? { name: file.name, etag: file.etag, state: cached.state }
      : await fetchAndJudge(target, file, context);
  if (file.modified > 0) peer = { ...peer, modified: file.modified };
  if (isKeptVerdict(peer.state) && !context.failedToOpen.has(file.name)) {
    context.verdicts[file.name] = { stamp, state: peer.state };
  }
  if (peer.state === "locked") peer = settleLocked(peer, file, context);
  // An answer the hero already gave for this exact state is not asked again. Only news from that
  // device (new sessions, new content) changes the fingerprint; sealing the same history anew
  // does not.
  if ("comparison" in peer && context.answered[file.name] === peer.comparison.fingerprint) {
    peer = { name: file.name, etag: file.etag, modified: peer.modified, state: "level" };
  }
  // Said once for this file, not once per launch: the same unreadable file is no news.
  if (peer.state === "unreadable" && context.answered[file.name] === unreadableKey(file)) {
    peer = { name: file.name, etag: file.etag, modified: peer.modified, state: "level" };
  }
  // Only a snapshot the hero may take is kept; plaintext history does not linger otherwise.
  const plain = peerScratch(file.name, "plain");
  if (!("comparison" in peer) && plain.exists) plain.delete();
  return peer;
}

/**
 * Of two devices sealing under different keys, which joins which. A higher format wins outright:
 * the vault only ever moves forward, so a device on an older one joins, whatever the dates say.
 * At the same format the one whose file reached the server last has the newer vault, and the other
 * joins it. A device re-uploads right after its key changes, so its file's date on the server is
 * when that happened, measured by the server's clock alone: no phone clock can tip it. Without a
 * date on either side, or on the same date, the file name decides, so two devices never both
 * wait for the other, nor both join the other.
 */
// ponytail: a server that gives no date at all decides by file name, which is arbitrary but the same
// on both devices; the old answer (each asked to join the other) swapped the vaults. A tie-break that
// follows what the hero last did needs a date the server does not give.
function mustJoin(
  peer: RemoteFile,
  ownFile: RemoteFile | undefined,
  peerFormat: number,
  ownFormat: number | null,
): boolean {
  if (ownFormat !== null && peerFormat !== ownFormat) return peerFormat > ownFormat;
  if (!ownFile) return true;
  const dated = ownFile.modified !== 0 && peer.modified !== 0;
  if (dated && peer.modified !== ownFile.modified) return peer.modified > ownFile.modified;
  return peer.name > ownFile.name;
}

async function knownVerdicts(): Promise<Record<string, Verdict>> {
  const value = await SecureStore.getItemAsync(STORE_VERDICTS);
  return value === null ? {} : (JSON.parse(value) as Record<string, Verdict>);
}

/**
 * Whether this device keeps its file to itself this time:
 * - another device is `ahead`: it already holds everything this one has, so sending adds nothing;
 * - another is `locked`: this device joins that vault first, then sends;
 * - this device never sent anything here and another has news for it: a tablet just through
 *   onboarding has a village name and an avatar newer than the phone's, and uploading them first
 *   made a near-empty device look like news to every other one. It listens before it speaks, and
 *   sends once the hero took that device's version or chose to keep this one.
 */
async function holdBack(target: Remote, peers: Peer[]): Promise<boolean> {
  // Sealed under a vault this device is about to leave: sent now, it would be a newer file under
  // the old key, and the other device would be asked to join it in turn.
  if (peers.some((p) => p.state === "ahead" || p.state === "locked")) return true;
  const hasNews = peers.some((p) => p.state === "diverged");
  return hasNews && (await changedSinceUpload(target)).firstContact;
}

/** True when this device knows the version it left on the server and the listing shows another. */
async function ownEtagBefore(target: Remote, listed: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(STORE_OWN_ETAG);
  if (!value) return false;
  const known = JSON.parse(value) as { place: string; etag: string };
  return known.place === target.id && known.etag !== listed;
}

/**
 * A vault this device deliberately left (`oldKey`: its key is only kept for reading, after a new password) whose file is
 * as new as this device's own, or newer. The other devices choose which vault to join by those dates, so they would
 * keep the old vault, and wait for this one to join it, while this one never will: nobody moves, for good. Sent
 * again, this device's file is the newest and they join it, as they must. Only with dates on both sides, and it
 * repeats at most while the two are in the same second, since the next send is later.
 */
function vaultLeftIsNewer(own: RemoteFile, peers: Peer[]): boolean {
  if (own.modified === 0) return false;
  return peers.some((p) => p.state === "oldKey" && (p.modified ?? 0) >= own.modified);
}

async function uploadIfNeeded(
  target: Remote,
  own: string,
  listing: RemoteFile[],
  snapshotFirst: boolean,
  peers: Peer[],
): Promise<boolean> {
  const { changed, now } = await changedSinceUpload(target);
  const ownListed = listing.find((f) => f.name === own);
  const outdated = ownListed !== undefined && vaultLeftIsNewer(ownListed, peers);
  // Not what this device wrote: a server restored from a backup, a Nextcloud "restore this version".
  // Nothing else repairs it: peers read the old file as in step, and this device saw nothing change.
  const replaced = ownListed !== undefined && (await ownEtagBefore(target, ownListed.etag));
  if (!changed && ownListed !== undefined && !replaced && !outdated) {
    pendingSyncSnapshot()?.delete();
    return false;
  }
  // The launch snapshot is only as current as the state it was sealed for: a session finished since
  // would be missing from it while the marker below says the new state went up.
  const pending = !snapshotFirst && (await SecureStore.getItemAsync(STORE_PENDING_STATE)) === now;
  const snapshot = (pending && pendingSyncSnapshot()) || (await writeSyncSnapshot());
  const etag = await target.write(snapshot, own);
  snapshot.delete();
  await SecureStore.setItemAsync(STORE_UPLOADED, now);
  await SecureStore.setItemAsync(
    STORE_OWN_ETAG,
    etag === undefined ? "" : JSON.stringify({ place: target.id, etag }),
  );
  return true;
}

type Settled =
  | { state: "unreadable" | "newerVersion" | "oldKey" | "replayed" }
  | { state: "locked"; format: 2 | 3 };

/**
 * What opening a peer's file already settles, before its history is read: a version this build
 * does not know, a key this phone does not hold, a vault it has left, a file that is not that
 * device's or is older than the last one. `null` when it is a file to compare.
 *
 * A key this phone only keeps for reading is a vault it has left: merging would let an old key
 * steer the history of a hero who moved on, and the opened copy is not kept.
 */
/** A file named for a device and saying a lower count than the last one read here from that device. */
async function claimsToBeOlder(
  file: RemoteFile,
  claims: { installId: string; counter: string },
): Promise<boolean> {
  if (!nameIsId(file.name, claims.installId)) return false;
  const seen = (await readRecord(STORE_COUNTERS))[file.name];
  return seen !== undefined && BigInt(claims.counter) < BigInt(seen);
}

async function settledByOpening(
  opened: OpenOutcome | null,
  file: RemoteFile,
): Promise<Settled | null> {
  if (opened === null) return { state: "unreadable" };
  if (opened.result === "newerVersion") return { state: "newerVersion" };
  if (opened.result === "needsSecret") {
    // Under a key this phone never held, so nothing is verified. But a file that says it is an older one of a
    // device whose newer file was read here is a copy put back, and its fresh date on the server would make it
    // look like a newer vault: this device would hold back every upload and ask for a password that has no
    // right answer (the device that wrote it has left that key).
    if (opened.claims && (await claimsToBeOlder(file, opened.claims))) return { state: "replayed" };
    return { state: "locked", format: opened.format ?? 2 };
  }
  if (opened.result !== "opened") return { state: "unreadable" };
  if (opened.viaKeyring) return { state: "oldKey" };
  if (opened.sealedBy) {
    const verdict = await judgeCounter(file, opened.sealedBy);
    if (verdict !== "fresh") return { state: verdict };
  }
  return null;
}

async function fetchAndJudge(
  target: Remote,
  file: RemoteFile,
  context: JudgeContext,
): Promise<Peer> {
  const base = { name: file.name, etag: file.etag };
  const sealed = peerScratch(file.name, "sealed");
  const plain = peerScratch(file.name, "plain");
  await target.read(file.name, sealed);
  try {
    if (file.size !== undefined && sealed.size !== file.size) {
      throw new Error(
        `${file.name}: the server lists ${file.size} bytes and ${sealed.size} came back`,
      );
    }
    if (sealed.size > MAX_SEALED_BYTES) return { ...base, state: "unreadable" };
    const opened = await openBackup(sealed.uri, plain.uri).catch((error: unknown) => {
      reportError("sync.open", error);
      context.failedToOpen.add(file.name);
      return null;
    });
    const settled = await settledByOpening(opened, file);
    if (settled !== null) {
      if (plain.exists) plain.delete();
      return { ...base, ...settled };
    }

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
/**
 * What the prompt has already said about a file ("another device is newer", "an older copy was left aside"), by
 * name, for the version of the file it said it about. Only the prompt reads this: the sync sheet keeps showing the
 * state, because "update Bati" is something the hero may look for there.
 */
export function announcedPeers(): Promise<Record<string, string>> {
  return readRecord(STORE_ANNOUNCED);
}

export async function rememberAnnounced(peer: {
  name: string;
  etag: string;
  state: string;
}): Promise<void> {
  const announced = await readRecord(STORE_ANNOUNCED);
  await SecureStore.setItemAsync(
    STORE_ANNOUNCED,
    JSON.stringify({ ...announced, [peer.name]: `${peer.state}@${peer.etag}` }),
  );
}

/** "Seen": this unreadable file is not announced again until that device writes a new one. */
export async function rememberUnreadable(peer: { name: string; etag: string }): Promise<void> {
  const answered = await answeredPeers();
  await SecureStore.setItemAsync(
    STORE_ANSWERED,
    JSON.stringify({ ...answered, [peer.name]: unreadableKey(peer) }),
  );
}

function unreadableKey(file: { etag: string }): string {
  return `unreadable@${file.etag}`;
}

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
export async function keepThisDeviceOnServer(): Promise<string> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  // To the second, with a random tail: the first sync of a phone that joins two devices merges
  // twice within a minute, and the second copy used to replace the first, which held the history
  // the first merge was about to overwrite.
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const tail = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  const name = `bati-${await installId()}-kept-${stamp}-${tail}.batb`;
  const snapshot = await writeSyncSnapshot();
  await remoteFor(account).write(snapshot, name);
  snapshot.delete();
  return name;
}

/** Names of the devices whose first merge already left a kept copy of this one on the server. */
const STORE_MERGED = "bati.sync.merged";
/** The last merge: said once after its reload, shown on Home until seen, listed in Settings. */
const STORE_LAST_MERGE = "bati.sync.lastMerge";
export type LastMerge = {
  at: number;
  /** The other device's file. */
  peer: string;
  sessions: number;
  changes: number;
  /** This device's copy on the server from before the first merge with that device, if made now. */
  kept: string | null;
  /** Where the hero was when the merge reloaded the app, to go back there. */
  returnTo: string | null;
  /** The toast after the reload was shown. */
  told: boolean;
  /** The Home card was closed. */
  seen: boolean;
};

export async function lastMerge(): Promise<LastMerge | null> {
  const value = await SecureStore.getItemAsync(STORE_LAST_MERGE);
  return value === null ? null : (JSON.parse(value) as LastMerge);
}

async function updateLastMerge(patch: Partial<LastMerge>): Promise<void> {
  const current = await lastMerge();
  if (current === null) return;
  await SecureStore.setItemAsync(STORE_LAST_MERGE, JSON.stringify({ ...current, ...patch }));
}

export type MergeWithPeer =
  /** Another build's database: nothing merged, and the hero chooses as before. */
  { result: "cannot" } | { result: "merged"; sessions: number; changes: number };

/**
 * Merges an `ahead` or `diverged` device's history into this one (`mergePeer`), then applies its
 * deletions here. The first merge with a given device first sends this one's whole history to the
 * server as a kept copy: a merge cannot lose a session, but it is new, and the copy is what the
 * hero restores by hand if it ever does.
 */
export async function mergeWithPeer(peer: { name: string }): Promise<MergeWithPeer> {
  const plain = peerScratch(peer.name, "plain");
  if (!plain.exists) throw new Error("That device's history was not kept for merging");
  const merged: string[] = JSON.parse((await SecureStore.getItemAsync(STORE_MERGED)) ?? "[]");
  let kept: string | null = null;
  if (!merged.includes(peer.name)) {
    kept = await keepThisDeviceOnServer();
    await SecureStore.setItemAsync(STORE_MERGED, JSON.stringify([...merged, peer.name]));
  }
  const outcome = await mergePeer(plain.uri.replace(/^file:\/\//, ""));
  if (!outcome.merged) return { result: "cannot" };
  plain.delete();
  const removed = await honourTombstones();
  const changes = outcome.changes + removed;
  if (changes > 0) {
    const record: LastMerge = {
      at: Date.now(),
      peer: peer.name,
      sessions: outcome.sessions,
      changes,
      kept,
      returnTo: null,
      told: true,
      seen: false,
    };
    await SecureStore.setItemAsync(STORE_LAST_MERGE, JSON.stringify(record));
  }
  return { result: "merged", sessions: outcome.sessions, changes };
}

/** Before the reload a merge ends with: say it afterwards, and go back to `returnTo`. */
export function rememberMergeNotice(returnTo: string): Promise<void> {
  return updateLastMerge({ told: false, returnTo });
}

/** Once, after that reload: what arrived and where the hero was. */
export async function takeMergeNotice(): Promise<{ sessions: number; returnTo: string } | null> {
  const merge = await lastMerge();
  if (merge === null || merge.told) return null;
  await updateLastMerge({ told: true });
  return { sessions: merge.sessions, returnTo: merge.returnTo ?? "/" };
}

/** The Home card about the last merge was closed. */
export function dismissMergeCard(): Promise<void> {
  return updateLastMerge({ seen: true });
}

/**
 * What a freshly connected server holds, for the one decision the hero must take before the first
 * sync: `empty` (this device starts the vault), `ready` (a key this phone holds opens what is
 * there, or encryption is on and nothing else is), `needsSecret` naming a device whose password
 * this phone must learn to join rather than invent a second vault, or `newerVersion` (a file this
 * build cannot read is there: starting a vault now would be a second one, in an older format).
 */
export type ServerState =
  | { kind: "empty" | "ready" | "newerVersion" }
  | { kind: "needsSecret"; peer: string };

/** A peer's file as a vault: one a key this phone holds opens, or one that wants a secret, in its format. */
type Looked = { file: RemoteFile; kind: "opens" | "locked"; format: 2 | 3 };

/** What opening a file without a secret says about it as a vault: `null` for what no secret could open. */
function asVault(file: RemoteFile, opened: OpenOutcome): Looked | "newer" | null {
  const format = opened.format ?? 2;
  if (opened.result === "newerVersion") return "newer";
  if (opened.result === "opened") return { file, kind: "opens", format };
  return opened.result === "needsSecret" ? { file, kind: "locked", format } : null;
}

/**
 * Every other device's file, looked at without a secret, to learn which vaults are on the server. A file
 * that cannot be fetched or opened (a ghost in an eventually consistent listing, a 403, a body cut short)
 * is counted and skipped: one damaged file must not decide which vault this phone joins, or whether it can
 * connect at all. A file no secret could ever open, or that is not a backup, is no vault to join either.
 */
async function lookAtVaults(
  target: Remote,
  others: RemoteFile[],
): Promise<{ looked: Looked[]; newer: boolean; failed: number }> {
  const looked: Looked[] = [];
  let failed = 0;
  for (const file of others) {
    const sealed = peerScratch(file.name, "sealed");
    const plain = peerScratch(file.name, "plain");
    try {
      await target.read(file.name, sealed);
      const vault = asVault(file, await openBackup(sealed.uri, plain.uri));
      if (vault === "newer") return { looked, newer: true, failed };
      if (vault !== null) looked.push(vault);
    } catch (error) {
      failed += 1;
      reportError("sync.vaultLook", error);
    } finally {
      if (sealed.exists) sealed.delete();
      if (plain.exists) plain.delete();
    }
  }
  return { looked, newer: false, failed };
}

/**
 * Which vault is the one to join: a higher format wins, then the file written last (a phone reset months
 * ago can leave a file sealed with a vault nobody uses any more, and joining that one would lock out every
 * live device), then the larger name, the same order sync uses.
 */
const bestVaultFirst = (a: Looked, b: Looked) =>
  b.format - a.format || b.file.modified - a.file.modified || (a.file.name < b.file.name ? 1 : -1);

export async function serverState(): Promise<ServerState> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  const target = remoteFor(account);
  const listing = await target.list();
  const ownName = fileFor(await installId());
  const others = await visibleOthers(listing, ownName);
  if (others.length === 0) return { kind: "empty" };

  const { looked, newer, failed } = await lookAtVaults(target, others);
  if (newer) return { kind: "newerVersion" };
  // The vault never goes back a format: a phone that already seals in a newer one does not go and join an
  // older one, whatever the dates say. Sync tells that device to update.
  const own = await vaultFormat();
  const [best] = looked
    .filter((vault) => vault.kind === "opens" || own === null || vault.format >= own)
    .sort(bestVaultFirst);
  if (best === undefined) {
    // Files are there and none could be read: that is not an empty server, and starting a vault on it could
    // make a second one.
    if (failed > 0 && looked.length === 0) {
      throw new Error(`The server lists ${others.length} file(s) and none could be read`);
    }
    return { kind: "ready" };
  }
  if (best.kind === "opens") return { kind: "ready" };
  // A device that stops and connects again still holds its own file on the server. When that file is the newer
  // vault, it is the other device that joins this one, and asking this one for the other's password would split
  // the two (each ends up reading the other's files through a key it has left).
  const ownFile = listing.find((f) => f.name === ownName);
  if (own !== null && ownFile !== undefined && !mustJoin(best.file, ownFile, best.format, own)) {
    return { kind: "ready" };
  }
  return { kind: "needsSecret", peer: best.file.name };
}

/**
 * Opens another device's file with its password or recovery key and makes its key this phone's,
 * so both write into one vault from now on. `false` when the secret does not open it.
 */
/**
 * The files a secret is tried on, in order: the named one first, then the others from the best vault down. One
 * damaged or wrong file next to an intact one of the same vault must not decide the answer. Never a format lower
 * than the best on the server, nor than the one this phone already seals in: that would take the hero's vault a
 * step back.
 */
function joinCandidates(looked: Looked[], peer: string, own: 2 | 3 | null): RemoteFile[] {
  const top = Math.max(own ?? 0, ...looked.map((vault) => vault.format));
  const named = (vault: Looked) => (vault.file.name === peer ? 1 : 0);
  return looked
    .filter((vault) => vault.kind === "locked" && vault.format >= top)
    .sort((a, b) => named(b) - named(a) || bestVaultFirst(a, b))
    .map((vault) => vault.file);
}

export async function joinPeer(peer: string, secret: string): Promise<boolean> {
  const account = await syncAccount();
  if (account === null) throw new Error("Sync is not connected");
  const target = remoteFor(account);
  const others = await visibleOthers(await target.list(), fileFor(await installId()));
  const { looked, failed } = await lookAtVaults(target, others);
  // Files are there and none could be read: not a wrong password.
  if (looked.length === 0 && failed > 0) {
    throw new Error(`The server lists ${others.length} file(s) and none could be read`);
  }
  const candidates = joinCandidates(looked, peer, await vaultFormat());
  let failure: unknown = null;
  for (const file of candidates) {
    const sealed = peerScratch(file.name, "sealed");
    const plain = peerScratch(file.name, "plain");
    try {
      await target.read(file.name, sealed);
      const opened = await openBackup(sealed.uri, plain.uri, secret);
      if (opened.result === "opened") {
        await opened.join?.({ asPrimary: true });
        return true;
      }
    } catch (error) {
      failure = error; // this file only: the next one may be the intact copy of the same vault
      reportError("sync.joinFile", error);
    } finally {
      if (sealed.exists) sealed.delete();
      if (plain.exists) plain.delete();
    }
  }
  // Every candidate failed to be read, and none said "wrong": that is a read failure, not a wrong password.
  if (failure !== null && candidates.length > 0) throw failure;
  return false;
}
