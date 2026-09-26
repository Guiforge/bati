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
jest.mock("@/src/deviceSync", () => ({
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

function sheet(onStop = jest.fn()) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <SyncStatusSheet
          open
          account={ACCOUNT}
          onClose={() => {}}
          onSyncNow={() => {}}
          onStop={onStop}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  mockWifi.on = false;
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
  expect(alert.mock.calls[0]?.[1]).toBe("sync.stopBodyNextcloud");
  const stop = alert.mock.calls[0]?.[2]?.find((b) => b.text === "sync.stopCta");
  stop?.onPress?.();
  expect(onStop).toHaveBeenCalled();
});
