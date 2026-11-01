// RNGH mocks its native module and host detector; it must load before the screen does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { act, configure, fireEvent, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import DevIsoRoute from "@/app/dev-iso";
import { EFFETS } from "@/components/village/iso/effets";
import config from "@/tamagui.config";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: { getState: () => ({ hapticsEnabled: false, soundEnabled: false }) },
}));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("expo-router", () => ({
  useIsFocused: () => true,
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/dev-iso",
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

configure({ defaultIncludeHiddenElements: true });
jest.setTimeout(20_000);

// qa-audit2: dev-iso's `Effet : <bâtiment>` forces the effect of the next wave, so qa no longer
// predicts the draw with a port of effetsDeVague.
test("the Effet button steps through the six buildings and plays each one at once", async () => {
  jest.useFakeTimers({ now: Date.parse("2026-10-31T20:08:45+01:00") });
  try {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <GestureHandlerRootView>
          <TamaguiProvider config={config} defaultTheme="dark">
            <DevIsoRoute />
          </TamaguiProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>,
    );
    const bouton = () => screen.getByTestId("iso-effet-force");
    const codes = Object.keys(EFFETS);
    expect(codes).toHaveLength(6);
    await fireEvent.press(bouton());
    expect(bouton()).toHaveTextContent(`Effet : ${codes[0]}`);
    // Only the forced building plays, whatever the day's draw says.
    await act(() => jest.advanceTimersByTime(2500));
    const jouees = screen.queryAllByTestId(/^iso-effet-(signal|lucioles)-/);
    expect(jouees.map((n) => n.props.testID)).toEqual([
      `iso-effet-${EFFETS.wizard_tower?.siege}-wizard_tower`,
    ]);
    for (let i = 1; i < codes.length; i++) await fireEvent.press(bouton());
    expect(bouton()).toHaveTextContent(`Effet : ${codes.at(-1)}`);
    await fireEvent.press(bouton());
    expect(bouton()).toHaveTextContent("Effet : auto");
  } finally {
    jest.useRealTimers();
  }
});
