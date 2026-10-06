import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import config from "@/tamagui.config";

/**
 * A button's label is never cut. Tamagui ellipsizes a button's text and fixes its height by default,
 * and "Comment marche le chiffre…" read as a broken button at 130 % text in French.
 */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

test("a long label is not limited to one line", async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <AppButton testID="long">
          Comment marche le chiffrement des sauvegardes de ton héros
        </AppButton>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

  const label = screen.getByText("Comment marche le chiffrement des sauvegardes de ton héros");
  // 0 is "as many as it takes": Tamagui's default is 1, with an ellipsis.
  expect(label.props.numberOfLines).toBe(0);
});

test("it keeps the look a button's text has: the bold face and the size come through", async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <AppButton>Save</AppButton>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

  const style = Object.assign({}, ...[screen.getByText("Save").props.style].flat());
  expect(style.fontFamily).toBe("NotoSans_700Bold");
  expect(style.fontSize).toBe(20);
});
