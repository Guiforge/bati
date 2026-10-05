import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { SectionLabel } from "@/components/common/SectionLabel";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

describe("SectionLabel", () => {
  it("is 12 / 700, tracked 1.5, and upper case", async () => {
    const view = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <SectionLabel>Your numbers</SectionLabel>
      </TamaguiProvider>,
    );
    const style = StyleSheet.flatten(view.getByText("YOUR NUMBERS").props.style);
    expect(style.fontSize).toBe(12);
    expect(style.letterSpacing).toBe(1.5);
    expect(style.fontWeight).toBe("700");
  });
});
