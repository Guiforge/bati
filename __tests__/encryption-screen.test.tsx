import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import EncryptionScreen from "@/app/encryption";
import config from "@/tamagui.config";

/**
 * "How the encryption works": five plain sentences for everyone, and a folded section for whoever
 * wants to know what is under them. Readable offline, because it is where the hero goes to decide
 * whether to believe the app.
 */
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const view = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <EncryptionScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );

test("says the five plain sentences, and keeps the technical ones folded", async () => {
  await view();

  for (const point of ["howP1", "howP2", "howP3", "howP4", "howP5"]) {
    expect(screen.getByTestId(`encryption-${point}`)).toBeTruthy();
  }
  expect(screen.queryByTestId("encryption-howC1")).toBeNull();
});

test("unfolds the technical ones on a tap, and folds them again", async () => {
  await view();

  await fireEvent.press(screen.getByTestId("encryption-curious"));
  for (const line of ["howC1", "howC2", "howC3", "howC4"]) {
    expect(screen.getByTestId(`encryption-${line}`)).toBeTruthy();
  }
  expect(screen.getByTestId("encryption-curious").props.accessibilityState).toEqual({
    expanded: true,
  });

  await fireEvent.press(screen.getByTestId("encryption-curious"));
  expect(screen.queryByTestId("encryption-howC1")).toBeNull();
});
