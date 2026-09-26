import { act, render, waitFor } from "@testing-library/react-native";

/**
 * The one place that decides to replace this device's history with another's, or to remember a
 * refusal. Asserted on what each answer *does* (which file is adopted, what copy is kept first,
 * what is remembered), not on the alert appearing, which is the navigation half.
 */

type Button = { text: string; onPress?: () => void };
const mockAlerts: { title: string; buttons: Button[] }[] = [];
jest.mock("react-native", () => {
  const rn = jest.requireActual("react-native");
  rn.Alert.alert = (title: string, _message: string, buttons: Button[]) => {
    mockAlerts.push({ title, buttons });
  };
  return rn;
});
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const mockToasts: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showSuccess: (m: string) => mockToasts.push(m), showError: () => {} }),
}));

const mockAdopted: { uri: string; before: () => Promise<void> }[] = [];
jest.mock("@/hooks/useBackup", () => ({
  useBackup: () => ({
    runAdopt: (plain: { uri: string }, before: () => Promise<void>) =>
      mockAdopted.push({ uri: plain.uri, before }),
  }),
}));
jest.mock("@/src/backupFiles", () => ({
  peerScratch: (name: string, kind: string) => ({ uri: `file:///db/${name}.${kind}` }),
}));

const mockRemembered: string[] = [];
let mockJoinOpens = false;
/** What merging answers; "cannot" (another build) keeps the old question in play. */
let mockMerge: { result: "cannot" } | { result: "merged"; sessions: number; changes: number } = {
  result: "cannot",
};
/** What the last merge left for after its reload: sessions, and where the hero was. */
let mockNotice: { sessions: number; returnTo: string } | null = null;
let mockSessions = 0;
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  router: { push: (href: string) => mockPush(href) },
  usePathname: () => "/settings",
}));
const mockReload = jest.fn((_reason: string) => Promise.resolve());
jest.mock("expo", () => ({
  ...jest.requireActual("expo"),
  reloadAppAsync: (reason: string) => mockReload(reason),
}));
const mockKeepCopy = jest.fn(() => Promise.resolve());
jest.mock("@/src/deviceSync", () => ({
  rememberUnreadable: () => Promise.resolve(),
  mergeWithPeer: () => Promise.resolve(mockMerge),
  rememberMergeNotice: (returnTo: string) =>
    Promise.resolve().then(() => {
      mockNotice = { sessions: mockSessions, returnTo };
    }),
  takeMergeNotice: () =>
    Promise.resolve().then(() => {
      const n = mockNotice;
      mockNotice = null;
      return n;
    }),
  rememberAnswer: (peer: { name: string; comparison: { fingerprint: string } }) =>
    Promise.resolve().then(() => {
      mockRemembered.push(`${peer.name}@${peer.comparison.fingerprint}`);
    }),
  keepThisDeviceOnServer: () => mockKeepCopy(),
  joinPeer: () => Promise.resolve(mockJoinOpens),
}));

// The secret sheet stands in as a probe: its props are what the prompt asked of it.
let mockSheet: { open: boolean; wrong: boolean; submit: (secret: string) => void } | null = null;
jest.mock("@/components/settings/BackupSecretSheet", () => ({
  BackupSecretSheet: (props: {
    request: { open: boolean; wrong: boolean };
    onSubmit: (s: string) => void;
  }) => {
    mockSheet = { ...props.request, submit: props.onSubmit };
    return null;
  },
}));

// The real session store opens the database; the prompt only reads its status.
jest.mock("@/stores/session", () => {
  const { create } = jest.requireActual("zustand");
  return { useSessionStore: create(() => ({ status: "idle" })) };
});

import { SyncPrompt } from "@/components/SyncPrompt";
import type { Peer } from "@/src/deviceSync";
import { useSessionStore } from "@/stores/session";
import { useSyncStore } from "@/stores/sync";

