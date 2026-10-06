/**
 * The orchestration of device sync, with its neighbours doubled at their edges only:
 *
 * - the network: a Map of name → etag stands for the server, and what the transfers did is
 *   recorded. The rest of src/cloudSync.ts (targets, the plain-HTTP rule, its errors) is the real
 *   code, through `requireActual`, so a test here cannot pass against a copy of it;
 * - the cipher and the database comparison answer per file from a table (both are tested on real
 *   bytes and real SQLite in their own files);
 * - SecureStore is a Map, and randomness is Node's.
 *
 * What is under test is what only this module decides: which files it reads, what it concludes
 * from each, what it uploads and when, what it refuses, and what it never asks twice.
 */

import assert from "node:assert/strict";

const mockSecure = new Map<string, string>();
const mockServer = new Map<string, string>();
const mockUploads: string[] = [];
/** Snapshots sealed so far, and whether a launch snapshot is waiting to be sent. */
const mockWrites = { count: 0, pending: false, fail: false };
/** The scratch files that exist, and the ones that were deleted, by uri (see the backupFiles mock). */
const mockFiles = new Set<string>();
const mockDeleted: string[] = [];
const mockListings: string[] = [];
/** The server returns no ETag for an upload. */
const mockNoEtag = { on: false };
/** What the merge of a peer's copy says: it may refuse. */
const mockMergeOutcome = { merged: true, sessions: 2, changes: 2 };
/** The Nextcloud accounts whose app password was revoked, and the paths handed to validateBackup. */
const mockRevoked: unknown[] = [];
const mockValidated: string[] = [];
/** Files a late listing leaves out although the server holds them: a direct request still finds them. */
const mockHidden = new Set<string>();
const mockDownloads: string[] = [];
/** name → modification time the server reports; 0 when absent. */
const mockModified = new Map<string, number>();
const mockCipher = { status: "on", header: "vault-1", format: 2 as 2 | 3 | null, reads: 3 };
let mockFingerprint = "local-1";
let mockListingFails = false;
/** The server refuses the app password, as the client says it (DavAuthError). */
let mockListingRefused = false;
/** Per remote file: size, what opening it says, the secret that opens it, how it compares. */
const mockPeers: Record<
  string,
  {
    size?: number;
    open?: "opened" | "needsSecret" | "newerVersion" | "notEncrypted" | "throws";
    /** What a file this phone cannot open says about who wrote it (unauthenticated). */
    claims?: { installId: string; counter: string };
    /** The format of the peer's file, and whether it opened with a key this phone only keeps. */
    format?: 2 | 3;
    viaKeyring?: boolean;
    /** What a format 3 file says about who wrote it: install id (32 hex) and counter. */
    sealedBy?: { installId: string; counter: string };
    secret?: string;
    valid?: boolean;
    peerChanges?: number;
    localChanges?: number;
    fingerprint?: string;
  }
> = {};
const mockJoins: boolean[] = [];
/** Files whose download throws, and the size the server lists for a file (when it lists one). */
const mockDownloadFails = new Set<string>();
/** Files whose download works until the nth time they are asked for (1-based), then throws. */
const mockDownloadFailsFrom = new Map<string, number>();
/** What the system folder picker answers: a tree uri, or the hero backing out. */
const mockPicked: { uri: string | null } = { uri: null };
const mockListedSize = new Map<string, number>();

jest.mock("@/modules/bati-crypto", () => ({
  batiCrypto: () => require("./helpers/nodeBatiCrypto").nodeBatiCrypto,
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: (key: string) => Promise.resolve(mockSecure.get(key) ?? null),
  setItemAsync: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockSecure.set(key, value);
    }),
  deleteItemAsync: (key: string) =>
    Promise.resolve().then(() => {
      mockSecure.delete(key);
    }),
}));

const mockDiagnosed: { folderUrl: string; nextcloud: boolean }[] = [];

jest.mock("@/src/cloudSync", () => ({
  ...jest.requireActual("@/src/cloudSync"),
  loginToNextcloud: () =>
    Promise.resolve({ server: "https://cloud.test", loginName: "hero", appPassword: "app" }),
  listRemote: (target: { folderUrl: string }) =>
    Promise.resolve().then(() => {
      mockListings.push(target.folderUrl);
      if (mockListingRefused) {
        throw new (jest.requireActual("@/src/cloudSync").DavAuthError)("Listing: HTTP 401");
      }
      if (mockListingFails) throw new Error("HTTP 401");
      return [...mockServer]
        .filter(([name]) => !mockHidden.has(name))
        .map(([name, etag]) => ({
          name,
          etag,
          modified: mockModified.get(name) ?? 0,
          ...(mockListedSize.has(name) ? { size: mockListedSize.get(name) } : {}),
        }));
    }),
  statRemote: (_target: unknown, name: string) =>
    Promise.resolve().then(() => {
      const etag = mockServer.get(name);
      return etag === undefined ? null : { name, etag, modified: mockModified.get(name) ?? 0 };
    }),
  diagnoseServer: (target: { folderUrl: string }, account?: { server: string }) => {
    mockDiagnosed.push({ folderUrl: target.folderUrl, nextcloud: account !== undefined });
    return Promise.resolve([]);
  },
  uploadRemote: (_target: unknown, _file: unknown, name: string) =>
    Promise.resolve().then(() => {
      mockUploads.push(name);
      mockServer.set(name, `etag-${mockUploads.length}`);
      return mockNoEtag.on ? undefined : `etag-${mockUploads.length}`;
    }),
  revokeNextcloudAppPassword: (account: unknown) => {
    mockRevoked.push(account);
    return Promise.resolve(true);
  },
  downloadRemote: (_target: unknown, name: string, destination: { uri: string }) =>
    Promise.resolve().then(() => {
      mockDownloads.push(name);
      if (mockDownloadFails.has(name)) throw new Error("response has status: 403");
      const from = mockDownloadFailsFrom.get(name);
      if (from !== undefined && mockDownloads.filter((n) => n === name).length >= from) {
        throw new Error("response has status: 403");
      }
      // A download leaves the sealed file on disk, where someone has to delete it.
      mockFiles.add(destination.uri);
    }),
}));

// Scratch files carry the remote name they were made for, which is how the cipher double knows
// which peer it is opening; `size` is that peer's.
jest.mock("@/src/backupFiles", () => {
  // A scratch file exists from the moment something writes it (a download, an opened copy, a snapshot) to the moment
  // it is deleted; deleting one that is not there throws, as expo's File.delete does. So what the code leaves
  // behind, and what it removes, can be asserted: another device's history in plaintext must not outlive its sync.
  const scratch = (name: string, kind: string) => {
    const uri = `file:///db/${name}.${kind}`;
    return {
      uri,
      get exists() {
        return mockFiles.has(uri);
      },
      size: mockPeers[name]?.size ?? 1000,
      delete: () => {
        if (!mockFiles.has(uri)) throw new Error(`${uri} is not there`);
        mockFiles.delete(uri);
        mockDeleted.push(uri);
      },
    };
  };
  return {
    writeSyncSnapshot: () => {
      if (mockWrites.fail) return Promise.reject(new Error("no room for the snapshot"));
      mockWrites.count++;
      mockFiles.add("file:///db/own.out");
      return Promise.resolve(scratch("own", "out"));
    },
    pendingSyncSnapshot: () => {
      if (!mockWrites.pending) return null;
      mockFiles.add("file:///db/pending.out");
      return scratch("pending", "out");
    },
    peerScratch: scratch,
    clearPeerScratch: jest.fn(),
    pickBackupFolder: () =>
      Promise.resolve(mockPicked.uri === null ? null : { uri: mockPicked.uri }),
  };
});

/**
 * A folder another app keeps in step, doubled on the same Map as the server: it lists, reads and
 * writes like one, and has no `stat`, which is what makes it a folder. Its path and label are the
 * real ones.
 */
jest.mock("@/src/folderSync", () => ({
  ...jest.requireActual("@/src/folderSync"),
  folderRemote: () => ({
    list: () =>
      Promise.resolve().then(() => {
        mockListings.push("folder");
        return [...mockServer]
          .filter(([name]) => !mockHidden.has(name))
          .map(([name, etag]) => ({ name, etag, modified: mockModified.get(name) ?? 0 }));
      }),
    read: (name: string, destination: { uri: string }) =>
      Promise.resolve().then(() => {
        mockDownloads.push(name);
        mockFiles.add(destination.uri);
      }),
    write: (_source: unknown, name: string) =>
      Promise.resolve().then(() => {
        mockUploads.push(name);
        mockServer.set(name, `etag-${mockUploads.length}`);
        return undefined;
      }),
  }),
}));

const peerOf = (uri: string) => /\/db\/(.+)\.(?:sealed|plain)$/.exec(uri)?.[1] ?? "";

jest.mock("@/src/backupCipher", () => ({
  MAX_SEALED_BYTES: 5000,
  get CIPHER_READS() {
    return mockCipher.reads;
  },
  encryptionStatus: () => Promise.resolve(mockCipher.status),
  sealingHeader: () => Promise.resolve(mockCipher.header),
  vaultFormat: () => Promise.resolve(mockCipher.format),
  openBackup: (sealedUri: string, plainUri: string, secret?: string) =>
    mockOpen(sealedUri, secret).then((outcome) => {
      // An opened copy is a plain file on disk, until someone deletes it.
      if (outcome.result === "opened") mockFiles.add(plainUri);
      return outcome;
    }),
}));

function mockOpen(
  sealedUri: string,
  secret?: string,
): Promise<{ result: string; [k: string]: unknown }> {
  {
    const peer = mockPeers[peerOf(sealedUri)];
    const format = peer?.format ?? 2;
    if (peer?.open === "newerVersion") return Promise.resolve({ result: "newerVersion" });
    if (peer?.open === "throws")
      return Promise.reject(new Error("the plain copy cannot be written"));
    if (peer?.open === "notEncrypted") return Promise.resolve({ result: "notEncrypted", format });
    if (peer?.open === "opened") {
      return Promise.resolve({
        result: "opened",
        format,
        viaKeyring: peer.viaKeyring ?? false,
        sealedBy: peer.sealedBy,
      });
    }
    if (secret === undefined) {
      return Promise.resolve({ result: "needsSecret", format, claims: peer?.claims });
    }
    if (secret !== peer?.secret) return Promise.resolve({ result: "wrongSecret", format });
    return Promise.resolve({
      result: "opened",
      format,
      join: ({ asPrimary }: { asPrimary: boolean }) =>
        Promise.resolve().then(() => {
          mockJoins.push(asPrimary);
        }),
    });
  }
}

