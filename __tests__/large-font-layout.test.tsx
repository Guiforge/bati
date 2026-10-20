import { fireEvent, render } from "@testing-library/react-native";
import { Dimensions, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ExerciseInstructionsBody } from "@/components/session/ExerciseInstructions";
import { MovementDescription, PrepView } from "@/components/session/PrepView";
import type { SessionInstruction } from "@/hooks/useSessionInstructions";
import config from "@/tamagui.config";

/**
 * The 2026-10-03 audit ran the app at Android font scale 1.3: the prep screen's description was
 * cut mid-sentence because its box was a fixed 120 dp while its lines grew 30 percent. The cap has
 * to follow the font scale, or the box is smaller than the six lines it was sized for.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useIsFocused: () => true,
}));

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
});

const LONG = "Lie on your back. ".repeat(20);

describe("a movement description longer than its box", () => {
  const mount = () =>
    render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <MovementDescription text={LONG} />
      </TamaguiProvider>,
    );

  it("fades its last line while more is below, and stops at the end", async () => {
    const view = await mount();
    const box = view.getByTestId("movement-description");
    expect(view.queryByTestId("movement-description-fade")).toBeNull();

    await fireEvent(box, "layout", { nativeEvent: { layout: { height: 120 } } });
    await fireEvent(box, "contentSizeChange", 300, 300);
    expect(view.getByTestId("movement-description-fade")).toBeTruthy();

    await fireEvent.scroll(box, {
      nativeEvent: {
        contentOffset: { y: 180 },
        layoutMeasurement: { height: 120 },
        contentSize: { height: 300 },
      },
    });
    expect(view.queryByTestId("movement-description-fade")).toBeNull();
  });

  it("shows no fade when the text fits", async () => {
    const view = await mount();
    const box = view.getByTestId("movement-description");
    await fireEvent(box, "layout", { nativeEvent: { layout: { height: 120 } } });
    await fireEvent(box, "contentSizeChange", 300, 80);
    expect(view.queryByTestId("movement-description-fade")).toBeNull();
  });
});

// The warm-up's "Prépare-toi" pins the movement: the description is uncapped and the outer scroll
// is what cuts it, so that scroll carries the fade (persona audit 05, 71).
it("fades the pinned prep scroll while the movement runs past it", async () => {
  const view = await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <PrepView
          kicker="Get ready"
          instruction={instruction}
          fallbackName="Squat"
          target="30 s"
          remainingSeconds={8}
          onGo={() => {}}
          goTestID="go"
          pinned
        />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  expect(view.queryByTestId("movement-description")).toBeNull();
  const scroll = view.getByTestId("prep-movement");
  await fireEvent(scroll, "layout", { nativeEvent: { layout: { height: 90 } } });
  await fireEvent(scroll, "contentSizeChange", 360, 260);
  expect(view.getByTestId("prep-movement-fade")).toBeTruthy();
});
