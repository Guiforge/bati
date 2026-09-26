import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

// 180 lines that decide whether the app opens at all, with three `useRef` guards each commented
// with what it breaks and none of them verified. It owns migrations, the database identity stamp,
// the once-per-process restore commit, and the only `hideAsync()` on the failure path — a hang
// here is a black screen with no way back.

const mockEnsureMigrations = jest.fn();
const mockStampDatabaseIdentity = jest.fn();
const mockCommitRestore = jest.fn();
const mockHideAsync = jest.fn(() => Promise.resolve());
const mockReportError = jest.fn();
const mockBackupIfStaleToday = jest.fn();

jest.mock("@/db/migrate", () => ({ ensureMigrations: () => mockEnsureMigrations() }));
jest.mock("@/db/backup", () => ({ stampDatabaseIdentity: () => mockStampDatabaseIdentity() }));
jest.mock("@/src/backupFiles", () => ({
  commitRestore: () => mockCommitRestore(),
  clearPeerScratch: jest.fn(),
  discardStagedImport: jest.fn(),
}));
const mockReload = jest.fn((_reason: string) => Promise.resolve());
jest.mock("expo", () => ({ reloadAppAsync: (reason: string) => mockReload(reason) }));
jest.mock("@/src/autoBackup", () => ({ backupIfStaleToday: () => mockBackupIfStaleToday() }));
const mockPrepareSync = jest.fn(() => Promise.resolve());
const mockSyncNow = jest.fn(() => Promise.resolve({ uploaded: false, peers: [] }));
jest.mock("@/src/deviceSync", () => ({
  prepareSyncAtLaunch: () => mockPrepareSync(),
  syncAccount: () =>
    Promise.resolve({ kind: "webdav", url: "https://dav.test", user: "h", password: "p" }),
  syncNow: () => mockSyncNow(),
}));
jest.mock("@/src/reportError", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));
jest.mock("expo-splash-screen", () => ({ hideAsync: () => mockHideAsync() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import { DatabaseProvider } from "@/components/DatabaseProvider";
import { useRestoreStore } from "@/stores/restore";
import { useSyncStore } from "@/stores/sync";

const child = <Text>the app</Text>;

beforeEach(() => {
  jest.clearAllMocks();
  useRestoreStore.setState({ phase: "idle", commitClaimed: false });
  mockEnsureMigrations.mockResolvedValue(undefined);
  mockStampDatabaseIdentity.mockResolvedValue(undefined);
  mockCommitRestore.mockResolvedValue(undefined);
  mockBackupIfStaleToday.mockResolvedValue(undefined);
});

async function mount(onReady?: () => void) {
  let r!: ReturnType<typeof render>;
  await act(() => {
    r = render(<DatabaseProvider onReady={onReady}>{child}</DatabaseProvider>);
  });
  return r;
}

describe("DatabaseProvider", () => {
  it("migrates, stamps the database, then shows the app", async () => {
    const onReady = jest.fn();
    await mount(onReady);

    expect(await screen.findByText("the app")).toBeTruthy();
    expect(mockEnsureMigrations).toHaveBeenCalled();
    // The stamp is what makes an exported snapshot recognisable as Bati's on the way back in.
    expect(mockStampDatabaseIdentity).toHaveBeenCalled();
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
  });

  it("takes the day's backup before the app is allowed to query anything", async () => {
    const onReady = jest.fn();
    await mount(onReady);
    await screen.findByText("the app");

    // `VACUUM INTO` needs the database to itself, and this is the only moment it gets it —
    // after the migrations and the stamp, before `onReady` hands the tree its stores. Putting
    // it at the end of a session instead produced "cannot VACUUM - SQL statements in progress"
    // on a real device. See src/autoBackup.ts.
    expect(mockBackupIfStaleToday).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(mockBackupIfStaleToday.mock.invocationCallOrder[0]).toBeLessThan(
      onReady.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("seals the sync snapshot at the same quiet moment, and syncs only once the app is up", async () => {
    // Earlier tests already claimed this process's one launch sync.
    useSyncStore.setState({ launchClaimed: false, running: false });
    const onReady = jest.fn();
    await mount(onReady);
    await screen.findByText("the app");
    await waitFor(() => expect(mockSyncNow).toHaveBeenCalled());

    const sealed = mockPrepareSync.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;
    expect(mockBackupIfStaleToday.mock.invocationCallOrder[0]).toBeLessThan(sealed);
    expect(sealed).toBeLessThan(onReady.mock.invocationCallOrder[0] ?? 0);
    expect(onReady.mock.invocationCallOrder[0]).toBeLessThan(
      mockSyncNow.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("runs migrations once per process, not once per render", async () => {
    const { rerender } = await mount();
    await screen.findByText("the app");

    await act(() => rerender(<DatabaseProvider>{child}</DatabaseProvider>));

    // The `hasStartedMigrations` guard. StrictMode double-invokes effects, and migrating twice
    // concurrently is how a half-applied schema happens.
    expect(mockEnsureMigrations).toHaveBeenCalledTimes(1);
  });

  it("calls onReady once even across re-renders", async () => {
    const onReady = jest.fn();
    const { rerender } = await mount(onReady);
    await waitFor(() => expect(onReady).toHaveBeenCalled());

    await act(() => rerender(<DatabaseProvider onReady={onReady}>{child}</DatabaseProvider>));

    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("shows a failure screen instead of the app when migrations throw", async () => {
    mockEnsureMigrations.mockRejectedValue(new Error("disk is full"));

    await mount();

    // The app must not mount against a database whose schema never arrived.
    await waitFor(() => expect(screen.queryByText("the app")).toBeNull());
    // And the splash must come down, or the failure screen is behind it and the app looks frozen.
    await waitFor(() => expect(mockHideAsync).toHaveBeenCalled());
  });

  it("replaces the app with a notice while a restore is in flight", async () => {
    useRestoreStore.setState({ phase: "restoring" });

    await mount();

    // `children` must be unmounted before the swap: nothing may still be querying the database
    // the restore is about to close.
    expect(screen.queryByText("the app")).toBeNull();
    await waitFor(() => expect(mockCommitRestore).toHaveBeenCalled());
    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restartRequired"));
    // Opened in a fresh runtime, with no "close and reopen" for the hero to do.
    await waitFor(() => expect(mockReload).toHaveBeenCalledWith("restore"));
  });

  it("commits a restore once, never twice", async () => {
    useRestoreStore.setState({ phase: "restoring" });
    const { rerender } = await mount();
    await waitFor(() => expect(mockCommitRestore).toHaveBeenCalled());

    await act(() => rerender(<DatabaseProvider>{child}</DatabaseProvider>));

    // A second commit would park the *restored* database as `.bak` over the hero's original and
    // then fail looking for a staged file that was already consumed.
    expect(mockCommitRestore).toHaveBeenCalledTimes(1);
  });

  // What a device does, and a rerender does not: rendering the notice unmounts the root `<Stack>`,
  // expo-router remounts the whole root layout, and a second provider arrives with fresh refs
  // while the store still says `restoring`. Every restore that worked reported that it had not.
  it("commits once even when the provider is remounted mid-restore", async () => {
    // Still in flight when the remount lands, as on the device: 30 ms into the swap.
    let finishSwap = () => {};
    mockCommitRestore.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSwap = resolve;
      }),
    );
    useRestoreStore.setState({ phase: "restoring" });
    const { rerender } = await mount();
    await waitFor(() => expect(mockCommitRestore).toHaveBeenCalled());

    // A new key is a new instance: unmounted, then mounted again with fresh refs.
    await act(() => rerender(<DatabaseProvider key="remounted">{child}</DatabaseProvider>));
    await act(async () => finishSwap());

    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("restartRequired"));
    expect(mockCommitRestore).toHaveBeenCalledTimes(1);
  });

  it("reports a failed restore and says so, rather than pretending it worked", async () => {
    useRestoreStore.setState({ phase: "restoring" });
    mockCommitRestore.mockRejectedValue(new Error("staged file is gone"));

    await mount();

    await waitFor(() => expect(useRestoreStore.getState().phase).toBe("failed"));
    expect(mockReportError).toHaveBeenCalledWith("backup.commitRestore", expect.any(Error));
    // The hero has to read that nothing was replaced: no reload over the message.
    expect(mockReload).not.toHaveBeenCalled();
  });
});