const mockMerges: string[] = [];
/** The preferences table, as a Map: the lost-sync marker lives there, not in SecureStore. */
const mockPrefs = new Map<string, string>();
jest.mock("@/db/preferences", () => ({
  getPreference: (key: string) => Promise.resolve(mockPrefs.get(key) ?? null),
  setPreference: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockPrefs.set(key, value);
    }),
  deletePreference: (key: string) =>
    Promise.resolve().then(() => {
      mockPrefs.delete(key);
    }),
}));
jest.mock("@/db/merge", () => ({
  mergePeer: (path: string) =>
    Promise.resolve().then(() => {
      mockMerges.push(path);
      return mockMergeOutcome.merged
        ? { merged: true, sessions: mockMergeOutcome.sessions, changes: mockMergeOutcome.changes }
        : { merged: false, sessions: 0, changes: 0 };
    }),
  honourTombstones: jest.fn(() => Promise.resolve(1)),
  keptSessions: jest.fn(() => Promise.resolve(0)),
}));
jest.mock("@/db/backup", () => ({
  BUILD_MIGRATIONS: 64,
  stateFingerprint: () => Promise.resolve(mockFingerprint),
  validateBackup: (path: string) => {
    mockValidated.push(path);
    return Promise.resolve(
      mockPeers[peerOf(path)]?.valid === false
        ? { ok: false, reason: "incompatibleVersion" }
        : { ok: true },
    );
  },
  compareWithPeer: (path: string) => {
    const peer = mockPeers[peerOf(path)];
    return Promise.resolve({
      peerOnly: peer?.peerChanges ?? 0,
      localOnly: peer?.localChanges ?? 0,
      peerChanges: peer?.peerChanges ?? 0,
      localChanges: peer?.localChanges ?? 0,
      peerLatest: null,
      peerVillage: null,
      localSessions: 1,
      fingerprint: peer?.fingerprint ?? "peer-1",
    });
  },
}));

jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

import { failureOf, InsecureAddressError } from "@/src/cloudSync";
import {
  accountLabel,
  connectFolder,
  connectNextcloud,
  connectWebDav,
  disconnectSync,
  dismissMergeCard,
  forgetLostSync,
  forgetPeer,
  joinPeer,
  keepThisDeviceOnServer,
  lastMerge,
  lostSync,
  mergeWithPeer,
  prepareSyncAtLaunch,
  recordSyncOutcome,
  rememberAnswer,
  rememberMergeNotice,
  rememberUnreadable,
  serverState,
  setSyncWifiOnly,
  syncAccount,
  syncFolderOf,
  syncHealth,
  syncNow,
  syncWifiOnly,
  takeMergeNotice,
  testConnection,
  vaultUpdateBlockers,
} from "@/src/deviceSync";
import { joinOrder } from "@/src/joinOrder";

const TABLET = "bati-0190a000-0000-7000-8000-00000000000a.batb";
const OLD_PHONE = "bati-0190a000-0000-7000-8000-00000000000b.batb";
const WORK_PHONE = "bati-0190a000-0000-7000-8000-00000000000c.batb";
/**
 * Dates this device's own file (the last one uploaded) and `name` on the server, `name` later: a peer
 * that reached the server last is the vault to join. Undated, the file name would decide, and this
 * device's name is random.
 */
const newerOnServer = (name: string) => {
  const own = mockUploads.at(-1);
  if (own !== undefined) mockModified.set(own, 1);
  mockModified.set(name, 100);
};
const states = (peers: { name: string; state: string }[]) =>
  Object.fromEntries(peers.map((p) => [p.name, p.state]));

beforeEach(async () => {
  mockSecure.clear();
  mockPrefs.clear();
  mockServer.clear();
  mockUploads.length = 0;
  mockWrites.count = 0;
  mockWrites.pending = false;
  mockWrites.fail = false;
  mockNoEtag.on = false;
  mockMergeOutcome.merged = true;
  mockMergeOutcome.sessions = 2;
  mockMergeOutcome.changes = 2;
  mockPicked.uri = null;
  mockDownloadFailsFrom.clear();
  mockRevoked.length = 0;
  mockValidated.length = 0;
  (jest.requireMock("@/src/reportError").reportError as jest.Mock).mockClear();
  (jest.requireMock("@/db/merge").honourTombstones as jest.Mock).mockClear();
  mockListings.length = 0;
  mockHidden.clear();
  mockFiles.clear();
  mockDeleted.length = 0;
  mockJoins.length = 0;
  mockDownloads.length = 0;
  mockMerges.length = 0;
  mockModified.clear();
  mockCipher.status = "on";
  mockCipher.header = "vault-1";
  mockCipher.format = 2;
  mockCipher.reads = 3;
  mockFingerprint = "local-1";
  mockListingFails = false;
  mockListingRefused = false;
  mockDownloadFails.clear();
  mockListedSize.clear();
  for (const key of Object.keys(mockPeers)) delete mockPeers[key];
  await connectNextcloud("cloud.test", () => false);
});

test("refuses to run with encryption off, so nothing plain ever reaches the server", async () => {
  mockCipher.status = "off";
  await expect(syncNow({ snapshotFirst: true })).rejects.toThrow("Sync needs encryption on");
  expect(mockUploads).toEqual([]);
});

test("uploads under one random name per install, and only when the history moved", async () => {
  await syncNow({ snapshotFirst: true });
  await syncNow({ snapshotFirst: true });
  expect(mockUploads).toHaveLength(1);
  expect(mockUploads[0]).toMatch(
    /^bati-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.batb$/,
  );

  mockFingerprint = "local-2";
  await syncNow({ snapshotFirst: false });
  expect(mockUploads).toEqual([mockUploads[0], mockUploads[0]]);

  // Gone from the server (a new server, a folder emptied by hand): sent again, moved or not.
  mockServer.clear();
  await syncNow({ snapshotFirst: false });
  expect(mockUploads).toHaveLength(3);
  expect((await syncNow({ snapshotFirst: false })).peers).toEqual([]);
});

test("the snapshot sealed at launch is sent only for the state it was sealed for", async () => {
  // Launch: the history moved, a snapshot is sealed and waits.
  mockFingerprint = "local-2";
  await prepareSyncAtLaunch();
  mockWrites.pending = true;
  const sealedAtLaunch = mockWrites.count;

  // Same state: the waiting snapshot is the one that goes up, nothing sealed twice.
  await syncNow({ snapshotFirst: false });
  expect(mockUploads).toHaveLength(1);
  expect(mockWrites.count).toBe(sealedAtLaunch);

  // A session finished since launch: that snapshot lacks it, so a fresh one is sealed.
  await prepareSyncAtLaunch();
  mockFingerprint = "local-3";
  await syncNow({ snapshotFirst: false });
  expect(mockUploads).toHaveLength(2);
  expect(mockWrites.count).toBe(sealedAtLaunch + 1);
});

test("sends the same history again once it is sealed with another key", async () => {
  await syncNow({ snapshotFirst: true });
  // A vault joined, or a new password: the history did not move, the key did.
  mockCipher.header = "vault-2";
  await syncNow({ snapshotFirst: true });
  expect(mockUploads).toHaveLength(2);
});

test("a file that did not change is not downloaded again while nothing changed here", async () => {
  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "opened", localChanges: 1 };
  expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "behind" });
  expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "behind" });
  expect(mockDownloads).toEqual([TABLET]);

  // Either side moving is a new question.
  mockFingerprint = "local-2";
  await syncNow({ snapshotFirst: true });
  mockServer.set(TABLET, "t2");
  await syncNow({ snapshotFirst: true });
  expect(mockDownloads).toEqual([TABLET, TABLET, TABLET]);
});

test("a device that never sent anything here listens before it speaks", async () => {
  // A tablet fresh from onboarding: its village name reads as news to the phone.
  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "opened", peerChanges: 5, localChanges: 3, fingerprint: "phone-1" };
  const first = await syncNow({ snapshotFirst: true });
  expect(states(first.peers)).toEqual({ [TABLET]: "diverged" });
  expect(first.uploaded).toBe(false);
  expect(mockUploads).toEqual([]);

  // The hero kept this one: from now on it speaks.
  const [peer] = first.peers;
  assert(peer && "comparison" in peer);
  await rememberAnswer(peer);
  expect((await syncNow({ snapshotFirst: true })).uploaded).toBe(true);
});

test("a device ahead holds everything this one has, so this one sends nothing", async () => {
  await syncNow({ snapshotFirst: true });
  expect(mockUploads).toHaveLength(1);
  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "opened", peerChanges: 2 };
  mockFingerprint = "local-2";
  const result = await syncNow({ snapshotFirst: true });
  expect(states(result.peers)).toEqual({ [TABLET]: "ahead" });
  expect(result.uploaded).toBe(false);
  expect(mockUploads).toHaveLength(1);
});

test("two devices that both changed their password: the older file joins the newer one", async () => {
  // This device sent its file under its new key first...
  await syncNow({ snapshotFirst: true });
  const [own] = mockUploads;
  assert(own);
  mockModified.set(own, Date.parse("2026-09-25T10:00:00Z"));

  // ...and the tablet's file under its own new key is older: the tablet is the one to join.
  mockServer.set(TABLET, "t1");
  mockModified.set(TABLET, Date.parse("2026-09-25T09:00:00Z"));
  mockPeers[TABLET] = { open: "needsSecret" };
  mockFingerprint = "local-2";
  const quiet = await syncNow({ snapshotFirst: true });
  expect(states(quiet.peers)).toEqual({ [TABLET]: "waiting" });
  expect(quiet.uploaded).toBe(true);

  // Had the tablet's reached the server last, this one would ask, and send nothing meanwhile:
  // a newer file under the key it is about to leave would ask the tablet to join it in turn.
  mockModified.set(TABLET, Date.parse("2026-09-25T11:00:00Z"));
  mockFingerprint = "local-3";
  const asked = await syncNow({ snapshotFirst: true });
  expect(states(asked.peers)).toEqual({ [TABLET]: "locked" });
  expect(asked.uploaded).toBe(false);
});

