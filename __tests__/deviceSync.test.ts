/**
 * The orchestration of device sync, with its three neighbours doubled at their edges: the server
 * is a Map of name → etag (src/cloudSync.ts is tested on a real Nextcloud answer in its own file),
 * the cipher and the comparison answer per file from a table, and SecureStore is a Map. What is
 * under test is what only this module decides: which files it reads, what it concludes from each,
 * what it refuses, and what it never asks twice.
 */

const mockSecure = new Map<string, string>();
const mockServer = new Map<string, string>();
const mockUploads: string[] = [];
const mockCipher = { status: "on" };
/** Per remote file: what opening it says, and how it compares once open. */
const mockPeers: Record<
  string,
  { open: string; valid?: boolean; peerOnly?: number; localOnly?: number }
> = {};

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
  loginToNextcloud: () =>
    Promise.resolve({ server: "https://cloud.test", loginName: "hero", appPassword: "app" }),
  listRemote: () => Promise.resolve([...mockServer].map(([name, etag]) => ({ name, etag }))),
  uploadRemote: (_account: unknown, _file: unknown, name: string) =>
    Promise.resolve().then(() => {
      mockUploads.push(name);
      mockServer.set(name, `etag-${mockUploads.length}`);
    }),
  // The downloaded file carries its remote name, so the cipher double knows which one it opens.
  downloadRemote: (_account: unknown, name: string, destination: { uri: string }) =>
    Promise.resolve().then(() => {
      mockDownloads.set(destination.uri, name);
    }),
}));
const mockDownloads = new Map<string, string>();

jest.mock("@/src/backupFiles", () => {
  const file = (uri: string) => ({ uri, exists: true, delete: () => {} });
  return {
    writeSyncSnapshot: () => Promise.resolve(file("file:///db/bati-sync-out.batb")),
    pendingSyncSnapshot: () => null,
    peerScratch: (index: number, kind: string) => file(`file:///db/peer-${index}.${kind}`),
    clearPeerScratch: () => {},
  };
});

jest.mock("@/src/backupCipher", () => ({
  encryptionStatus: () => Promise.resolve(mockCipher.status),
  openBackup: (sealedUri: string, plainUri: string) => {
    const name = mockDownloads.get(sealedUri) ?? "";
    mockOpened.set(plainUri.replace("file://", ""), name);
    return Promise.resolve(mockPeers[name]?.open ?? "notEncrypted");
  },
}));
const mockOpened = new Map<string, string>();

jest.mock("@/db/backup", () => ({
  validateBackup: (path: string) =>
    Promise.resolve(
      mockPeers[mockOpened.get(path) ?? ""]?.valid === false
        ? { ok: false, reason: "incompatibleVersion" }
        : { ok: true },
    ),
  compareWithPeer: (path: string) => {
    const peer = mockPeers[mockOpened.get(path) ?? ""];
    return Promise.resolve({
      peerOnly: peer?.peerOnly ?? 0,
      localOnly: peer?.localOnly ?? 0,
      peerLatest: null,
    });
  },
}));

jest.mock("@/src/reportError", () => ({ reportError: () => {} }));

import { connectNextcloud, rememberAnswer, syncNow } from "@/src/deviceSync";

const TABLET = "bati-0190a000-0000-7000-8000-00000000000a.batb";
const OLD_PHONE = "bati-0190a000-0000-7000-8000-00000000000b.batb";
const WORK_PHONE = "bati-0190a000-0000-7000-8000-00000000000c.batb";

beforeEach(async () => {
  mockSecure.clear();
  mockServer.clear();
  mockUploads.length = 0;
  mockCipher.status = "on";
  for (const key of Object.keys(mockPeers)) delete mockPeers[key];
  await connectNextcloud("cloud.test", () => false);
});

test("refuses to run with encryption off, so nothing plain ever reaches the server", async () => {
  mockCipher.status = "off";
  await expect(syncNow({ snapshotFirst: true })).rejects.toThrow("Sync needs encryption on");
  expect(mockUploads).toEqual([]);
});

test("uploads under one stable name per install, and never reads its own file back", async () => {
  await syncNow({ snapshotFirst: true });
  await syncNow({ snapshotFirst: true });

  expect(mockUploads).toHaveLength(2);
  expect(new Set(mockUploads).size).toBe(1);
  expect(mockUploads[0]).toMatch(/^bati-[0-9a-f-]{36}\.batb$/);
  expect((await syncNow({ snapshotFirst: false })).peers).toEqual([]);
});

test("says how each other device stands, and ignores files that are not a device's", async () => {
  mockServer.set(TABLET, "t1");
  mockServer.set(OLD_PHONE, "o1");
  mockServer.set(WORK_PHONE, "w1");
  mockServer.set("notes.txt", "n1");
  mockServer.set("bati-export-v3-2026-09-25.batb", "e1");
  mockPeers[TABLET] = { open: "opened", peerOnly: 2, localOnly: 0 };
  mockPeers[OLD_PHONE] = { open: "opened", peerOnly: 0, localOnly: 5 };
  mockPeers[WORK_PHONE] = { open: "opened", peerOnly: 1, localOnly: 1 };

  const { peers } = await syncNow({ snapshotFirst: false });
  const states = Object.fromEntries(peers.map((p) => [p.name, p.state]));

  expect(states).toEqual({ [TABLET]: "ahead", [OLD_PHONE]: "behind", [WORK_PHONE]: "diverged" });
});

test("a device sealed with another key is locked, one from a newer app is unreadable", async () => {
  mockServer.set(TABLET, "t1");
  mockServer.set(OLD_PHONE, "o1");
  mockPeers[TABLET] = { open: "needsSecret" };
  mockPeers[OLD_PHONE] = { open: "opened", valid: false };

  const { peers } = await syncNow({ snapshotFirst: false });
  const states = Object.fromEntries(peers.map((p) => [p.name, p.state]));

  expect(states).toEqual({ [TABLET]: "locked", [OLD_PHONE]: "unreadable" });
});

test("an answer is not asked again until that device writes something new", async () => {
  mockServer.set(TABLET, "t1");
  mockPeers[TABLET] = { open: "opened", peerOnly: 1, localOnly: 1 };

  await rememberAnswer({ name: TABLET, etag: "t1" });
  expect((await syncNow({ snapshotFirst: false })).peers[0]?.state).toBe("level");

  mockServer.set(TABLET, "t2");
  expect((await syncNow({ snapshotFirst: false })).peers[0]?.state).toBe("diverged");
});