/** A device with sessions of its own (5), unless `localSessions` says it is a new one. */
const comparison = (peer: number, local: number, fingerprint: string, localSessions = 5) => ({
  peerOnly: peer,
  localOnly: local,
  peerChanges: peer,
  localChanges: local,
  peerLatest: null,
  peerVillage: "Hautecombe",
  localSessions,
  fingerprint,
});
const syncFound = (...peers: Peer[]) =>
  act(() => useSyncStore.setState({ result: { uploaded: true, peers } }));
const press = (text: string) =>
  mockAlerts
    .at(-1)
    ?.buttons.find((b) => b.text === text)
    ?.onPress?.();

const run = jest.fn(() => Promise.resolve());

beforeEach(() => {
  mockAlerts.length = 0;
  mockAdopted.length = 0;
  mockRemembered.length = 0;
  mockToasts.length = 0;
  mockKeepCopy.mockClear();
  mockReload.mockClear();
  mockMerge = { result: "cannot" };
  mockNotice = null;
  run.mockClear();
  mockJoinOpens = false;
  mockSheet = null;
  useSyncStore.setState({ result: null, offered: [], run });
  useSessionStore.setState({ status: "idle" });
});

test("ahead: taking its version adopts that device's file, with nothing to keep first", async () => {
  await render(<SyncPrompt />);
  await syncFound({
    name: "bati-tab.batb",
    etag: "e",
    state: "ahead",
    comparison: comparison(2, 0, "f1"),
  });

  await waitFor(() => expect(mockAlerts.map((a) => a.title)).toEqual(["sync.aheadTitle"]));
  press("sync.take");
  expect(mockAdopted.map((a) => a.uri)).toEqual(["file:///db/bati-tab.batb.plain"]);
  await mockAdopted[0]?.before();
  expect(mockKeepCopy).not.toHaveBeenCalled();
  // "Later" on a hand-off is not a refusal: nothing is remembered.
  expect(mockRemembered).toEqual([]);
});

test("diverged: keep remembers this state; take first sends this device's copy away", async () => {
  await render(<SyncPrompt />);
  const peer: Peer = {
    name: "bati-tab.batb",
    etag: "e",
    state: "diverged",
    comparison: comparison(1, 3, "f1"),
  };
  await syncFound(peer);

  await waitFor(() => expect(mockAlerts).toHaveLength(1));
  press("sync.keep");
  await waitFor(() => expect(mockRemembered).toEqual(["bati-tab.batb@f1"]));

  press("sync.take");
  await mockAdopted[0]?.before();
  expect(mockKeepCopy).toHaveBeenCalledTimes(1);
});

test("a device that can be merged is merged, not asked, and the app reloads to read it", async () => {
  mockMerge = { result: "merged", sessions: 3, changes: 4 };
  mockSessions = 3;
  await render(<SyncPrompt />);
  await syncFound({
    name: "bati-tab.batb",
    etag: "e",
    state: "diverged",
    comparison: comparison(3, 2, "f1"),
  });

  await waitFor(() => expect(mockReload).toHaveBeenCalledWith("merge"));
  expect(mockAlerts).toEqual([]);
  expect(mockAdopted).toEqual([]);
  // Said after the reload, which then takes the hero back to where they were.
  expect(mockNotice).toEqual({ sessions: 3, returnTo: "/settings" });
});

test("a new device is shown whose hero it found before taking it", async () => {
  mockMerge = { result: "merged", sessions: 16, changes: 16 };
  mockSessions = 16;
  await render(<SyncPrompt />);
  await syncFound({
    name: "bati-phone.batb",
    etag: "e",
    state: "ahead",
    comparison: comparison(16, 0, "f1", 0),
  });

  await waitFor(() => expect(mockAlerts.map((a) => a.title)).toEqual(["sync.found.title"]));
  expect(mockReload).not.toHaveBeenCalled();
  await act(async () => press("sync.found.mine"));
  await waitFor(() => expect(mockReload).toHaveBeenCalledWith("merge"));
});