test("an unreadable device is announced once per file, not once per launch", async () => {
  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "opened", valid: false };
  const first = await syncNow({ snapshotFirst: true });
  expect(states(first.peers)).toEqual({ [TABLET]: "unreadable" });

  await rememberUnreadable({ name: TABLET, etag: "t1" });
  expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });

  // That device wrote again: still unreadable, and worth saying again.
  mockServer.set(TABLET, "t2");
  expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
    [TABLET]: "unreadable",
  });
});

test("a sync whose account vanished is found; one the hero stopped is not", async () => {
  // Connected in beforeEach.
  expect(await lostSync()).toBeNull();

  // Whatever took the account (a wiped Keystore, a bug), the marker in the database stayed.
  mockSecure.delete("bati.sync.account");
  expect(await lostSync()).toBe("cloud.test");

  await connectNextcloud("cloud.test", () => false);
  await disconnectSync();
  expect(await lostSync()).toBeNull();
});

/** What a sync that found news leaves for the hero to take: that device's history, opened, on disk. */
const keepPlain = (name: string) => mockFiles.add(`file:///db/${name}.plain`);

test("after a merge's reload, what arrived and where the hero was are said once", async () => {
  keepPlain(TABLET);
  await mergeWithPeer({ name: TABLET });
  expect(await lastMerge()).toMatchObject({ sessions: 2, seen: false });
  await rememberMergeNotice("/settings");

  expect(await takeMergeNotice()).toEqual({ sessions: 2, returnTo: "/settings" });
  expect(await takeMergeNotice()).toBeNull();
});

test("merging keeps a copy of this device on the server once per device, then merges", async () => {
  keepPlain(TABLET);
  const first = await mergeWithPeer({ name: TABLET });
  expect(first).toEqual({ result: "merged", sessions: 2, changes: 3 });
  expect(mockUploads).toEqual([expect.stringMatching(/-kept-\d{8}T\d{6}-[0-9a-f]{4}\.batb$/)]);
  expect(mockMerges).toEqual([`/db/${TABLET}.plain`]);

  keepPlain(TABLET);
  await mergeWithPeer({ name: TABLET });
  // The net is laid once: every later merge with the same device goes straight in.
  expect(mockUploads).toHaveLength(1);
  expect(mockMerges).toHaveLength(2);
});

test("a new device joins the vault of the most recently written file", async () => {
  mockServer.set(OLD_PHONE, "o1");
  mockModified.set(OLD_PHONE, Date.parse("2026-01-01"));
  mockPeers[OLD_PHONE] = { open: "needsSecret" };
  mockServer.set(TABLET, "t1");
  mockModified.set(TABLET, Date.parse("2026-09-20"));
  mockPeers[TABLET] = { open: "needsSecret" };
  expect(await serverState()).toEqual({ kind: "needsSecret", peer: TABLET });
});

test("says how each other device stands, and ignores files that are not a device's", async () => {
  mockServer.set(TABLET, "t1");
  mockServer.set(OLD_PHONE, "o1");
  mockServer.set(WORK_PHONE, "w1");
  mockServer.set("notes.txt", "n1");
  mockServer.set(`${TABLET.replace(".batb", "")}-kept-20260925T1200.batb`, "k1");
  mockPeers[TABLET] = { open: "opened", peerChanges: 2 };
  mockPeers[OLD_PHONE] = { open: "opened", localChanges: 5 };
  mockPeers[WORK_PHONE] = { open: "opened", peerChanges: 1, localChanges: 1 };

  const { peers } = await syncNow({ snapshotFirst: false });

  expect(states(peers)).toEqual({
    [TABLET]: "ahead",
    [OLD_PHONE]: "behind",
    [WORK_PHONE]: "diverged",
  });
});

test("another password is locked; a newer build, or a file too large, is unreadable", async () => {
  mockServer.set(TABLET, "t1");
  mockServer.set(OLD_PHONE, "o1");
  mockServer.set(WORK_PHONE, "w1");
  mockPeers[TABLET] = { open: "needsSecret" };
  mockPeers[OLD_PHONE] = { open: "opened", valid: false };
  mockPeers[WORK_PHONE] = { open: "opened", size: 999_999 };

  const { peers } = await syncNow({ snapshotFirst: false });

  expect(states(peers)).toEqual({
    [TABLET]: "locked",
    [OLD_PHONE]: "unreadable",
    [WORK_PHONE]: "unreadable",
  });
});

test("an answer holds until that device has news, whatever its file's etag does", async () => {
  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "opened", peerChanges: 1, localChanges: 1, fingerprint: "tablet-1" };
  await rememberAnswer({ name: TABLET, comparison: { fingerprint: "tablet-1" } });

  // Sealed anew with nothing new in it: a new etag, the same state.
  mockServer.set(TABLET, "t2");
  expect((await syncNow({ snapshotFirst: false })).peers[0]?.state).toBe("level");

  mockPeers[TABLET] = { ...mockPeers[TABLET], fingerprint: "tablet-2" };
  expect((await syncNow({ snapshotFirst: false })).peers[0]?.state).toBe("diverged");
});

test("plain http is refused unless it is this phone; an account is kept only once it answered", async () => {
  mockSecure.clear();
  await expect(connectWebDav("http://nas.local/dav", "hero", "p")).rejects.toBeInstanceOf(
    InsecureAddressError,
  );
  mockListingFails = true;
  await expect(connectWebDav("https://dav.test", "hero", "wrong")).rejects.toThrow("HTTP 401");
  expect(await syncAccount()).toBeNull();

  mockListingFails = false;
  const local = await connectWebDav(" http://127.0.0.1:8080 ", " hero ", "p", "Round Sync");
  expect(accountLabel(local)).toBe("Round Sync");
  mockListings.length = 0;
  await syncNow({ snapshotFirst: false });
  expect(mockListings).toEqual(["http://127.0.0.1:8080/Bati"]);
});

test("a fresh server is empty; one holding a device under another password asks for it", async () => {
  expect(await serverState()).toEqual({ kind: "empty" });

  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "needsSecret", secret: "tablet password" };
  expect(await serverState()).toEqual({ kind: "needsSecret", peer: TABLET });

  expect(await joinPeer(TABLET, "typo")).toBe(false);
  expect(await joinPeer(TABLET, "tablet password")).toBe(true);
  // Joined as primary: this phone writes into the tablet's vault from now on.
  expect(mockJoins).toEqual([true]);

  mockPeers[TABLET] = { open: "opened" };
  expect(await serverState()).toEqual({ kind: "ready" });
});

test("before a take, this device's history goes to the folder under a name no device reads", async () => {
  await keepThisDeviceOnServer();
  expect(mockUploads).toHaveLength(1);
  expect(mockUploads[0]).toMatch(/^bati-[0-9a-f-]{36}-kept-\d{8}T\d{6}-[0-9a-f]{4}\.batb$/);
  expect((await syncNow({ snapshotFirst: false })).peers).toEqual([]);
});

test("stopping forgets the account and the scratch files it left", async () => {
  const { clearPeerScratch } = jest.requireMock("@/src/backupFiles") as {
    clearPeerScratch: jest.Mock;
  };
  clearPeerScratch.mockClear();
  await disconnectSync();
  expect(await syncAccount()).toBeNull();
  expect(clearPeerScratch).toHaveBeenCalled();
});

/**
 * Vaults of different formats on one server, and what a device does about each. The rule that
 * keeps a hero's backups safe is that a vault only moves forward: a higher format is joined
 * whatever the dates say, a lower one is never joined and never waited for, and nothing sealed
 * with a key this phone has left is merged into its history.
 */
