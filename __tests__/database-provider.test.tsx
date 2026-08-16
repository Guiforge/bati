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
let mockPhase = "idle";
const mockFinishRestore = jest.fn();

jest.mock("@/db/migrate", () => ({ ensureMigrations: () => mockEnsureMigrations() }));
jest.mock("@/db/backup", () => ({ stampDatabaseIdentity: () => mockStampDatabaseIdentity() }));
jest.mock("@/src/backupFiles", () => ({ commitRestore: () => mockCommitRestore() }));
jest.mock("@/src/reportError", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));
jest.mock("expo-splash-screen", () => ({ hideAsync: () => mockHideAsync() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock("@/stores/restore", () => ({
  useRestoreStore: (selector: (s: unknown) => unknown) =>
    selector({ phase: mockPhase, finishRestore: mockFinishRestore }),
}));

import { DatabaseProvider } from "@/components/DatabaseProvider";

const child = <Text>the app</Text>;

beforeEach(() => {
  jest.clearAllMocks();
  mockPhase = "idle";
  mockEnsureMigrations.mockResolvedValue(undefined);
  mockStampDatabaseIdentity.mockResolvedValue(undefined);
  mockCommitRestore.mockResolvedValue(undefined);
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
    mockPhase = "restoring";

    await mount();

    // `children` must be unmounted before the swap: nothing may still be querying the database
    // the restore is about to close.
    expect(screen.queryByText("the app")).toBeNull();
    await waitFor(() => expect(mockCommitRestore).toHaveBeenCalled());
    await waitFor(() => expect(mockFinishRestore).toHaveBeenCalledWith("restartRequired"));
  });

  it("commits a restore once, never twice", async () => {
    mockPhase = "restoring";
    const { rerender } = await mount();
    await waitFor(() => expect(mockCommitRestore).toHaveBeenCalled());

    await act(() => rerender(<DatabaseProvider>{child}</DatabaseProvider>));

    // A second commit would park the *restored* database as `.bak` over the hero's original and
    // then fail looking for a staged file that was already consumed.
    expect(mockCommitRestore).toHaveBeenCalledTimes(1);
  });

  it("reports a failed restore and says so, rather than pretending it worked", async () => {
    mockPhase = "restoring";
    mockCommitRestore.mockRejectedValue(new Error("staged file is gone"));

    await mount();

    await waitFor(() => expect(mockFinishRestore).toHaveBeenCalledWith("failed"));
    expect(mockReportError).toHaveBeenCalledWith("backup.commitRestore", expect.any(Error));
  });
});
