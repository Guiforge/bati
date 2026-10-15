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
  expect(style.fontFamily).toBe("Alegreya_700Bold");
  expect(style.fontSize).toBe(20);
});

test("the label spans a full-width button but never stretches one sized to its text", async () => {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <AppButton>Wide</AppButton>
        <AppButton fullWidth={false}>Hug</AppButton>
        <AppButton fullWidth={false} flex={1}>
          Half
        </AppButton>
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

  const grow = (text: string) =>
    Object.assign({}, ...[screen.getByText(text).props.style].flat()).flexGrow;
  expect(grow("Wide")).toBe(1);
  // Yoga grows a content-sized box to fill whatever a growing child is offered: the recap's
  // Share button swallowed the header row and ran off the screen.
  expect(grow("Hug") ?? 0).toBe(0);
  expect(grow("Half")).toBe(1);
});

test("a button enabled again tells Android so, not only the eye", async () => {
  // React Native's Android view keeps `setEnabled(false)` when the next accessibility state is
  // null, and Tamagui sends one only while disabled: the chronicle's send button, disabled until
  // its painting loads, was announced as disabled for good while it worked to a tap.
  const ui = (disabled: boolean) => (
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <AppButton testID="send" disabled={disabled}>
          Send
        </AppButton>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
  await render(ui(true));
  expect(screen.getByTestId("send").props["aria-disabled"]).toBe(true);
  await screen.rerender(ui(false));
  // `false`, not absent: React Native's View turns it into the state Android re-reads.
  expect(screen.getByTestId("send").props["aria-disabled"]).toBe(false);
});