describe("peers of another format", () => {
  test("a file of a version after the ones this build reads says to update, and holds nothing back", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "newerVersion" };

    const result = await syncNow({ snapshotFirst: true });

    expect(states(result.peers)).toEqual({ [TABLET]: "newerVersion" });
    expect(result.uploaded).toBe(true);
    expect(mockMerges).toEqual([]);
  });

  test("that verdict is kept while nothing changed, and asked again once this build reads one more format", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "newerVersion" };
    await syncNow({ snapshotFirst: true });
    await syncNow({ snapshotFirst: true });
    expect(mockDownloads).toEqual([TABLET]);

    // The build learns a format: a file it called too new may open now, so it is looked at again.
    mockCipher.reads = 4;
    mockPeers[TABLET] = { open: "opened", format: 2 };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });
    expect(mockDownloads).toEqual([TABLET, TABLET]);
  });

  test("a vault of a higher format is to be joined, however old its file", async () => {
    mockCipher.format = 2;
    await syncNow({ snapshotFirst: true });
    const [own] = mockUploads;
    assert(own);
    mockModified.set(own, Date.parse("2026-09-25T10:00:00Z"));
    // The tablet is on format 3 and its file is OLDER than this phone's: at the same format that
    // would make the tablet join this one. A higher format overrules the dates.
    mockServer.set(TABLET, "t1");
    mockModified.set(TABLET, Date.parse("2026-09-25T08:00:00Z"));
    mockPeers[TABLET] = { open: "needsSecret", format: 3 };
    mockFingerprint = "local-2";

    const result = await syncNow({ snapshotFirst: true });

    expect(result.peers).toEqual([
      expect.objectContaining({ name: TABLET, state: "locked", format: 3 }),
    ]);
    expect(result.uploaded).toBe(false);
  });

  test("a vault of a lower format is never joined and never waited for", async () => {
    mockCipher.format = 3;
    await syncNow({ snapshotFirst: true });
    const [own] = mockUploads;
    assert(own);
    mockModified.set(own, Date.parse("2026-09-25T10:00:00Z"));
    // A phone that never updated changed its password, and its file is the NEWEST on the server.
    // At the same format that would make this phone join it; here it would take the vault back.
    mockServer.set(OLD_PHONE, "o1");
    mockModified.set(OLD_PHONE, Date.parse("2026-09-25T12:00:00Z"));
    mockPeers[OLD_PHONE] = { open: "needsSecret", format: 2 };
    mockFingerprint = "local-2";

    const result = await syncNow({ snapshotFirst: true });

    expect(states(result.peers)).toEqual({ [OLD_PHONE]: "oldKey" });
    // The one thing the old rule got wrong: it held this phone's file back for ever, so the
    // phone that updated could never be seen by the one that had not.
    expect(result.uploaded).toBe(true);
    expect(mockMerges).toEqual([]);
  });

  test("a file that opens with a key this phone only keeps is a vault it left: not merged", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened", viaKeyring: true, peerChanges: 5, localChanges: 3 };

    const result = await syncNow({ snapshotFirst: true });

    expect(states(result.peers)).toEqual({ [TABLET]: "oldKey" });
    expect(result.uploaded).toBe(true);
    expect(mockMerges).toEqual([]);
  });

  test("two devices on the same format: the newer file wins, and on one date the larger name does", async () => {
    mockCipher.format = 3;
    await syncNow({ snapshotFirst: true });
    const [own] = mockUploads;
    assert(own);
    const when = Date.parse("2026-09-25T10:00:00Z");
    mockModified.set(own, when);
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 3 };
    mockFingerprint = "local-2";

    // Newer than this phone's: this phone joins it.
    mockModified.set(TABLET, when + 1000);
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "locked" });

    // Older: the tablet is the one to join.
    mockModified.set(TABLET, when - 1000);
    mockFingerprint = "local-3";
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "waiting" });

    // The same second: the file name decides, the same way on both devices, so exactly one waits.
    mockModified.set(TABLET, when);
    mockFingerprint = "local-4";
    const answer = states((await syncNow({ snapshotFirst: true })).peers)[TABLET];
    expect(answer).toBe(TABLET > own ? "locked" : "waiting");
  });

  test("with several vaults to join, the best is offered first: the higher format, then the newer", async () => {
    mockCipher.format = 2;
    mockServer.set(TABLET, "t1");
    mockServer.set(OLD_PHONE, "o1");
    mockServer.set(WORK_PHONE, "w1");
    mockModified.set(TABLET, Date.parse("2026-09-25T09:00:00Z"));
    mockModified.set(OLD_PHONE, Date.parse("2026-09-25T11:00:00Z"));
    mockModified.set(WORK_PHONE, Date.parse("2026-09-25T10:00:00Z"));
    mockPeers[TABLET] = { open: "needsSecret", format: 3 };
    mockPeers[OLD_PHONE] = { open: "needsSecret", format: 2 };
    mockPeers[WORK_PHONE] = { open: "needsSecret", format: 3 };

    const { peers } = await syncNow({ snapshotFirst: true });

    // Format 3 before format 2, whatever its date; between the two format 3, the newer.
    expect([...peers].sort(joinOrder).map((p) => p.name)).toEqual([WORK_PHONE, TABLET, OLD_PHONE]);
  });
});

describe("connecting to a server that already has devices", () => {
  const sealedBy = (name: string, patch: (typeof mockPeers)[string], modified: number) => {
    mockServer.set(name, `e-${name}`);
    mockModified.set(name, modified);
    mockPeers[name] = patch;
  };

  test("joins the highest format, not the file written last", async () => {
    // A phone reset long ago left a v2 file, newer by the clock; the live vault is the v3 one.
    sealedBy(
      TABLET,
      { open: "needsSecret", format: 3, secret: "x" },
      Date.parse("2026-09-01T00:00:00Z"),
    );
    sealedBy(
      OLD_PHONE,
      { open: "needsSecret", format: 2, secret: "x" },
      Date.parse("2026-10-01T00:00:00Z"),
    );

    expect(await serverState()).toEqual({ kind: "needsSecret", peer: TABLET });
  });

  test("among files of one format, the newest is the one to join, as before", async () => {
    sealedBy(
      TABLET,
      { open: "needsSecret", format: 2, secret: "x" },
      Date.parse("2026-09-01T00:00:00Z"),
    );
    sealedBy(
      OLD_PHONE,
      { open: "needsSecret", format: 2, secret: "x" },
      Date.parse("2026-10-01T00:00:00Z"),
    );

    expect(await serverState()).toEqual({ kind: "needsSecret", peer: OLD_PHONE });
  });

  test("a stale locked file does not demand a password when the best vault already opens", async () => {
    sealedBy(TABLET, { open: "opened", format: 3 }, Date.parse("2026-10-01T00:00:00Z"));
    sealedBy(
      OLD_PHONE,
      { open: "needsSecret", format: 2, secret: "x" },
      Date.parse("2026-11-01T00:00:00Z"),
    );

    expect(await serverState()).toEqual({ kind: "ready" });
  });

  test("a file this build cannot read means update first: never ready, never a second vault", async () => {
    sealedBy(TABLET, { open: "opened", format: 2 }, 1);
    sealedBy(OLD_PHONE, { open: "newerVersion" }, 2);

    expect(await serverState()).toEqual({ kind: "newerVersion" });
  });

  test("an empty server is empty", async () => {
    expect(await serverState()).toEqual({ kind: "empty" });
  });
});

/** The id a v3 file carries for the device a name stands for: the name's uuid, without dashes. */
const idOf = (name: string) =>
  name
    .replace(/^bati-/, "")
    .replace(/\.batb$/, "")
    .replaceAll("-", "");

describe("a file older than the last one seen from that device", () => {
  const sealed = (name: string, counter: string, patch = {}) => ({
    open: "opened" as const,
    format: 3 as const,
    sealedBy: { installId: idOf(name), counter },
    ...patch,
  });

  beforeEach(() => {
    mockCipher.format = 3;
  });

  test("is left aside: a counter that goes back is a copy from before, not news", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "7", { peerChanges: 3 });
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "ahead" });

    // The server hands back an older version of the same file (Nextcloud keeps versions, Syncthing
    // too): same name, a counter that went back.
    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = sealed(TABLET, "4", { peerChanges: 9 });
    const result = await syncNow({ snapshotFirst: true });

    expect(states(result.peers)).toEqual({ [TABLET]: "replayed" });
    expect(mockMerges).toEqual([]);
    // Nothing waits on it: this device still sends its own file.
    expect(result.uploaded).toBe(true);
  });

  test("never lowers the number it remembers, so a second old copy is refused too", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "7");
    await syncNow({ snapshotFirst: true });
    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = sealed(TABLET, "4");
    await syncNow({ snapshotFirst: true });
    mockServer.set(TABLET, "t3");
    mockPeers[TABLET] = sealed(TABLET, "6");

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "replayed",
    });
  });

  test("the same counter again, and any higher one, are fine", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "7");
    await syncNow({ snapshotFirst: true });
    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = sealed(TABLET, "7");
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });
    mockServer.set(TABLET, "t3");
    mockPeers[TABLET] = sealed(TABLET, "8");
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });
  });

  test("a file from a format that has no counter is never judged by one", async () => {
    mockCipher.format = 2;
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened", format: 2 };
    await syncNow({ snapshotFirst: true });
    mockServer.set(TABLET, "t2");
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });
  });

  test("a counter read from a file that did not open under this phone's key is not remembered", async () => {
    // A stranger's, or an old vault's, file claiming a huge counter must not make every real file
    // of that device look old afterwards.
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "1152921504606846976", { viaKeyring: true });
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "oldKey" });

    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = sealed(TABLET, "4");
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });
  });

  test("a counter past what JavaScript can count exactly is not a backup this build trusts", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "9007199254740993");

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "unreadable",
    });
  });

  test("a file whose name is not the id inside it is not that device's", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "3", {
      sealedBy: { installId: idOf(OLD_PHONE), counter: "3" },
    });

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "unreadable",
    });
  });

  test("forgetting the device lets its counter start again, as after a restore", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = sealed(TABLET, "7");
    await syncNow({ snapshotFirst: true });
    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = sealed(TABLET, "1");
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "replayed",
    });

    await forgetPeer({ name: TABLET, etag: "t2" });
    mockServer.set(TABLET, "t3");
    mockPeers[TABLET] = sealed(TABLET, "2");

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });
  });
});

describe("forgetting a device", () => {
  test("hides it, and never deletes its file", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "locked" });

    await forgetPeer({ name: TABLET, etag: "t1" });

    expect((await syncNow({ snapshotFirst: true })).peers).toEqual([]);
    expect(mockServer.has(TABLET)).toBe(true);
  });

  test("a forgotten device does not hold this one's upload back, nor block an update", async () => {
    await syncNow({ snapshotFirst: true });
    newerOnServer(TABLET);
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };
    mockFingerprint = "local-2";
    expect((await syncNow({ snapshotFirst: true })).uploaded).toBe(false);
    expect(await vaultUpdateBlockers()).toEqual([TABLET]);

    await forgetPeer({ name: TABLET, etag: "t1" });

    mockFingerprint = "local-3";
    expect((await syncNow({ snapshotFirst: true })).uploaded).toBe(true);
    expect(await vaultUpdateBlockers()).toEqual([]);
  });

  test("a device that writes again is alive after all, and is seen again", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };
    await syncNow({ snapshotFirst: true });
    await forgetPeer({ name: TABLET, etag: "t1" });
    expect((await syncNow({ snapshotFirst: true })).peers).toEqual([]);

    newerOnServer(TABLET);
    mockServer.set(TABLET, "t2");

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "locked" });
  });

  test("a connecting phone does not have to join a ghost the hero forgot", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2, secret: "x" };
    await forgetPeer({ name: TABLET, etag: "t1" });

    expect(await serverState()).toEqual({ kind: "empty" });
  });
});

