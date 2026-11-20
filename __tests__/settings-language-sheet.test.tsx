import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * Every language at once, each in its own words, the current one marked. The row used to cycle a
 * ring, and French back to English went through German and Chinese (audit 2026-11-20, F5).
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ usePathname: () => "/settings" }));

import { LanguageSheet } from "@/components/settings/LanguageSheet";
import { SettingRow } from "@/components/settings/SettingRow";
import { APP_LANGUAGES } from "@/src/i18n/deviceLanguage";
import config from "@/tamagui.config";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const wrap = (node: React.ReactNode) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        {node}
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

test("one tap picks the language wanted, whichever it is, and the current one is marked", async () => {
  const onPick = jest.fn();
  await wrap(<LanguageSheet open current="fr" onPick={onPick} onClose={() => {}} />);
  for (const language of APP_LANGUAGES) {
    expect(screen.getByTestId(`settings-language-${language}`)).toBeTruthy();
  }
  expect(screen.getByTestId("settings-language-fr").props["aria-checked"]).toBe(true);
  expect(screen.getByTestId("settings-language-en").props["aria-checked"]).toBe(false);

  await fireEvent.press(screen.getByTestId("settings-language-en"));
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith("en");
});

test("a switch row shows a switch, not the words On or Off", async () => {
  await wrap(
    <SettingRow testID="row" icon={null} label="Sound" value="On" checked onPress={() => {}} />,
  );
  expect(screen.queryByText("On")).toBeNull();
  expect(screen.getByTestId("row").props.role).toBe("switch");
});
