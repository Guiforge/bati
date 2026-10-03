import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TamaguiProvider } from "tamagui";

import { AdventureFooter } from "@/components/adventures/AdventureFooter";
import config from "@/tamagui.config";

// Audit 2026-10-03, font scale 1.3: "≈ 2 wee…  up to +90 XP per step". The row has to wrap, so the
// length and the steps stay whole instead of being cut to give the XP its width.
test("the footer wraps and never truncates the length and steps", async () => {
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventureFooter meta="≈ 2 weeks · 8 steps" xp="up to +90 XP per step" />
    </TamaguiProvider>,
  );
  const row = StyleSheet.flatten(view.getByTestId("adventure-card-footer").props.style);
  expect(row.flexWrap).toBe("wrap");
  expect(view.getByTestId("adventure-card-meta").props.numberOfLines).toBeUndefined();
});