describe("updating the vault", () => {
  test("is blocked by a device still waiting for a password, and by nothing else", async () => {
    mockServer.set(TABLET, "t1");
    mockServer.set(OLD_PHONE, "o1");
    mockServer.set(WORK_PHONE, "w1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };
    mockPeers[OLD_PHONE] = { open: "opened", format: 2, viaKeyring: true };
    mockPeers[WORK_PHONE] = { open: "opened", format: 2 };

    expect(await vaultUpdateBlockers()).toEqual([TABLET]);
  });

  test("runs a sync first, so what it blocks on is what the server holds now", async () => {
    await vaultUpdateBlockers();

    expect(mockListings.length).toBeGreaterThan(0);
    expect(mockUploads).toHaveLength(1);
  });
});

// After a new password this device keeps the old key for reading only: that vault is one it left. The other devices
// pick the vault to join by file dates, so one whose file is as new as this device's own would be kept, with this
// device never joining it: a split for good (found by the random nights, a tie on the server's one second dates).
describe("a vault this device left whose file is as new as its own", () => {
  const leftVault = (modified: number) => {
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = { open: "opened", viaKeyring: true };
    mockModified.set(OLD_PHONE, modified);
  };
  const sentAgain = async (own: number, left: number) => {
    await syncNow({ snapshotFirst: true });
    mockModified.set(mockUploads[0] ?? "", own);
    leftVault(left);
    const result = await syncNow({ snapshotFirst: true });
    expect(states(result.peers)).toEqual({ [OLD_PHONE]: "oldKey" });
    return result.uploaded;
  };

  test("newer: this device's file is sent again, so that it is the newest and the others join it", async () => {
    expect(await sentAgain(100, 200)).toBe(true);
    expect(mockUploads).toHaveLength(2);
  });

  test("the same second counts: the next send is later", async () => {
    expect(await sentAgain(200, 200)).toBe(true);
  });

  test("older: nothing is sent, this file already is the newest", async () => {
    expect(await sentAgain(300, 200)).toBe(false);
    expect(mockUploads).toHaveLength(1);
  });

  test("no date on this device's file: nothing to compare, nothing sent", async () => {
    expect(await sentAgain(0, 200)).toBe(false);
  });

  test("no date on the other file: nothing to compare, nothing sent", async () => {
    expect(await sentAgain(100, 0)).toBe(false);
  });
});

describe("what a sync leaves on disk", () => {
  const plainOf = (name: string) => `file:///db/${name}.plain`;
  const sealedOf = (name: string) => `file:///db/${name}.sealed`;

  test("another device's history is kept in plain only while the hero may take it, and deleted as soon as it is not news", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened", peerChanges: 3 };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "ahead" });
    // The one the hero may take stays: that is what "take it" reads.
    expect(mockFiles.has(plainOf(TABLET))).toBe(true);
    expect(mockDeleted).not.toContain(plainOf(TABLET));

    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = { open: "opened", peerChanges: 0 };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "level" });

    expect(mockFiles.has(plainOf(TABLET))).toBe(false);
    expect(mockDeleted).toContain(plainOf(TABLET));
  });

  test("the sealed copy of a peer this phone cannot open yet is deleted, not kept", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };

    await syncNow({ snapshotFirst: true });

    expect(mockFiles.has(sealedOf(TABLET))).toBe(false);
    expect(mockDeleted).toContain(sealedOf(TABLET));
  });

  test("this device's own snapshot is deleted once it is sent, and the scratch folder is emptied at the start", async () => {
    const { clearPeerScratch } = jest.requireMock("@/src/backupFiles") as {
      clearPeerScratch: jest.Mock;
    };
    clearPeerScratch.mockClear();

    await syncNow({ snapshotFirst: true });

    expect(clearPeerScratch).toHaveBeenCalledTimes(1);
    expect(mockUploads).toHaveLength(1);
    expect(mockDeleted).toContain("file:///db/own.out");
    expect(mockFiles.has("file:///db/own.out")).toBe(false);
  });

  test("merging uses the kept copy and deletes it", async () => {
    keepPlain(TABLET);

    await mergeWithPeer({ name: TABLET });

    expect(mockFiles.has(plainOf(TABLET))).toBe(false);
    expect(mockDeleted).toContain(plainOf(TABLET));
  });

  test.each([
    ["serverState", () => serverState()],
    ["joinPeer", () => joinPeer(OLD_PHONE, "the vault's password")],
  ])("%s leaves no peer file on disk, whatever it found", async (_name, run) => {
    for (const name of [OLD_PHONE, TABLET]) {
      mockServer.set(name, `e-${name}`);
      mockModified.set(name, Date.parse("2026-09-01"));
      mockPeers[name] = { open: "needsSecret", format: 3, secret: "the vault's password" };
    }

    await run();

    expect(
      [...mockFiles].filter((uri) => uri.endsWith(".sealed") || uri.endsWith(".plain")),
    ).toEqual([]);
    expect(mockDeleted.some((uri) => uri === sealedOf(OLD_PHONE) || uri === sealedOf(TABLET))).toBe(
      true,
    );
  });

  test("a peer whose file fails to open still leaves nothing behind", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "throws" };

    await syncNow({ snapshotFirst: true });

    expect([...mockFiles].filter((uri) => uri.includes(TABLET))).toEqual([]);
  });
});

describe("which vault joins which when only one side has a date", () => {
  const HIGH = "bati-ffffffff-ffff-7fff-8fff-ffffffffffff.batb";
  const LOW = "bati-00000000-0000-7000-8000-000000000000.batb";
  const lockedPeer = (name: string, modified: number) => {
    mockServer.set(name, `e-${name}`);
    mockModified.set(name, modified);
    mockPeers[name] = { open: "needsSecret", format: 2 };
  };

  test("an undated own file: the name decides, so the lower name waits", async () => {
    await syncNow({ snapshotFirst: true });
    lockedPeer(LOW, 100);
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [LOW]: "waiting" });
  });

  test("an undated peer against a dated own file: the name decides, so the higher name is the vault to join", async () => {
    await syncNow({ snapshotFirst: true });
    mockModified.set(mockUploads[0] ?? "", 1);
    lockedPeer(HIGH, 0);
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [HIGH]: "locked" });
  });

  test("both undated: the higher name is joined, the lower one waits", async () => {
    await syncNow({ snapshotFirst: true });
    lockedPeer(HIGH, 0);
    lockedPeer(LOW, 0);
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [HIGH]: "locked",
      [LOW]: "waiting",
    });
  });
});

describe("a merge that cannot go ahead changes nothing", () => {
  test("no kept copy of that device: refused, nothing merged, nothing sent", async () => {
    await expect(mergeWithPeer({ name: TABLET })).rejects.toThrow(
      "history was not kept for merging",
    );
    expect(mockMerges).toEqual([]);
    expect(mockUploads).toEqual([]);
  });

  test("a merge the database refuses is said as cannot: no tombstones honoured, nothing noted, the copy stays", async () => {
    keepPlain(TABLET);
    mockMergeOutcome.merged = false;

    expect(await mergeWithPeer({ name: TABLET })).toEqual({ result: "cannot" });

    const { honourTombstones } = jest.requireMock("@/db/merge") as { honourTombstones: jest.Mock };
    expect(honourTombstones).not.toHaveBeenCalled();
    expect(await lastMerge()).toBeNull();
    expect(mockFiles.has(`file:///db/${TABLET}.plain`)).toBe(true);
  });

  test("the path handed to the database has no file:// in front of it", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened", peerChanges: 2 };
    await syncNow({ snapshotFirst: true });
    keepPlain(TABLET);
    await mergeWithPeer({ name: TABLET });

    expect(mockValidated[0]).toMatch(/^\/db\//);
    expect(mockMerges[0]).not.toContain("file://");
  });
});

describe("which vault a phone that connects is asked to join", () => {
  const HIGH = "bati-ffffffff-ffff-7fff-8fff-ffffffffffff.batb";
  const LOW = "bati-00000000-0000-7000-8000-000000000000.batb";
  const locked = (name: string, extra: object = {}) => {
    mockServer.set(name, `e-${name}`);
    mockPeers[name] = { open: "needsSecret", format: 3, secret: "pw", ...extra };
  };

  test("a server holding only something that is not a backup is ready, not an error", async () => {
    mockServer.set(TABLET, "e1");
    mockPeers[TABLET] = { open: "notEncrypted", format: 2 };
    expect(await serverState()).toEqual({ kind: "ready" });
  });

  test("files of a lower format and one that cannot be fetched: ready, no throw", async () => {
    mockCipher.format = 3;
    locked(OLD_PHONE, { format: 2 });
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    mockDownloadFails.add(TABLET);
    await expect(serverState()).resolves.toEqual({ kind: "ready" });
  });

  test("a phone with no vault of its own cannot say its old file is the newer vault", async () => {
    await syncNow({ snapshotFirst: true });
    mockModified.set(mockUploads[0] ?? "", Date.parse("2026-10-10"));
    mockCipher.format = null;
    locked(OLD_PHONE);
    mockModified.set(OLD_PHONE, Date.parse("2026-09-01"));

    expect(await serverState()).toEqual({ kind: "needsSecret", peer: OLD_PHONE });
  });

  test.each([
    ["lower first", [LOW, HIGH]],
    ["higher first", [HIGH, LOW]],
  ])(
    "two undated vaults: the higher name, whatever the order of the listing (%s)",
    async (_order, names) => {
      for (const name of names) locked(name);
      expect(await serverState()).toEqual({ kind: "needsSecret", peer: HIGH });
    },
  );
});

describe("joining a vault", () => {
  test("a file of a lower format than this phone seals in is not one to join", async () => {
    mockCipher.format = 3;
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = { open: "needsSecret", format: 2, secret: "pw" };
    expect(await joinPeer(OLD_PHONE, "pw")).toBe(false);
    expect(mockJoins).toEqual([]);
  });

  test("a file this phone's own key opens is not a vault to join, whatever secret is typed", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = { open: "needsSecret", format: 2, secret: "pw" };
    expect(await joinPeer(OLD_PHONE, "wrong")).toBe(false);
    expect(mockJoins).toEqual([]);
  });
});

