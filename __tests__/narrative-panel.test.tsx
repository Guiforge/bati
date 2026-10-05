import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { NarrativeModal } from "@/components/adventures/NarrativeModal";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

async function mount(view: React.ReactElement) {
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          {view}
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

const colourOf = (text: string) =>
  (StyleSheet.flatten(screen.getByText(text).props.style) as { color?: string }).color;

// AppButton primary is the only button that draws a bottom edge: the seal.
const isSealed = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).borderBottomWidth === 3;

describe("NarrativeModal is a panel", () => {
  it("titles in a Recitatif and confirms with the seal, no raw white", async () => {
    const onClose = jest.fn();
    const onDismiss = jest.fn();
    await mount(
      <NarrativeModal
        visible
        title="The Gate"
        text="Once upon a time."
        onClose={onClose}
        onDismiss={onDismiss}
      />,
    );
    // The Recitatif is the one component that tags its title a header.
    expect(screen.getByText("The Gate").props.accessibilityRole).toBe("header");
    expect(isSealed("narrative-confirm")).toBe(true);
    expect(colourOf("Begin Adventure")).not.toBe("white");
    await fireEvent.press(screen.getByTestId("narrative-confirm"));
    expect(onClose).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId("narrative-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
