import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { cameoBottomOffset, cameoMaxHeight, cameoTopEdge } from "@/components/chorus/cameoAnchor";
import { VillagerCameo } from "@/components/chorus/VillagerCameo";
import { CAMEO_DURATION_MS } from "@/constants/villagers";
import en from "@/locales/en.json";
import { useChorusStore } from "@/stores/chorus";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({
  preferences: {
    getRecentCameoLines: jest.fn().mockResolvedValue([]),
    setRecentCameoLines: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));

const mockSegments = jest.fn(() => ["(tabs)", "index"]);
jest.mock("expo-router", () => ({ useSegments: () => mockSegments() }));

const WINDOW = { width: 390, height: 844 };

function renderCameo() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, ...WINDOW },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillagerCameo />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

function speak() {
  useChorusStore.setState({
    current: {
      id: 1,
      moment: "rest",
      villager: "farmer",
      pose: "talk",
      line: en.villagers.farmer.rest[0] as string,
    },
  });
}

describe("VillagerCameo", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useChorusStore.setState({ current: null });
  });

  // No state reset here: testing-library unmounts between tests, so a `setState` after that is an
  // update to a component nobody is rendering — which is exactly what React's act() warning was
  // pointing at. `beforeEach` already clears it.
  afterEach(() => {
    jest.useRealTimers();
  });

  it("draws nothing at all when nobody is speaking", async () => {
    const { queryByTestId } = await renderCameo();
    expect(queryByTestId("villager-cameo")).toBeNull();
  });

  it("shows the line, and never intercepts a tap meant for the screen underneath", async () => {
    const { getByText, getByTestId } = await renderCameo();

    await act(() => {
      speak();
    });

    expect(getByText(en.villagers.farmer.rest[0] as string)).toBeTruthy();
    // The entire safe-zone promise rests on this prop. PRODUCT.md: "never obstruct logging or
    // reading the next set" — a villager that swallows the "done" tap breaks the app's one rule.
    expect(getByTestId("villager-cameo").props.pointerEvents).toBe("none");
  });

  it("leaves on its own, without anyone dismissing it", async () => {
    const { queryByText } = await renderCameo();

    await act(() => {
      speak();
    });
    await act(() => {
      jest.advanceTimersByTime(CAMEO_DURATION_MS.ambient + 1);
    });

    expect(queryByText(en.villagers.farmer.rest[0] as string)).toBeNull();
    expect(useChorusStore.getState().current).toBeNull();
  });
});

describe("cameo anchor", () => {
  it("stays clear of the band every screen puts its primary button in", () => {
    expect(cameoBottomOffset(0)).toBeGreaterThanOrEqual(96);
    expect(cameoBottomOffset(24)).toBe(cameoBottomOffset(0) + 24);
  });

  /**
   * The regression this locks down was found by running the app, not by this suite.
   * `cameoMaxHeight` first returned the design's *ceiling* (38% of the window) instead of its
   * target, so on a 372x828dp phone the villager was 314dp tall and 236dp wide and sat squarely
   * on the rest screen's "I'm ready" button. The old test asserted the ceiling was respected —
   * which it was — and said nothing about the button, so it passed while the one product rule
   * this layer must obey was broken on screen.
   */
  it("leaves the hero's own screen to the hero", () => {
    const height = cameoMaxHeight(WINDOW.width, WINDOW.height);
    const width = height * 0.75;

    // A figure, not a takeover: under a quarter of the height and under half the width.
    expect(height).toBeLessThanOrEqual(WINDOW.height * 0.25);
    expect(width).toBeLessThan(WINDOW.width * 0.5);
    // And the bubble beside it gets enough room for the longest word in either language.
    expect(WINDOW.width - width - 40).toBeGreaterThan(150);
  });

  it("never reaches into the bottom action band, on any window it can be given", () => {
    for (const [w, h] of [
      [320, 568], // the smallest phone still supported
      [372, 828], // the device this was caught on
      [844, 390], // landscape / split screen
      [800, 1280], // tablet
    ] as const) {
      const top = cameoTopEdge(w, h, 24);
      const bottom = h - cameoBottomOffset(24);
      expect(top).toBeGreaterThan(0);
      expect(bottom).toBeLessThan(h);
      // The figure occupies [top, bottom]; everything below `bottom` stays the screen's own.
      expect(bottom - top).toBe(cameoMaxHeight(w, h));
    }
  });
});