describe("the launch half of sync", () => {
  test.each([
    ["no account", () => disconnectSync()],
    [
      "encryption off",
      () => {
        mockCipher.status = "off";
      },
    ],
    [
      "encryption locked",
      () => {
        mockCipher.status = "locked";
      },
    ],
  ])("%s: nothing is sealed, so nothing plain is ever written", async (_name, setUp) => {
    await setUp();
    await prepareSyncAtLaunch();
    expect(mockWrites.count).toBe(0);
  });

  test("a snapshot that cannot be written is reported, never thrown at the launch", async () => {
    mockWrites.fail = true;
    mockFingerprint = "local-9";

    await expect(prepareSyncAtLaunch()).resolves.toBeUndefined();

    const { reportError } = jest.requireMock("@/src/reportError") as { reportError: jest.Mock };
    expect(reportError).toHaveBeenCalledWith("sync.prepare", expect.any(Error));
  });
});

describe("stopping sync", () => {
  test("revokes the app password of a Nextcloud account, once", async () => {
    await disconnectSync();
    expect(mockRevoked).toHaveLength(1);
  });

  test("revokes nothing for a plain WebDAV account", async () => {
    await connectWebDav("https://dav.test", "hero", "secret");
    mockRevoked.length = 0;
    await disconnectSync();
    expect(mockRevoked).toEqual([]);
  });

  test("with no account at all it still resolves", async () => {
    await disconnectSync();
    await expect(disconnectSync()).resolves.toBeUndefined();
  });
});

describe("the upload guard", () => {
  test("a server that gives no etag is not sent the same file again at every sync", async () => {
    mockNoEtag.on = true;
    await syncNow({ snapshotFirst: true });
    const second = await syncNow({ snapshotFirst: true });
    expect(second.uploaded).toBe(false);
    expect(mockUploads).toHaveLength(1);
  });

  test("this device's own file is found by its name, not taken from the first file listed", async () => {
    await syncNow({ snapshotFirst: true });
    mockServer.delete(mockUploads[0] ?? "");
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    await syncNow({ snapshotFirst: true });
    expect(mockUploads).toHaveLength(2);
  });

  test("a file that opened as not a backup is unreadable", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "notEncrypted", format: 2 };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "unreadable",
    });
  });
});

describe("the Wi-Fi only setting", () => {
  test("is off by default, on and off again, and stored under its own key", async () => {
    expect(await syncWifiOnly()).toBe(false);

    await setSyncWifiOnly(true);
    expect(await syncWifiOnly()).toBe(true);
    expect(mockPrefs.get("syncWifiOnly")).toBe("true");

    await setSyncWifiOnly(false);
    expect(await syncWifiOnly()).toBe(false);
    expect(mockPrefs.has("syncWifiOnly")).toBe(false);
  });
});

describe("how the last runs went", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "setInterval"] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("nothing is known before the first run", async () => {
    expect(await syncHealth()).toEqual({ lastSuccessAt: null, failure: null, failingSince: null });
  });

  test("failing since the first failure, with the latest reason, and a success starts it over", async () => {
    jest.setSystemTime(1_000_000);
    await recordSyncOutcome(null);
    jest.setSystemTime(2_000_000);
    await recordSyncOutcome({ kind: "offline" });
    jest.setSystemTime(3_000_000);
    const second = await recordSyncOutcome({ kind: "server", status: 503 });

    expect(second).toEqual({
      lastSuccessAt: 1_000_000,
      failure: { kind: "server", status: 503 },
      failingSince: 2_000_000,
    });

    jest.setSystemTime(4_000_000);
    expect(await recordSyncOutcome(null)).toEqual({
      lastSuccessAt: 4_000_000,
      failure: null,
      failingSince: null,
    });
    expect(await syncHealth()).toEqual({
      lastSuccessAt: 4_000_000,
      failure: null,
      failingSince: null,
    });
  });
});

describe("naming an account", () => {
  const dav = (url: string, label?: string) =>
    ({ kind: "webdav", url, user: "hero", password: "p", ...(label ? { label } : {}) }) as never;

  test("by its label when it has one, else by its host without the scheme or the trailing slashes", () => {
    expect(accountLabel(dav("http://nas.test/dav//"))).toBe("nas.test/dav");
    expect(accountLabel(dav("https://nas.test/dav", "kDrive"))).toBe("kDrive");
    expect(accountLabel(dav("https://a.test/p?u=http://b"))).toBe("a.test/p?u=http://b");
    expect(
      accountLabel({
        kind: "nextcloud",
        server: "https://cloud.test/",
        loginName: "h",
        appPassword: "a",
      }),
    ).toBe("cloud.test");
  });
});

describe("connecting", () => {
  beforeEach(async () => {
    await disconnectSync();
  });

  test("a hero who never approved the browser login connects nothing and nothing is listed", async () => {
    mockListings.length = 0;
    const { loginToNextcloud } = jest.requireMock("@/src/cloudSync") as {
      loginToNextcloud: jest.Mock;
    };
    // The mock resolves an account; this one declines (the browser was closed).
    const original = loginToNextcloud;
    (jest.requireMock("@/src/cloudSync") as { loginToNextcloud: unknown }).loginToNextcloud = () =>
      Promise.resolve(null);
    try {
      expect(await connectNextcloud("cloud.test", () => false)).toBeNull();
      expect(await syncAccount()).toBeNull();
      expect(mockListings).toEqual([]);
    } finally {
      (jest.requireMock("@/src/cloudSync") as { loginToNextcloud: unknown }).loginToNextcloud =
        original;
    }
  });

  test("an address is trimmed, a query that holds another address is not mistaken for plain http", async () => {
    await connectWebDav("  https://nas.test/dav ", " hero ", "pw");
    expect(await syncAccount()).toMatchObject({
      kind: "webdav",
      url: "https://nas.test/dav",
      user: "hero",
    });

    await disconnectSync();
    await expect(
      connectWebDav("https://nas.test/?r=http://x", "hero", "pw"),
    ).resolves.toBeDefined();
  });

  test("plain http to the internet is refused in the words the hero reads", async () => {
    await expect(connectWebDav("http://nas.test", "hero", "pw")).rejects.toThrow(
      "Plain HTTP is only allowed to this phone",
    );
  });
});

describe("with no account", () => {
  beforeEach(async () => {
    await disconnectSync();
  });

  test.each([
    ["syncNow", () => syncNow({ snapshotFirst: true })],
    ["keepThisDeviceOnServer", () => keepThisDeviceOnServer()],
    ["serverState", () => serverState()],
    ["joinPeer", () => joinPeer(TABLET, "pw")],
  ])("%s says sync is not connected", async (_name, run) => {
    await expect(run()).rejects.toThrow("Sync is not connected");
  });
});

describe("what syncNow says when other devices' files cannot be read", () => {
  test("when every one fails, the failure is what that error says, not 'unknown'", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    mockDownloadFails.add(TABLET);

    const result = await syncNow({ snapshotFirst: true });

    expect(result.peerFailure).toEqual(failureOf(new Error("response has status: 403")));
  });

  test("an empty server has no failure at all, and neither has one with a readable peer beside a failing one", async () => {
    expect(await syncNow({ snapshotFirst: true })).toEqual({ uploaded: true, peers: [] });

    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    mockDownloadFails.add(TABLET);
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = { open: "opened" };
    expect("peerFailure" in (await syncNow({ snapshotFirst: true }))).toBe(false);
  });

  // S13: a session another device deleted that this one keeps never stops the rest from being sent; the sheet is told.
  test("sessions kept despite a tombstone are reported with the result, and the send still goes out", async () => {
    const { keptSessions } = jest.requireMock("@/db/merge") as { keptSessions: jest.Mock };
    keptSessions.mockResolvedValueOnce(2);

    const result = await syncNow({ snapshotFirst: true });

    expect(result).toEqual({ uploaded: true, peers: [], keptSessions: 2 });
  });

  test("a peer carries its date only when the server gave one", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    mockModified.set(TABLET, 100);
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = { open: "opened" };

    const { peers } = await syncNow({ snapshotFirst: true });

    expect(peers.find((p) => p.name === TABLET)?.modified).toBe(100);
    expect("modified" in (peers.find((p) => p.name === OLD_PHONE) ?? {})).toBe(false);
  });

  test("a file exactly at the size limit is read, one byte over is not", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened", size: 5000 };
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = { open: "opened", size: 5001 };

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "level",
      [OLD_PHONE]: "unreadable",
    });
  });
});

describe("forgetting that sync stopped", () => {
  test("the hero's 'forget it' removes the stopped marker", async () => {
    mockSecure.delete("bati.sync.account");
    expect(await lostSync()).toBe("cloud.test");

    await forgetLostSync();

    expect(await lostSync()).toBeNull();
  });
});

describe("a listing that is late", () => {
  test("a device already read is still seen when the listing leaves its file out", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "locked" });

    mockHidden.add(TABLET);
    const late = await syncNow({ snapshotFirst: true });

    // Not "no other device, up to date": the device is there, so a locked one still holds this upload back.
    expect(late.peers.map((p) => p.name)).toEqual([TABLET]);
    expect(late.uploaded).toBe(false);
  });

  test("a device the hero forgot stays forgotten across a listing that left its file out", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "needsSecret", format: 2 };
    await syncNow({ snapshotFirst: true });
    await forgetPeer({ name: TABLET, etag: "t1" });

    mockHidden.add(TABLET);
    await syncNow({ snapshotFirst: true });
    mockHidden.clear();
    const back = await syncNow({ snapshotFirst: true });

    expect(back.peers).toEqual([]);
  });

  test("this device's own file missing from the listing is found by name, so nothing is sent again for it", async () => {
    await syncNow({ snapshotFirst: true });
    expect(mockUploads).toHaveLength(1);

    mockHidden.add(mockUploads[0] ?? "");
    await syncNow({ snapshotFirst: true });

    expect(mockUploads).toHaveLength(1);
  });
});

