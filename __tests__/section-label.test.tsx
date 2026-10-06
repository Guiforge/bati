import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { SectionLabel } from "@/components/common/SectionLabel";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const mount = (text: string) =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <SectionLabel>{text}</SectionLabel>
    </TamaguiProvider>,
  );

describe("SectionLabel", () => {
  afterEach(() => useSettingsStore.setState({ language: "en" }));

  it("is 12 / 700, tracked 1.5, ash, and upper case", async () => {
    const view = await mount("Your numbers");
    const style = StyleSheet.flatten(view.getByText("YOUR NUMBERS").props.style);
    expect(style.fontSize).toBe(12);
    expect(style.letterSpacing).toBe(1.5);
    expect(style.fontWeight).toBe("700");
    const dark = config.themes.dark as unknown as Record<string, { val: string }>;
    expect(style.color).toBe(dark.textSecondary?.val);
  });

  it("upper-cases in the hero's language, not the engine's", async () => {
    // Turkish keeps the dot: i becomes İ. A plain toUpperCase() would say I.
    useSettingsStore.setState({ language: "tr" as never });
    const view = await mount("istatistik");
    expect(view.getByText("İSTATİSTİK")).toBeTruthy();
  });
});
