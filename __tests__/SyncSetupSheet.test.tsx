import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * Three ways to connect, because there are three, and one line for the clouds Bati cannot reach,
 * which leads to what works instead of to a button that says no.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/onboarding" }));

import { SyncSetupSheet } from "@/components/settings/SyncSetupSheet";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const onConnectDav = jest.fn((..._args: unknown[]) => Promise.resolve(false));
const onConnectFolder = jest.fn((_uri?: string) => Promise.resolve(false));

const sheet = (backupFolder: { uri: string; label: string } | null = null) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <SyncSetupSheet
          open
          context="onboarding"
          onClose={() => {}}
          onConnectNextcloud={() => Promise.resolve(false)}
          onCancelNextcloud={() => {}}
          onConnectDav={onConnectDav}
          onConnectFolder={onConnectFolder}
          backupFolder={backupFolder}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

beforeEach(() => {
  onConnectDav.mockClear();
  onConnectFolder.mockClear();
});

test("three doors, and the clouds Bati cannot reach lead to the file hand-off and Round Sync", async () => {
  await sheet();
  expect(screen.getByTestId("sync-door-nextcloud")).toBeTruthy();
  expect(screen.getByTestId("sync-door-webdav")).toBeTruthy();
  expect(screen.getByTestId("sync-door-folder")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("sync-not-listed"));
  expect(screen.getByTestId("sync-handoff")).toBeTruthy();
  expect(screen.getByText("sync.handoff.onceOnboarding")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("sync-handoff-roundsync"));
  expect(screen.getByTestId("sync-dav-url").props.value).toBe("http://127.0.0.1:8080");
});

test("a WebDAV address is named for the Settings row by what it is, without a button per provider", async () => {
  await sheet();
  await fireEvent.press(screen.getByTestId("sync-door-webdav"));
  await fireEvent.changeText(screen.getByTestId("sync-dav-url"), "https://app.koofr.net/dav/Koofr");
  await fireEvent.changeText(screen.getByTestId("sync-dav-user"), "hero");
  await fireEvent.changeText(screen.getByTestId("sync-dav-password"), "app-password");
  await fireEvent.press(screen.getByTestId("sync-dav-connect"));
  await waitFor(() =>
    expect(onConnectDav).toHaveBeenCalledWith(
      "https://app.koofr.net/dav/Koofr",
      "hero",
      "app-password",
      "Koofr",
    ),
  );
});

test("the automatic backup's folder is offered as the synced folder, in one tap", async () => {
  await sheet({ uri: "content://tree/primary%3ASyncthing%2FBati", label: "Syncthing/Bati" });
  await fireEvent.press(screen.getByTestId("sync-door-folder"));
  await fireEvent.press(screen.getByTestId("sync-folder-use-backup"));
  await waitFor(() =>
    expect(onConnectFolder).toHaveBeenCalledWith("content://tree/primary%3ASyncthing%2FBati"),
  );
});

test("without a backup folder, the folder door opens the picker", async () => {
  await sheet();
  await fireEvent.press(screen.getByTestId("sync-door-folder"));
  expect(screen.queryByTestId("sync-folder-use-backup")).toBeNull();
  await fireEvent.press(screen.getByTestId("sync-folder-pick"));
  await waitFor(() => expect(onConnectFolder).toHaveBeenCalledWith(undefined));
});

test("a door can be left for another", async () => {
  await sheet();
  await fireEvent.press(screen.getByTestId("sync-door-nextcloud"));
  expect(screen.getByTestId("sync-server")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("sync-other-service"));
  expect(screen.getByTestId("sync-door-webdav")).toBeTruthy();
});