describe("a peer that cannot be read this time", () => {
  beforeEach(() => {
    mockDownloadFails.clear();
    mockListedSize.clear();
  });

  test("does not stop this device from sending its own history", async () => {
    mockServer.set(TABLET, "t1");
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[TABLET] = { open: "opened", peerChanges: 1 };
    mockPeers[OLD_PHONE] = { open: "opened" };
    mockDownloadFails.add(TABLET);

    const result = await syncNow({ snapshotFirst: false });

    expect(result.uploaded).toBe(true);
    expect(result.peers.map((p) => p.name)).toEqual([OLD_PHONE]);
  });

  test("when no other device's file can be read, the run says so instead of reading as up to date", async () => {
    mockServer.set(TABLET, "t1");
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[TABLET] = { open: "opened" };
    mockPeers[OLD_PHONE] = { open: "opened" };
    mockDownloadFails.add(TABLET);
    mockDownloadFails.add(OLD_PHONE);

    const result = await syncNow({ snapshotFirst: false });

    expect(result.peers).toEqual([]);
    expect(result.peerFailure).toEqual({ kind: "unknown" });
  });

  test("one file that reads is enough: the run did learn something", async () => {
    mockServer.set(TABLET, "t1");
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[TABLET] = { open: "opened" };
    mockPeers[OLD_PHONE] = { open: "opened" };
    mockDownloadFails.add(TABLET);

    expect((await syncNow({ snapshotFirst: false })).peerFailure).toBeUndefined();
  });

  test("is tried again at the next sync, because a failure is not a verdict", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened" };
    mockDownloadFails.add(TABLET);
    await syncNow({ snapshotFirst: false });

    mockDownloadFails.clear();
    const { peers } = await syncNow({ snapshotFirst: false });

    expect(states(peers)).toEqual({ [TABLET]: "level" });
    expect(mockDownloads.filter((n) => n === TABLET)).toHaveLength(2);
  });

  test("a download of another size than the server lists is a failed download, not 'not a backup'", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "opened", size: 0 };
    mockListedSize.set(TABLET, 4000);

    const first = await syncNow({ snapshotFirst: false });
    expect(first.peers).toEqual([]);

    mockPeers[TABLET] = { open: "opened", size: 4000 };
    const second = await syncNow({ snapshotFirst: false });
    expect(states(second.peers)).toEqual({ [TABLET]: "level" });
  });
});

describe("the sixteen places for other devices", () => {
  test("are not used up by devices the hero forgot", async () => {
    const stale = Array.from(
      { length: 16 },
      (_, i) =>
        `bati-0190a000-0000-7000-8000-0000000000${(i + 16).toString(16).padStart(2, "0")}.batb`,
    );
    for (const name of stale) {
      mockServer.set(name, "s1");
      mockPeers[name] = { open: "opened" };
    }
    mockServer.set(WORK_PHONE, "w1");
    mockPeers[WORK_PHONE] = { open: "opened", peerChanges: 1 };
    // The live device sorts after sixteen stale files: it is not even looked at...
    expect((await syncNow({ snapshotFirst: false })).peers.map((p) => p.name)).not.toContain(
      WORK_PHONE,
    );

    for (const name of stale) await forgetPeer({ name, etag: "s1" });

    // ...until the hero has forgotten them, and then it must be.
    expect((await syncNow({ snapshotFirst: false })).peers.map((p) => p.name)).toEqual([
      WORK_PHONE,
    ]);
  });
});

describe("the copy kept before a merge", () => {
  test("two kept in the same minute are two files: the second must not replace the first", async () => {
    const first = await keepThisDeviceOnServer();
    const second = await keepThisDeviceOnServer();

    expect(first).not.toBe(second);
    expect(mockUploads.filter((n) => n.includes("-kept-"))).toEqual([first, second]);
  });
});

describe("this device's own file on the server", () => {
  test("replaced behind its back (a restored server) is written again, though nothing changed here", async () => {
    await syncNow({ snapshotFirst: false });
    const own = mockUploads[0] ?? "";
    expect(mockUploads).toHaveLength(1);

    mockServer.set(own, "an-older-version"); // the server hands back a previous file

    const second = await syncNow({ snapshotFirst: false });

    expect(second.uploaded).toBe(true);
    expect(mockUploads).toEqual([own, own]);
  });

  test("left as this device wrote it, is not written again: no loop", async () => {
    await syncNow({ snapshotFirst: false });
    await syncNow({ snapshotFirst: false });
    await syncNow({ snapshotFirst: false });

    expect(mockUploads).toHaveLength(1);
  });
});

describe("a server that refuses the first listing", () => {
  beforeEach(async () => {
    await disconnectSync();
    mockDiagnosed.length = 0;
    mockListingFails = true;
  });

  test("is not remembered, Nextcloud like WebDAV: nothing fails at every launch", async () => {
    await expect(connectNextcloud("cloud.test", () => false)).rejects.toThrow();
    expect(await syncAccount()).toBeNull();

    await expect(connectWebDav("https://dav.test", "hero", "p")).rejects.toThrow();
    expect(await syncAccount()).toBeNull();
    // And no "stopped on its own" warning for an account that never was.
    expect(await lostSync()).toBeNull();
  });

  test("is what the connection test asks about, while nothing is remembered", async () => {
    await expect(connectNextcloud("cloud.test", () => false)).rejects.toThrow();

    await testConnection();

    expect(mockDiagnosed).toEqual([
      { folderUrl: "https://cloud.test/remote.php/webdav/Bati", nextcloud: true },
    ]);
  });

  test("is forgotten once another connection works, so the test asks about the one connected", async () => {
    await expect(connectNextcloud("cloud.test", () => false)).rejects.toThrow();
    mockListingFails = false;
    await connectWebDav("https://dav.test", "hero", "p");

    await testConnection();

    expect(mockDiagnosed).toEqual([{ folderUrl: "https://dav.test/Bati", nextcloud: false }]);
  });

  test("with nothing connected and nothing refused, there is nothing to test", async () => {
    mockListingFails = false;

    expect(await testConnection()).toEqual([]);
    expect(mockDiagnosed).toEqual([]);
  });
});

describe("which vault a connecting device joins, and with what", () => {
  const SECRET_V3 = "the vault's password";
  const locked = (name: string, modified: string, patch = {}) => {
    mockServer.set(name, `e-${name}`);
    mockModified.set(name, Date.parse(modified));
    mockPeers[name] = { open: "needsSecret", format: 3, secret: SECRET_V3, ...patch };
  };

  beforeEach(() => {
    mockCipher.format = 2;
    mockDownloadFails.clear();
  });

  describe("connecting", () => {
    test("one file that cannot be fetched does not stop it: the others decide", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z");
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");
      mockDownloadFails.add(TABLET);

      expect(await serverState()).toEqual({ kind: "needsSecret", peer: OLD_PHONE });
    });

    test("files listed and none readable is not an empty server: no second vault is started on it", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z");
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");
      mockDownloadFails.add(TABLET);
      mockDownloadFails.add(OLD_PHONE);

      await expect(serverState()).rejects.toThrow("none could be read");
    });

    test("a file that is not a backup is not a vault: it neither wins nor says 'ready'", async () => {
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");
      mockServer.set(TABLET, "e-garbage");
      mockModified.set(TABLET, Date.parse("2026-11-01T00:00:00Z"));
      mockPeers[TABLET] = { open: "notEncrypted", format: 3 };

      expect(await serverState()).toEqual({ kind: "needsSecret", peer: OLD_PHONE });
    });

    test("a device that seals in format 3 does not go and join a format 2 vault", async () => {
      mockCipher.format = 3;
      locked(TABLET, "2026-10-01T00:00:00Z", { format: 2 });

      expect(await serverState()).toEqual({ kind: "ready" });
    });

    test("a device whose own file is the newer vault is not asked to join the older one", async () => {
      mockCipher.format = 3;
      await syncNow({ snapshotFirst: true });
      const own = mockUploads[0] ?? "";
      mockModified.set(own, Date.parse("2026-10-10T00:00:00Z"));
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");

      expect(await serverState()).toEqual({ kind: "ready" });
    });

    test("with no date on the server, the file name decides, so the two devices do not both join the other", async () => {
      mockCipher.format = 3;
      await syncNow({ snapshotFirst: true });
      // A name that sorts before any install id: the other device is the one that joins this one.
      const lowest = "bati-00000000-0000-0000-0000-000000000000.batb";
      locked(lowest, "2026-09-01T00:00:00Z");
      mockModified.set(lowest, 0);

      expect(await serverState()).toEqual({ kind: "ready" });
    });

    test("and is asked when the other vault is the newer one", async () => {
      mockCipher.format = 3;
      await syncNow({ snapshotFirst: true });
      const own = mockUploads[0] ?? "";
      mockModified.set(own, Date.parse("2026-09-01T00:00:00Z"));
      locked(OLD_PHONE, "2026-10-10T00:00:00Z");

      expect(await serverState()).toEqual({ kind: "needsSecret", peer: OLD_PHONE });
    });
  });

  describe("joining", () => {
    test("tries the other files of the vault when the named one is damaged", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z");
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");
      mockDownloadFails.add(TABLET);

      expect(await joinPeer(TABLET, SECRET_V3)).toBe(true);
      expect(mockJoins).toEqual([true]);
    });

    test("tries the named file first, then the rest from the best vault down", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z", { secret: "the tablet's" });
      locked(OLD_PHONE, "2026-09-01T00:00:00Z", { secret: "the old phone's" });
      locked(WORK_PHONE, "2026-08-01T00:00:00Z", { secret: "the work phone's" });

      expect(await joinPeer(TABLET, "the work phone's")).toBe(true);
      expect(mockDownloads.filter((n) => n.startsWith("bati-")).slice(-3)).toEqual([
        TABLET,
        OLD_PHONE,
        WORK_PHONE,
      ]);
    });

    test("a wrong password is a wrong password, whatever the number of files", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z");
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");

      expect(await joinPeer(TABLET, "not it")).toBe(false);
      expect(mockJoins).toEqual([]);
    });

    test("never joins a format lower than the best on the server, even with its right password", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z", { format: 3, secret: "the v3 password" });
      locked(OLD_PHONE, "2026-11-01T00:00:00Z", { format: 2, secret: "the v2 password" });

      expect(await joinPeer(TABLET, "the v2 password")).toBe(false);
      expect(mockJoins).toEqual([]);
    });

    test("when every file fails to be read it says so, it does not call the password wrong", async () => {
      locked(TABLET, "2026-10-01T00:00:00Z");
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");
      mockDownloadFails.add(TABLET);
      mockDownloadFails.add(OLD_PHONE);

      await expect(joinPeer(TABLET, SECRET_V3)).rejects.toThrow("none could be read");
    });

    test("a file that is only ghost in the listing does not block the real one", async () => {
      locked(OLD_PHONE, "2026-09-01T00:00:00Z");
      mockServer.set(TABLET, "e-ghost");
      mockModified.set(TABLET, Date.parse("2026-10-01T00:00:00Z"));
      mockDownloadFails.add(TABLET);

      expect(await joinPeer(TABLET, SECRET_V3)).toBe(true);
    });
  });
});

