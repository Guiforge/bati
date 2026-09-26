import { act, renderHook, waitFor } from "@testing-library/react-native";

/**
 * The two Settings hooks over encrypted backups and device sync. Their job is the part a hero
 * sees: the status a row shows, the next step after a server accepted them, and the one toast
 * each action ends with. The cipher and the sync engine are tested on their own; here the engine's
 * outward calls answer from a table, and everything pure in it (labels, errors) is the real code.
 */

const mockToasts: string[] = [];
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: (message: string) => mockToasts.push(`error:${message}`),
    showSuccess: (message: string) => mockToasts.push(`success:${message}`),
  }),
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
const mockReported: string[] = [];
jest.mock("@/src/reportError", () => ({
  reportError: (context: string) => mockReported.push(context),
}));

const mockCipher = { status: "off", fail: false, recovery: null as string | null };
const failOr = <T>(value: T) =>
  mockCipher.fail ? Promise.reject(new Error("keystore")) : Promise.resolve(value);
jest.mock("@/src/backupCipher", () => ({
  MAX_SEALED_BYTES: 1000,
  encryptionStatus: () => Promise.resolve(mockCipher.status),
  enableEncryption: () => failOr("abcd efgh"),
  changePassword: () => failOr("ijkl mnop"),
  disableEncryption: () => failOr(undefined),
  readRecoveryKey: () =>
    mockCipher.recovery === null
      ? Promise.reject(new Error("dismissed"))
      : Promise.resolve(mockCipher.recovery),
  canShowRecoveryKeyAgain: () => true,
  openBackup: () => Promise.resolve({ result: "notEncrypted" }),
}));
jest.mock("@/db/backup", () => ({}));
jest.mock("@/db/merge", () => ({}));
jest.mock("@/db/preferences", () => ({
  getPreference: () => Promise.resolve(null),
  setPreference: () => Promise.resolve(),
  deletePreference: () => Promise.resolve(),
}));
jest.mock("@/src/backupFiles", () => ({}));
jest.mock("@/modules/bati-crypto", () => ({ batiCrypto: () => ({}) }));

const ACCOUNT = { server: "https://cloud.test", loginName: "hero", appPassword: "app" };
const mockSync = {
  account: null as ({ kind: "nextcloud" } & typeof ACCOUNT) | null,
  connect: true,
  runFails: false,
  davRefuses: null as "auth" | "down" | "insecure" | null,
  server: { kind: "empty" } as { kind: string; peer?: string },
  joins: true,
  /** The server sync was on with before it vanished, or `null` (see `lostSync`). */
  lost: null as string | null,
  wifiOnly: false,
};
const mockNetwork = { type: "CELLULAR" };
jest.mock("expo-network", () => ({
  NetworkStateType: { WIFI: "WIFI", ETHERNET: "ETHERNET", CELLULAR: "CELLULAR" },
  getNetworkStateAsync: () => Promise.resolve({ type: mockNetwork.type }),
}));
jest.mock("@/src/deviceSync", () => {
  const actual = jest.requireActual("@/src/deviceSync");
  const { DavAuthError, InsecureAddressError } = jest.requireActual("@/src/cloudSync");
  return {
    accountLabel: actual.accountLabel,
    syncAccount: () => Promise.resolve(mockSync.account),
    connectNextcloud: () =>
      mockSync.connect
        ? Promise.resolve({ kind: "nextcloud", ...ACCOUNT })
        : Promise.reject(new Error("unreachable")),
    connectWebDav: (url: string, user: string, password: string, label?: string) => {
      if (mockSync.davRefuses === "auth") return Promise.reject(new DavAuthError("HTTP 401"));
      if (mockSync.davRefuses === "insecure") return Promise.reject(new InsecureAddressError());
      if (mockSync.davRefuses === "down") return Promise.reject(new Error("HTTP 502"));
      return Promise.resolve({ kind: "webdav", url, user, password, label });
    },
    serverState: () => Promise.resolve(mockSync.server),
    joinPeer: () => Promise.resolve(mockSync.joins),
    disconnectSync: () => Promise.resolve(),
    lostSync: () => Promise.resolve(mockSync.lost),
    syncWifiOnly: () => Promise.resolve(mockSync.wifiOnly),
    recordSyncOutcome: (failure: unknown) =>
      Promise.resolve({
        lastSuccessAt: failure === null ? Date.now() : null,
        failure,
        failingSince: null,
      }),
    syncNow: () =>
      mockSync.runFails
        ? Promise.reject(new Error("Network request failed"))
        : Promise.resolve({ uploaded: true, peers: [] }),
  };
});

