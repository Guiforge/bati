import { act, renderHook, waitFor } from "@testing-library/react-native";

/**
 * The two Settings hooks over encrypted backups and device sync. Their job is the part a hero
 * sees: the status a row shows, and the one toast each action ends with, success or failure.
 * The cipher and the sync engine are tested on their own, so here they only answer.
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
  encryptionStatus: () => Promise.resolve(mockCipher.status),
  enableEncryption: () => failOr("abcd efgh"),
  changePassword: () => failOr(undefined),
  disableEncryption: () => failOr(undefined),
  readRecoveryKey: () =>
    mockCipher.recovery === null
      ? Promise.reject(new Error("dismissed"))
      : Promise.resolve(mockCipher.recovery),
  canShowRecoveryKeyAgain: () => true,
}));

const ACCOUNT = { server: "https://cloud.test", loginName: "hero", appPassword: "app" };
const mockSync = { account: null as typeof ACCOUNT | null, connect: true, runFails: false };
jest.mock("@/src/deviceSync", () => ({
  syncAccount: () => Promise.resolve(mockSync.account),
  connectNextcloud: () =>
    mockSync.connect ? Promise.resolve(ACCOUNT) : Promise.reject(new Error("unreachable")),
  disconnectSync: () => Promise.resolve(),
  syncNow: () =>
    mockSync.runFails
      ? Promise.reject(new Error("offline"))
      : Promise.resolve({ uploaded: true, peers: [] }),
}));

import { useBackupEncryption } from "@/hooks/useBackupEncryption";
import { syncHostLabel, useDeviceSync } from "@/hooks/useDeviceSync";
import { useSyncStore } from "@/stores/sync";

beforeEach(() => {
  mockToasts.length = 0;
  mockReported.length = 0;
  Object.assign(mockCipher, { status: "off", fail: false, recovery: null });
  Object.assign(mockSync, { account: null, connect: true, runFails: false });
  useSyncStore.setState({ running: false, result: null, failed: false });
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

  test("changing the password and turning it off each end on their own toast", async () => {
    mockCipher.status = "on";
    const { result } = await renderHook(() => useBackupEncryption());
    await waitFor(() => expect(result.current.status).toBe("on"));

    await act(() => result.current.change("new password"));
    await act(() => result.current.disable());

    expect(mockToasts).toEqual([
      "success:backup.passwordChanged",
      "success:backup.encryptionOffDone",
    ]);
    expect(result.current.status).toBe("off");
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
  test("off until connected, then the server's name, then its first sync", async () => {
    const { result } = await renderHook(() => useDeviceSync());
    expect(result.current.rowValue).toBe("backup.encryptionOff");

    let connected = false;
    await act(async () => {
      connected = await result.current.connect("cloud.test");
    });

    expect(connected).toBe(true);
    expect(result.current.rowValue).toBe("cloud.test");
    expect(mockToasts).toEqual(["success:sync.connected"]);
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

  test("a manual sync that cannot reach the server says so; one that can says done", async () => {
    mockSync.account = ACCOUNT;
    const { result } = await renderHook(() => useDeviceSync());

    mockSync.runFails = true;
    await act(() => result.current.syncNow());
    mockSync.runFails = false;
    await act(() => result.current.syncNow());

    expect(mockToasts).toEqual(["error:sync.failed", "success:sync.done"]);
  });

  test("stopping forgets the account on this device", async () => {
    mockSync.account = ACCOUNT;
    const { result } = await renderHook(() => useDeviceSync());
    await waitFor(() => expect(result.current.account).not.toBeNull());

    await act(() => result.current.disconnect());

    expect(result.current.account).toBeNull();
    expect(mockToasts).toEqual(["success:sync.disconnected"]);
  });

  test("the row names the host, not the scheme", () => {
    expect(syncHostLabel(ACCOUNT)).toBe("cloud.test");
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
    expect(useSyncStore.getState()).toMatchObject({ failed: false, result: null });
    expect(mockReported).toEqual([]);
  });

  test("a run already in flight is not started twice, and a failure keeps the last result", async () => {
    mockSync.account = ACCOUNT;
    const previous = { uploaded: true, peers: [] };
    useSyncStore.setState({ result: previous });
    mockSync.runFails = true;

    const first = useSyncStore.getState().run({ snapshotFirst: false });
    const second = useSyncStore.getState().run({ snapshotFirst: false });
    await Promise.all([first, second]);

    expect(mockReported).toEqual(["sync.run"]);
    expect(useSyncStore.getState()).toMatchObject({
      failed: true,
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
