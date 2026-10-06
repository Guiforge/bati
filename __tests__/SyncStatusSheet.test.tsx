import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * The sheet that replaced a native alert: what sync is doing, where the files are, every other
 * device, the last merge, the Wi-Fi switch, and a Stop that says what it leaves behind.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/settings" }));
const mockWifi = { on: false };
const mockForgotten: string[] = [];
jest.mock("@/src/deviceSync", () => ({
  forgetPeer: (peer: { name: string }) =>
    Promise.resolve().then(() => {
      mockForgotten.push(peer.name);
    }),
  accountLabel: () => "cloud.test",
  syncFolderOf: () => ({
    folder: "https://cloud.test/remote.php/dav/files/hero/Bati/",
    user: "hero",
  }),
  lastMerge: () =>
    Promise.resolve({
      at: Date.now() - 120_000,
      peer: "bati-7ab1e7ab-x.batb",
      sessions: 2,
      kept: "k.batb",
    }),
  syncWifiOnly: () => Promise.resolve(mockWifi.on),
  setSyncWifiOnly: (on: boolean) =>
    Promise.resolve().then(() => {
      mockWifi.on = on;
    }),
}));
jest.mock("@/src/reportError", () => ({ reportError: () => {} }));

import { SyncStatusSheet } from "@/components/settings/SyncStatusSheet";
import { useSyncStore } from "@/stores/sync";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const ACCOUNT = {
  kind: "nextcloud" as const,
  server: "https://cloud.test",
  loginName: "hero",
  appPassword: "p",
};

const LOCAL = { folder: null as string | null, onPress: () => {} };

function sheet(onStop = jest.fn(), onSyncNow = jest.fn(), local = LOCAL, onClose = () => {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <SyncStatusSheet
          open
          account={ACCOUNT}
          onClose={onClose}
          onSyncNow={onSyncNow}
          onStop={onStop}
          onTest={() => Promise.resolve([])}
          local={local}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  mockWifi.on = false;
  mockForgotten.length = 0;
  useSyncStore.setState({
    running: false,
    failure: null,
    waitingWifi: false,
    lastSyncAt: Date.now() - 5 * 60_000,
    result: {
      uploaded: false,
      peers: [
        {
          name: "bati-7ab1e7ab-0000-4000-8000-00000000000b.batb",
          etag: "e",
          modified: Date.now() - 3_600_000,
          state: "level",
        },
      ],
    },
  });
});

test("says how sync stands, where the files are, and every other device", async () => {
  await sheet();
  expect(screen.getByTestId("sync-status").props.children).toContain("sync.status.upToDate");
  expect(screen.getByTestId("sync-status").props.children).toContain(
    'sync.ago.minutes {\\"count\\":5}',
  );
  expect(screen.getByTestId("sync-folder").props.children).toBe(
    "https://cloud.test/remote.php/dav/files/hero/Bati/",
  );
  expect(screen.getByTestId("sync-peer").props.children).toContain('"id":"7ab1e7ab"');
  await waitFor(() => expect(screen.getByTestId("sync-last-merge")).toBeTruthy());
});

test("a session kept although another device deleted it is said in one line, and not when there is none", async () => {
  await sheet();
  expect(screen.queryByTestId("sync-kept")).toBeNull();
});

test("S13: the sessions this device keeps are counted in the sheet", async () => {
  useSyncStore.setState({ result: { uploaded: true, peers: [], keptSessions: 2 } });
  await sheet();
  expect(screen.getByTestId("sync-kept").props.children).toContain("sync.status.keptSessions");
  expect(screen.getByTestId("sync-kept").props.children).toContain('"count":2');
});

test("a failure is said by its layer, in the sheet itself", async () => {
  useSyncStore.setState({ failure: { kind: "storage", status: 507 } });
  await sheet();
  expect(screen.getByTestId("sync-status").props.children).toContain("sync.failure.storage");
});

test("the Wi-Fi switch is kept", async () => {
  await sheet();
  await fireEvent.press(screen.getByTestId("sync-wifi-only"));
  await waitFor(() => expect(mockWifi.on).toBe(true));
});