import { useBackupEncryption } from "@/hooks/useBackupEncryption";
import { useDeviceSync } from "@/hooks/useDeviceSync";
import { useSyncStore } from "@/stores/sync";

beforeEach(() => {
  mockToasts.length = 0;
  mockReported.length = 0;
  Object.assign(mockCipher, { status: "off", fail: false, recovery: null });
  Object.assign(mockSync, {
    account: null,
    lost: null,
    wifiOnly: false,
    connect: true,
    runFails: false,
    davRefuses: null,
    server: { kind: "empty" },
    joins: true,
  });
  useSyncStore.setState({
    running: false,
    result: null,
    failure: null,
    waitingWifi: false,
    lastSyncAt: null,
  });
});

describe("useBackupEncryption", () => {
  test("turning it on returns the recovery key to show and flips the row", async () => {
    const { result } = await renderHook(() => useBackupEncryption());

    let shown: string | null = null;
    await act(async () => {
      shown = await result.current.enable("correct horse");
    });

    expect(shown).toBe("abcd efgh");
    expect(result.current.status).toBe("on");
  });

  test("a setup that fails says so and shows no key", async () => {
    mockCipher.fail = true;
    const { result } = await renderHook(() => useBackupEncryption());

    let shown: string | null = "unchanged";
    await act(async () => {
      shown = await result.current.enable("correct horse");
    });

    expect(shown).toBeNull();
    expect(mockToasts).toEqual(["error:backup.encryptionFailed"]);
    expect(result.current.status).toBe("off");
  });

  test("a new password comes back with its new recovery key", async () => {
    mockCipher.status = "on";
    const { result } = await renderHook(() => useBackupEncryption());

    let shown: string | null = null;
    await act(async () => {
      shown = await result.current.change("new password");
    });
    await act(() => result.current.disable());

    expect(shown).toBe("ijkl mnop");
    expect(mockToasts).toEqual(["success:backup.encryptionOffDone"]);
    expect(result.current.status).toBe("off");
  });

  test("a phone whose key did not follow reads as locked", async () => {
    mockCipher.status = "locked";
    const { result } = await renderHook(() => useBackupEncryption());
    await waitFor(() => expect(result.current.status).toBe("locked"));
  });

  test("a dismissed fingerprint shows nothing and is not an error toast", async () => {
    const { result } = await renderHook(() => useBackupEncryption());

    let recovery: string | null = "unchanged";
    await act(async () => {
      recovery = await result.current.recovery();
    });

    expect(recovery).toBeNull();
    expect(mockToasts).toEqual([]);
    expect(mockReported).toEqual(["backup.encryption.recovery"]);
  });
});

