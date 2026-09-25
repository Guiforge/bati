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

const mockSecure = new Map<string, string>();
const mockServer = new Map<string, string>();
const mockUploads: string[] = [];
const mockListings: string[] = [];
const mockCipher = { status: "on" };
let mockFingerprint = "local-1";
let mockListingFails = false;
/** Per remote file: size, what opening it says, the secret that opens it, how it compares. */
const mockPeers: Record<
  string,
  {
    size?: number;
    open?: "opened" | "needsSecret";
    secret?: string;
    valid?: boolean;
    peerChanges?: number;
    localChanges?: number;
    fingerprint?: string;
  }
> = {};
const mockJoins: boolean[] = [];

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

jest.mock("@/src/cloudSync", () => ({
  ...jest.requireActual("@/src/cloudSync"),
  loginToNextcloud: () =>
    Promise.resolve({ server: "https://cloud.test", loginName: "hero", appPassword: "app" }),
  listRemote: (target: { folderUrl: string }) =>
    Promise.resolve().then(() => {
      mockListings.push(target.folderUrl);
      if (mockListingFails) throw new Error("HTTP 401");
      return [...mockServer].map(([name, etag]) => ({ name, etag }));
    }),
  uploadRemote: (_target: unknown, _file: unknown, name: string) =>
    Promise.resolve().then(() => {
      mockUploads.push(name);
      mockServer.set(name, `etag-${mockUploads.length}`);
    }),
  downloadRemote: () => Promise.resolve(),
}));

// Scratch files carry the remote name they were made for, which is how the cipher double knows
// which peer it is opening; `size` is that peer's.
jest.mock("@/src/backupFiles", () => {
  const scratch = (name: string, kind: string) => ({
    uri: `file:///db/${name}.${kind}`,
    exists: true,
    size: mockPeers[name]?.size ?? 1000,
    delete: () => {},
  });
  return {
    writeSyncSnapshot: () => Promise.resolve(scratch("own", "out")),
    pendingSyncSnapshot: () => null,
    peerScratch: scratch,
    clearPeerScratch: jest.fn(),
  };
});

const peerOf = (uri: string) => /\/db\/(.+)\.(?:sealed|plain)$/.exec(uri)?.[1] ?? "";

jest.mock("@/src/backupCipher", () => ({
  MAX_SEALED_BYTES: 5000,
  encryptionStatus: () => Promise.resolve(mockCipher.status),
  openBackup: (sealedUri: string, _plain: string, secret?: string) => {
    const peer = mockPeers[peerOf(sealedUri)];
    if (peer?.open === "opened") return Promise.resolve({ result: "opened" });
    if (secret === undefined) return Promise.resolve({ result: "needsSecret" });
    if (secret !== peer?.secret) return Promise.resolve({ result: "wrongSecret" });
    return Promise.resolve({
      result: "opened",
      join: ({ asPrimary }: { asPrimary: boolean }) =>
        Promise.resolve().then(() => {
          mockJoins.push(asPrimary);
        }),
    });
  },
}));

jest.mock("@/db/backup", () => ({
  stateFingerprint: () => Promise.resolve(mockFingerprint),
  validateBackup: (path: string) =>
    Promise.resolve(
      mockPeers[peerOf(path)]?.valid === false
        ? { ok: false, reason: "incompatibleVersion" }
        : { ok: true },
    ),
  compareWithPeer: (path: string) => {
    const peer = mockPeers[peerOf(path)];
    return Promise.resolve({
      peerOnly: peer?.peerChanges ?? 0,
      localOnly: peer?.localChanges ?? 0,
      peerChanges: peer?.peerChanges ?? 0,
      localChanges: peer?.localChanges ?? 0,
      peerLatest: null,
      fingerprint: peer?.fingerprint ?? "peer-1",
    });
  },
}));

jest.mock("@/src/reportError", () => ({ reportError: () => {} }));

import { InsecureAddressError } from "@/src/cloudSync";
import {
  accountLabel,
  connectNextcloud,
  connectWebDav,
  disconnectSync,
  joinPeer,
  keepThisDeviceOnServer,
  rememberAnswer,
  serverState,
  syncAccount,
  syncNow,
} from "@/src/deviceSync";

const TABLET = "bati-0190a000-0000-7000-8000-00000000000a.batb";
const OLD_PHONE = "bati-0190a000-0000-7000-8000-00000000000b.batb";
const WORK_PHONE = "bati-0190a000-0000-7000-8000-00000000000c.batb";
const states = (peers: { name: string; state: string }[]) =>
  Object.fromEntries(peers.map((p) => [p.name, p.state]));

beforeEach(async () => {
  mockSecure.clear();
  mockServer.clear();
  mockUploads.length = 0;
  mockListings.length = 0;
  mockJoins.length = 0;
  mockCipher.status = "on";
  mockFingerprint = "local-1";
  mockListingFails = false;
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
  expect(mockUploads[0]).toMatch(/^bati-[0-9a-f-]{36}-kept-\d{8}T\d{4}\.batb$/);
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