test("'not mine' on a new device takes nothing and asks no more about that state", async () => {
  await render(<SyncPrompt />);
  await syncFound({
    name: "bati-stranger.batb",
    etag: "e",
    state: "ahead",
    comparison: comparison(3, 0, "f9", 0),
  });
  await waitFor(() => expect(mockAlerts).toHaveLength(1));
  await act(async () => press("sync.found.notMine"));
  await waitFor(() => expect(mockRemembered).toEqual(["bati-stranger.batb@f9"]));
  expect(mockReload).not.toHaveBeenCalled();
});

test("a merge that changed nothing does not reload", async () => {
  mockMerge = { result: "merged", sessions: 0, changes: 0 };
  await render(<SyncPrompt />);
  await syncFound({
    name: "bati-tab.batb",
    etag: "e",
    state: "ahead",
    comparison: comparison(1, 0, "f1"),
  });
  await act(async () => {});
  expect(mockReload).not.toHaveBeenCalled();
  expect(mockAlerts).toEqual([]);
});

test("after a merge's reload, the hero is told what arrived, once", async () => {
  mockNotice = { sessions: 2, returnTo: "/settings" };
  await render(<SyncPrompt />);
  await waitFor(() => expect(mockToasts).toEqual(["sync.merged"]));
  expect(mockNotice).toBeNull();
  expect(mockPush).toHaveBeenCalledWith("/settings");
});

test("never during a session, and once per state", async () => {
  await act(async () => useSessionStore.setState({ status: "running" }));
  await render(<SyncPrompt />);
  const peer: Peer = {
    name: "bati-tab.batb",
    etag: "e",
    state: "ahead",
    comparison: comparison(1, 0, "f1"),
  };
  await syncFound(peer);
  expect(mockAlerts).toEqual([]);

  await act(async () => useSessionStore.setState({ status: "idle" }));
  await waitFor(() => expect(mockAlerts).toHaveLength(1));
  await act(async () => press("sync.later"));

  // The same state from a later sync is not offered again in this process.
  await syncFound({ ...peer, etag: "e2" });
  expect(mockAlerts).toHaveLength(1);
  await syncFound({ ...peer, comparison: comparison(2, 0, "f2") });
  expect(mockAlerts).toHaveLength(2);
});

test("locked: the other device's password is asked for, retried, and joined", async () => {
  await render(<SyncPrompt />);
  await syncFound({ name: "bati-tab.batb", etag: "e", state: "locked" });

  expect(mockAlerts.map((a) => a.title)).toEqual(["sync.lockedTitle"]);
  await act(async () => press("sync.lockedCta"));
  expect(mockSheet?.open).toBe(true);

  await act(async () => mockSheet?.submit("typo"));
  await waitFor(() => expect(mockSheet?.wrong).toBe(true));

  mockJoinOpens = true;
  await act(async () => mockSheet?.submit("tablet password"));
  await waitFor(() => expect(mockSheet?.open).toBe(false));
  expect(mockToasts).toEqual(["sync.joined"]);
  // A fresh snapshot: the one sealed at launch is under the key this phone just left.
  expect(run).toHaveBeenCalledWith({ snapshotFirst: true });
});

test("one question at a time: the next device waits for an answer to the first", async () => {
  await render(<SyncPrompt />);
  await act(async () =>
    useSyncStore.setState({
      result: {
        uploaded: false,
        peers: [
          { name: "bati-a.batb", etag: "a", state: "ahead", comparison: comparison(1, 0, "fa") },
          { name: "bati-b.batb", etag: "b", state: "unreadable" },
        ],
      },
    }),
  );
  await waitFor(() => expect(mockAlerts).toHaveLength(1));
  expect(mockAlerts[0]?.title).toBe("sync.aheadTitle");

  await act(async () => press("sync.later"));
  // Said once, most often a newer Bati on that device.
  await waitFor(() => expect(mockAlerts.map((a) => a.title)).toContain("sync.unreadableTitle"));
  expect(mockAlerts).toHaveLength(2);
});
