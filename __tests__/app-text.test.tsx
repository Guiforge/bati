import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { FONT_CAPS } from "@/components/common/fontCaps";
import config from "@/tamagui.config";

const wrap = (node: React.ReactNode) => (
  <TamaguiProvider config={config} defaultTheme="dark">
    {node}
  </TamaguiProvider>
);

test("each variant carries its own font-size cap", async () => {
  await render(
    wrap(
      <>
        <AppText testID="body">a</AppText>
        <AppText testID="label" variant="label">
          b
        </AppText>
        <AppText testID="display" variant="display">
          c
        </AppText>
      </>,
    ),
  );
  expect(screen.getByTestId("body").props.maxFontSizeMultiplier).toBe(1.5);
  expect(screen.getByTestId("label").props.maxFontSizeMultiplier).toBe(1.2);
  expect(screen.getByTestId("display").props.maxFontSizeMultiplier).toBe(1);
  expect(FONT_CAPS).toEqual({ body: 1.5, label: 1.2, display: 1 });
});

test("an explicit cap still wins", async () => {
  await render(
    wrap(
      <AppText testID="t" variant="display" maxFontSizeMultiplier={2}>
        x
      </AppText>,
    ),
  );
  expect(screen.getByTestId("t").props.maxFontSizeMultiplier).toBe(2);
});
