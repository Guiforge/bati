import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import CreditsScreen from "@/app/credits";
import "@/i18n";
import config from "@/tamagui.config";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/credits",
}));

/**
 * Embedding OpenFreeMap's vendored styles redistributes BSD code in binary form, which asks for
 * the notice "in the documentation and/or other materials provided with the distribution". The
 * credits screen is that documentation: deleting the notice must fail a test.
 */
test("the map styles card carries the licence notice, verbatim", async () => {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <CreditsScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

  expect(screen.getByText("Map styles")).toBeTruthy();
  expect(screen.getByText("OpenFreeMap styles")).toBeTruthy();
  const notice = String(screen.getByTestId("credits-map-notice").props.children);
  for (const needle of [
    "CartoDB Inc.",
    "MapTiler.com & OpenMapTiles contributors",
    "Redistributions in binary form",
    "CC-BY 4.0",
  ]) {
    expect(notice).toContain(needle);
  }
});