describe("a peer's file that this phone cannot open yet", () => {
  beforeEach(() => {
    mockCipher.format = 3;
    mockDownloadFails.clear();
  });

  test("a throw while opening is said now but not kept: the file is downloaded again at the next sync", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "throws" };
    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "unreadable",
    });
    const first = mockDownloads.filter((n) => n === TABLET).length;

    // Room is back: the same file, the same etag, opens.
    mockPeers[TABLET] = {
      open: "opened",
      format: 3,
      sealedBy: { installId: idOf(TABLET), counter: "3" },
      peerChanges: 2,
    };
    const second = await syncNow({ snapshotFirst: true });

    expect(mockDownloads.filter((n) => n === TABLET).length).toBe(first + 1);
    expect(states(second.peers)).toEqual({ [TABLET]: "ahead" });
  });

  test("while a file that opened and is not a backup stays kept: no download again", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = { open: "notEncrypted" };
    await syncNow({ snapshotFirst: true });
    const first = mockDownloads.filter((n) => n === TABLET).length;

    await syncNow({ snapshotFirst: true });

    expect(mockDownloads.filter((n) => n === TABLET).length).toBe(first);
  });

  test("a locked copy that says a count lower than the last read from that device is a copy put back", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = {
      open: "opened",
      format: 3,
      sealedBy: { installId: idOf(TABLET), counter: "9" },
    };
    await syncNow({ snapshotFirst: true });

    // The device changed its key twice since; an old file under a key this phone never held comes back, with a
    // fresh date on the server, which would make it look like a newer vault.
    mockServer.set(TABLET, "t2");
    mockModified.set(TABLET, Date.parse("2026-12-01T00:00:00Z"));
    mockPeers[TABLET] = {
      open: "needsSecret",
      format: 3,
      secret: "retired",
      claims: { installId: idOf(TABLET), counter: "4" },
    };
    mockFingerprint = "local-2"; // this device has news to send
    const result = await syncNow({ snapshotFirst: true });

    expect(states(result.peers)).toEqual({ [TABLET]: "replayed" });
    expect(result.uploaded).toBe(true); // nothing is held back for it
  });

  test("a locked file with a higher count, or one never read before, is still a vault to join", async () => {
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = {
      open: "opened",
      format: 3,
      sealedBy: { installId: idOf(TABLET), counter: "9" },
    };
    await syncNow({ snapshotFirst: true });
    newerOnServer(TABLET);
    newerOnServer(OLD_PHONE);
    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = {
      open: "needsSecret",
      format: 3,
      secret: "new",
      claims: { installId: idOf(TABLET), counter: "12" },
    };
    mockServer.set(OLD_PHONE, "o1");
    mockPeers[OLD_PHONE] = {
      open: "needsSecret",
      format: 3,
      secret: "x",
      claims: { installId: idOf(OLD_PHONE), counter: "1" },
    };

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
      [TABLET]: "locked",
      [OLD_PHONE]: "locked",
    });
  });
});

describe("a server that refuses the app password", () => {
  test("is said, and the account stays: that is how the hero is asked again", async () => {
    mockListingRefused = true;

    await expect(syncNow({ snapshotFirst: true })).rejects.toThrow("HTTP 401");

    expect(await syncAccount()).not.toBeNull();
    expect(await lostSync()).toBeNull();
    mockListingRefused = false;
    await expect(syncNow({ snapshotFirst: true })).resolves.toBeDefined();
  });
});

describe("error branches", () => {
  const TREE =
    "content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FSyncBati/";
  const LAST_MERGE = "bati.sync.lastMerge";

  describe("a folder kept in step by another app", () => {
    test("is connected from the uri it already holds, listed once, and remembered by its folder name", async () => {
      mockListings.length = 0;

      const account = await connectFolder(TREE);

      expect(account).toEqual({ kind: "folder", uri: TREE });
      expect(mockListings).toEqual(["folder"]);
      expect(await syncAccount()).toEqual(account);
      expect(mockPrefs.get("syncServer")).toBe("SyncBati");
    });

    test("is asked of the picker when no uri is given, and a hero who backs out connects nothing", async () => {
      const before = await syncAccount();
      mockPicked.uri = null;

      expect(await connectFolder()).toBeNull();
      expect(await syncAccount()).toEqual(before);

      mockPicked.uri = TREE;
      expect(await connectFolder()).toEqual({ kind: "folder", uri: TREE });
    });

    test("shows its path and no user, and its name as the label", () => {
      const account = { kind: "folder" as const, uri: TREE };

      expect(syncFolderOf(account)).toEqual({ folder: "Documents/SyncBati", user: "" });
      expect(accountLabel(account)).toBe("SyncBati");
    });

    test("has no stat: a file the listing leaves out is not looked for, where a server would", async () => {
      await connectFolder(TREE);
      mockServer.set(TABLET, "t1");
      mockPeers[TABLET] = { open: "opened", localChanges: 1 };
      expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({
        [TABLET]: "behind",
      });

      mockHidden.add(TABLET);
      mockServer.set(TABLET, "t2");

      expect((await syncNow({ snapshotFirst: true })).peers).toEqual([]);
    });
  });

  test("a file that claims to be an older one of ANOTHER device's file name is locked, not replayed", async () => {
    mockCipher.format = 3;
    mockServer.set(TABLET, "t1");
    mockPeers[TABLET] = {
      open: "opened",
      format: 3,
      sealedBy: { installId: idOf(TABLET), counter: "9" },
    };
    await syncNow({ snapshotFirst: true });
    // Newer than this device's own file, so it is the vault to join and not one that waits.
    newerOnServer(TABLET);
    mockServer.set(TABLET, "t2");
    mockPeers[TABLET] = {
      open: "needsSecret",
      format: 3,
      secret: "x",
      // A lower count than the 9 seen from the tablet, but said in another install's name.
      claims: { installId: idOf(OLD_PHONE), counter: "1" },
    };

    expect(states((await syncNow({ snapshotFirst: true })).peers)).toEqual({ [TABLET]: "locked" });
  });

  test("closing or dismissing the merge card when no merge was ever made writes nothing", async () => {
    await dismissMergeCard();
    await rememberMergeNotice("/settings");

    expect(mockSecure.has(LAST_MERGE)).toBe(false);
    expect(await lastMerge()).toBeNull();
    expect(await takeMergeNotice()).toBeNull();
  });

  test("a merge that changed nothing leaves no card and no notice, and still says merged", async () => {
    keepPlain(TABLET);
    mockMergeOutcome.sessions = 0;
    mockMergeOutcome.changes = 0;
    (jest.requireMock("@/db/merge").honourTombstones as jest.Mock).mockResolvedValueOnce(0);

    const outcome = await mergeWithPeer({ name: TABLET });

    expect(outcome).toEqual({ result: "merged", sessions: 0, changes: 0 });
    expect(await lastMerge()).toBeNull();
    expect(mockDeleted).toContain(`file:///db/${TABLET}.plain`);
  });

  test("a merge notice saved without a place to go back to sends the hero home", async () => {
    mockSecure.set(
      LAST_MERGE,
      JSON.stringify({
        at: 1,
        peer: TABLET,
        sessions: 4,
        changes: 4,
        kept: null,
        returnTo: null,
        told: false,
        seen: false,
      }),
    );

    expect(await takeMergeNotice()).toEqual({ sessions: 4, returnTo: "/" });
    expect(await takeMergeNotice()).toBeNull();
  });

  describe("joining", () => {
    const SECRET = "the vault's password";
    const lockedPeer = (name: string, modified: string) => {
      mockServer.set(name, `e-${name}`);
      mockModified.set(name, Date.parse(modified));
      mockPeers[name] = { open: "needsSecret", format: 3, secret: SECRET };
    };

    test("a phone with no vault of its own joins the best vault on the server", async () => {
      mockCipher.format = null;
      lockedPeer(TABLET, "2026-10-01T00:00:00Z");

      expect(await joinPeer(TABLET, SECRET)).toBe(true);
      expect(mockJoins).toEqual([true]);
    });

    test("a file that was readable a moment ago and is not any more is the join's failure, not a wrong password, and leaves no scratch file", async () => {
      mockCipher.format = 2;
      lockedPeer(TABLET, "2026-10-01T00:00:00Z");
      // Looked at once to learn the vaults, then gone when the join asks for it.
      mockDownloadFailsFrom.set(TABLET, 2);

      await expect(joinPeer(TABLET, SECRET)).rejects.toThrow("response has status: 403");

      expect(mockJoins).toEqual([]);
      expect(mockFiles.has(`file:///db/${TABLET}.sealed`)).toBe(false);
      expect(mockFiles.has(`file:///db/${TABLET}.plain`)).toBe(false);
      expect(jest.requireMock("@/src/reportError").reportError).toHaveBeenCalledWith(
        "sync.joinFile",
        expect.any(Error),
      );
    });
  });
});
