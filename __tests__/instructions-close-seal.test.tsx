import { act, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { ExerciseInstructionsModal } from "@/components/session/ExerciseInstructions";
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

// AppButton primary is the only button that draws a bottom edge: the seal.
const isSealed = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).borderBottomWidth === 3;

describe("ExerciseInstructionsModal close", () => {
  it("is the seal", async () => {
    await mount(
      <ExerciseInstructionsModal
        visible
        onClose={() => undefined}
        instruction={
          {
            name: "Dead Bug",
            description: "x",
            imagePath: "assets/images/exercises/dead_bug.webp",
          } as never
        }
      />,
    );
    expect(isSealed("session-instructions-close")).toBe(true);
  });
});
