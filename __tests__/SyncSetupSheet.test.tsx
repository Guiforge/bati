import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * The first question is in the names a hero knows. A cloud Bati cannot reach leads to the two ways
 * that work, written out, never to a dead end.
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

const sheet = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <SyncSetupSheet
          open
          context="onboarding"
          onClose={() => {}}
          onConnectNextcloud={() => Promise.resolve(false)}
          onCancelNextcloud={() => {}}
          onConnectDav={() => Promise.resolve(false)}
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

test("Google Drive leads to the file hand-off and to Round Sync, with the steps", async () => {
  await sheet();
  expect(screen.getByText("sync.pick.whereIsIt")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("sync-service-gdrive"));
  expect(screen.getByTestId("sync-handoff")).toBeTruthy();
  expect(screen.getByText("sync.handoff.onceOnboarding")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("sync-handoff-roundsync"));
  expect(screen.getByTestId("sync-dav-url").props.value).toBe("http://127.0.0.1:8080");
});

test("a service Bati reaches opens its form, and the hero can go back", async () => {
  await sheet();
  await fireEvent.press(screen.getByTestId("sync-service-nextcloud"));
  expect(screen.getByTestId("sync-server")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("sync-other-service"));
  expect(screen.getByText("sync.pick.whereIsIt")).toBeTruthy();
});