describe("useDeviceSync", () => {
  test("an empty server with encryption on: connected, synced, named on the row", async () => {
    mockCipher.status = "on";
    const { result } = await renderHook(() => useDeviceSync());
    expect(result.current.rowValue).toBe("sync.off");

    let next: unknown;
    await act(async () => {
      next = await result.current.connect("cloud.test");
    });

    expect(next).toEqual({ next: "done" });
    expect(result.current.rowValue).toBe("cloud.test");
    expect(mockToasts).toEqual(["success:sync.connected"]);
  });

  test("an empty server with encryption off waits for encryption before any sync", async () => {
    const { result } = await renderHook(() => useDeviceSync());
    let next: unknown;
    await act(async () => {
      next = await result.current.connect("cloud.test");
    });
    expect(next).toEqual({ next: "encrypt" });
    expect(mockToasts).toEqual([]);
  });

  test("a server that already holds another device's vault asks to join it", async () => {
    mockSync.server = { kind: "needsSecret", peer: "bati-tablet.batb" };
    const { result } = await renderHook(() => useDeviceSync());

    let next: unknown;
    await act(async () => {
      next = await result.current.connect("cloud.test");
    });
    expect(next).toEqual({ next: "join", peer: "bati-tablet.batb" });

    mockSync.joins = false;
    let joined: boolean | undefined;
    await act(async () => {
      joined = await result.current.join("bati-tablet.batb", "typo");
    });
    expect(joined).toBe(false);

    mockSync.joins = true;
    await act(async () => {
      joined = await result.current.join("bati-tablet.batb", "tablet password");
    });
    expect(joined).toBe(true);
    expect(mockToasts).toEqual(["success:sync.joined"]);
  });

  test("a server that cannot be reached says so and stays off", async () => {
    mockSync.connect = false;
    const { result } = await renderHook(() => useDeviceSync());

    await act(async () => {
      await result.current.connect("nowhere.test");
    });

    expect(result.current.account).toBeNull();
    expect(mockToasts).toEqual(["error:sync.connectFailed"]);
  });

  test("WebDAV: refused credentials, plain http and a dead server each say their own thing", async () => {
    mockCipher.status = "on";
    const { result } = await renderHook(() => useDeviceSync());

    for (const refusal of ["auth", "insecure", "down", null] as const) {
      mockSync.davRefuses = refusal;
      await act(async () => {
        await result.current.connectDav("https://dav.test/", "hero", "p", "Koofr");
      });
    }

    expect(mockToasts).toEqual([
      "error:sync.webdavAuthFailed",
      "error:sync.webdavInsecure",
      "error:sync.webdavFailed",
      "success:sync.connected",
    ]);
    expect(result.current.rowValue).toBe("Koofr");
  });

  test("a manual sync that cannot reach the server says so; one that can says done", async () => {
    mockSync.account = { kind: "nextcloud", ...ACCOUNT };
    const { result } = await renderHook(() => useDeviceSync());

    mockSync.runFails = true;
    await act(() => result.current.syncNow());
    mockSync.runFails = false;
    await act(() => result.current.syncNow());

    // By layer: "offline" says the network, not a vague "could not reach".
    expect(mockToasts).toEqual(["error:sync.failure.offline", "success:sync.done"]);
    expect(result.current.lastSyncAt).not.toBeNull();
  });

  test("stopping forgets the account on this device", async () => {
    mockSync.account = { kind: "nextcloud", ...ACCOUNT };
    const { result } = await renderHook(() => useDeviceSync());
    await waitFor(() => expect(result.current.account).not.toBeNull());

    await act(() => result.current.disconnect());

    expect(result.current.account).toBeNull();
    expect(mockToasts).toEqual(["success:sync.disconnected"]);
  });
});

describe("the sync store", () => {
  test("claims the launch sync once per process", () => {
    useSyncStore.setState({ launchClaimed: false });
    expect(useSyncStore.getState().claimLaunch()).toBe(true);
    expect(useSyncStore.getState().claimLaunch()).toBe(false);
  });

  test("a device that never connected runs nothing and reports nothing", async () => {
    await useSyncStore.getState().run({ snapshotFirst: false });
    expect(useSyncStore.getState()).toMatchObject({ failure: null, result: null });
    expect(mockReported).toEqual([]);
  });

  test("set to Wi-Fi only, a launch on mobile data waits, and the hero's own tap does not", async () => {
    mockSync.account = { kind: "nextcloud", ...ACCOUNT };
    mockSync.wifiOnly = true;
    mockNetwork.type = "CELLULAR";

    await useSyncStore.getState().run({ snapshotFirst: false });
    expect(useSyncStore.getState()).toMatchObject({ waitingWifi: true, result: null });

    await useSyncStore.getState().run({ snapshotFirst: true, force: true });
    expect(useSyncStore.getState()).toMatchObject({
      waitingWifi: false,
      result: { uploaded: true, peers: [] },
    });
  });

  test("a sync that stopped without the hero asking says so on its row", async () => {
    mockSync.lost = "cloud.test";
    const { result } = await renderHook(() => useDeviceSync());
    await waitFor(() => expect(result.current.rowValue).toBe("sync.rowStopped"));
  });

  test("a run already in flight is not started twice, and a failure keeps the last result", async () => {
    mockSync.account = { kind: "nextcloud", ...ACCOUNT };
    const previous = { uploaded: true, peers: [] };
    useSyncStore.setState({ result: previous });
    mockSync.runFails = true;

    const first = useSyncStore.getState().run({ snapshotFirst: false });
    const second = useSyncStore.getState().run({ snapshotFirst: false });
    await Promise.all([first, second]);

    expect(mockReported).toEqual(["sync.run"]);
    expect(useSyncStore.getState()).toMatchObject({
      failure: { kind: "offline" },
      running: false,
      result: previous,
    });
  });

  test("an offer is remembered for the process", () => {
    useSyncStore.setState({ offered: [] });
    useSyncStore.getState().markOffered("bati-x.batb@e1");
    expect(useSyncStore.getState().offered).toEqual(["bati-x.batb@e1"]);
  });
});