test("Stop asks first, and says what stays on the server", async () => {
  const alert = jest.spyOn(Alert, "alert");
  const onStop = jest.fn();
  await sheet(onStop);
  await fireEvent.press(screen.getByTestId("sync-stop"));
  // The app's own dialog, not the grey native one, and nothing stopped yet.
  expect(alert).not.toHaveBeenCalled();
  expect(screen.getByText("sync.stopBodyNextcloud")).toBeTruthy();
  expect(onStop).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
  expect(onStop).toHaveBeenCalled();
});

test("cancelling Stop keeps syncing", async () => {
  const onStop = jest.fn();
  await sheet(onStop);
  await fireEvent.press(screen.getByTestId("sync-stop"));
  await fireEvent.press(screen.getByTestId("confirm-dialog-cancel"));
  expect(onStop).not.toHaveBeenCalled();
});

const stuckPeer = (state: string) => ({
  name: "bati-7ab1e7ab-0000-4000-8000-00000000000c.batb",
  etag: "e2",
  modified: Date.now() - 86_400_000,
  state,
});

test.each(["locked", "oldKey", "unreadable", "replayed", "newerVersion"])(
  "a device that is %s can be forgotten, which asks first and then looks again",
  async (state) => {
    useSyncStore.setState({ result: { uploaded: false, peers: [stuckPeer(state)] } as never });
    const onSyncNow = jest.fn();
    await sheet(jest.fn(), onSyncNow);

    await fireEvent.press(screen.getByTestId("sync-forget"));
    expect(mockForgotten).toEqual([]);
    expect(screen.getByText('sync.forgetBody {"id":"7ab1e7ab"}')).toBeTruthy();

    await fireEvent.press(screen.getByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(mockForgotten).toEqual([stuckPeer(state).name]));
    await waitFor(() => expect(onSyncNow).toHaveBeenCalled());
  },
);

test("a device that is in step, behind or waiting has nothing to forget", async () => {
  useSyncStore.setState({
    result: {
      uploaded: false,
      peers: [
        stuckPeer("level"),
        { ...stuckPeer("behind"), name: "bati-b.batb" },
        { ...stuckPeer("waiting"), name: "bati-c.batb" },
      ],
    } as never,
  });
  await sheet();

  expect(screen.queryByTestId("sync-forget")).toBeNull();
});

test("cancelling the question forgets nothing", async () => {
  useSyncStore.setState({ result: { uploaded: false, peers: [stuckPeer("locked")] } as never });
  await sheet();

  await fireEvent.press(screen.getByTestId("sync-forget"));
  await fireEvent.press(screen.getByTestId("confirm-dialog-cancel"));

  expect(mockForgotten).toEqual([]);
});

describe("the extra copy on this phone", () => {
  test("says where the daily copy goes when the automatic backup is on", async () => {
    await sheet(jest.fn(), jest.fn(), { folder: "Documents/Bati", onPress: () => {} });
    expect(screen.getByTestId("sync-local-copy")).toBeTruthy();
    expect(screen.getByText('shelter.alsoPhone {"folder":"Documents/Bati"}')).toBeTruthy();
  });

  test("offers to add one when it is off, and a press closes the sheet before handing over", async () => {
    const calls: string[] = [];
    await sheet(jest.fn(), jest.fn(), { folder: null, onPress: () => calls.push("local") }, () =>
      calls.push("close"),
    );
    expect(screen.getByText("shelter.alsoPhoneAdd")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("sync-local-copy"));

    // The dialog that follows opens over Settings, not over a sheet that is still on screen.
    expect(calls).toEqual(["close", "local"]);
  });
});

test("a connected server can be tested from the sheet, the test being the way to say why it fails", async () => {
  useSyncStore.setState({ failure: { kind: "server", status: 400 } });
  await sheet();

  expect(screen.getByTestId("sync-test")).toBeTruthy();
});

test("a sync that failed before it ever succeeded still opens: no peers yet is not an endless re-render", async () => {
  // The first sync to a server that refuses leaves `result` null. Reading the peers as `result?.peers ?? []`
  // made a new array at every read, which React takes for a store that changes every time: the Settings
  // page fell to the error screen, at every visit, for as long as the account stayed connected.
  useSyncStore.setState({
    result: null,
    failure: { kind: "server", status: 400 },
    lastSyncAt: null,
  });
  await sheet();

  expect(screen.getByTestId("sync-status").props.children).toContain("sync.failure.server");
  expect(screen.getByText("sync.status.noDevices")).toBeTruthy();
});
