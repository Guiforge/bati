import { render } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { HomeHeader } from "@/components/home/HomeHeader";
import { ExerciseInstructionsBody } from "@/components/session/ExerciseInstructions";
import { PrepView } from "@/components/session/PrepView";
import type { SessionInstruction } from "@/hooks/useSessionInstructions";
import config from "@/tamagui.config";

/**
 * The 2026-10-03 audit ran the app at Android font scale 1.3: the prep screen's description was
 * cut mid-sentence because its box was a fixed 120 dp while its lines grew 30 percent. The cap has
 * to follow the font scale, or the box is smaller than the six lines it was sized for.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
// The header reads its level on focus; nothing here is about the level.
jest.mock("@/hooks/useReloadOnChange", () => ({ useReloadOnChange: () => {} }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useIsFocused: () => true,
}));
jest.mock("@/hooks/useStreakInfo", () => ({ useStreakInfo: () => ({ current: 12 }) }));

const FONT_SCALE = 1.3;

const instruction = {
  name: "Squat",
  description: "Stand with feet shoulder-width apart. ".repeat(8),
  imagePath: "assets/images/exercises/squat.webp",
} as unknown as SessionInstruction;

describe("PrepView at a large font scale", () => {
  beforeEach(() => {
    const real = Dimensions.get("window");
    jest
      .spyOn(Dimensions, "get")
      .mockImplementation(() => ({ ...real, fontScale: FONT_SCALE }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it("grows the description box with the font so six lines still fit", async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <PrepView
            kicker="First trial"
            instruction={instruction}
            fallbackName="Squat"
            target="14 reps"
            remainingSeconds={null}
            onGo={() => {}}
            goTestID="go"
          />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    const box = StyleSheet.flatten(view.getByTestId("movement-description").props.style);
    expect(box.maxHeight).toBeGreaterThanOrEqual(Math.ceil(120 * FONT_SCALE));
    expect(box.flexShrink).toBe(0);
  });
});

describe("the rest of the large-font pass", () => {
  beforeEach(() => {
    const real = Dimensions.get("window");
    jest
      .spyOn(Dimensions, "get")
      .mockImplementation(() => ({ ...real, fontScale: FONT_SCALE }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it("lets the paused card's how-to grow with the font too", async () => {
    const view = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExerciseInstructionsBody instruction={instruction} artSize={120} />
      </TamaguiProvider>,
    );
    const box = StyleSheet.flatten(view.getByTestId("instruction-description").props.style);
    expect(box.maxHeight).toBeGreaterThanOrEqual(Math.ceil(160 * FONT_SCALE));
  });

  // The streak under the flame wrapped to two lines and pushed the HUD out of its strip.
  it("keeps the streak under the flame on one line", async () => {
    const view = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <HomeHeader />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    const days = await view.findByTestId("home-streak-days");
    expect(days.props.numberOfLines).toBe(1);
    expect(days.props.adjustsFontSizeToFit).toBe(true);
  });
});
