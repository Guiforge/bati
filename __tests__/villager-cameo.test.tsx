import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { cameoBottomOffset, cameoMaxHeight, cameoTopEdge } from "@/components/chorus/cameoAnchor";
import { VillagerCameo } from "@/components/chorus/VillagerCameo";
import { CAMEO_LINGER_MS, TYPE_MS_PER_CHAR } from "@/constants/villagers";
import en from "@/locales/en.json";
import { useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";
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

function speakGuide(line: string) {
  useChorusStore.setState({
    current: { id: 2, moment: "guide_village", villager: "farmer", pose: "talk", line },
  });
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
    // The real hook reads the real store. Mocking `useReducedMotion` would verify the cameo
    // against a stub and hide the day the hook stops reading that field.
    useSettingsStore.setState({ reducedMotion: false });
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
    // `box-none`, not `none`: the container itself never receives a touch, only the figure and
    // the bubble do. The safe-zone promise from PRODUCT.md ("never obstruct logging or reading
    // the next set") is `cameoAnchor`'s job — the anchor test below pins it down.
    expect(getByTestId("villager-cameo").props.pointerEvents).toBe("box-none");
  });

  it("leaves on its own, without anyone dismissing it", async () => {
    const { queryByText } = await renderCameo();

    await act(() => {
      speak();
    });
    await act(() => {
      jest.advanceTimersByTime(CAMEO_LINGER_MS.ambient + 1);
    });

    expect(queryByText(en.villagers.farmer.rest[0] as string)).toBeNull();
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("shows an ambient line whole, with nothing to wait for between two sets", async () => {
    const { getByText } = await renderCameo();

    await act(() => {
      speak();
    });

    // No typing: a villager glanced at mid-session must never be something the hero has to
    // finish reading.
    expect(getByText(en.villagers.farmer.rest[0] as string)).toBeTruthy();
  });

  // Both halves of the cameo, because "click on the villager" means the drawing as often as
  // the words.
  it.each(["villager-figure", "villager-bubble"])(
    "sends an ambient villager away on the first tap on %s",
    async (target) => {
      const { getByTestId } = await renderCameo();

      await act(() => {
        speak();
      });
      await act(async () => {
        // `includeHiddenElements`: the figure is deliberately out of the accessibility tree —
        // the bubble beside it offers the same dismiss with the sentence attached — and that is
        // exactly what this query hides by default. A finger still lands on it.
        // Awaited: this testing-library's fireEvent is thenable, and an unhandled one swallows
        // whatever the press handler threw.
        await fireEvent.press(getByTestId(target, { includeHiddenElements: true }));
      });

      // An ambient line is whole from the first frame, so there is nothing to finish first.
      expect(useChorusStore.getState().current).toBeNull();
    },
  );

  it("types a guide out, and a tap finishes it early", async () => {
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByTestId } = await renderCameo();

    await act(() => {
      speakGuide(guide);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 5);
    });

    // Probed on the visible span, not on the bubble's text: the untyped remainder is rendered
    // transparent so the bubble never grows mid-sentence, which means the whole string is in the
    // tree from the first frame and `getByText` would find it regardless.
    expect(getByTestId("villager-line").props.children).not.toBe(guide);

    await act(async () => {
      // Awaited: this testing-library's fireEvent is thenable, and an unhandled one swallows
      // whatever the press handler threw.
      await fireEvent.press(getByTestId("villager-bubble"));
    });

    expect(getByTestId("villager-line").props.children).toBe(guide);
  });

  it("finishes a typing guide from a tap on the figure too", async () => {
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByTestId } = await renderCameo();

    await act(() => {
      speakGuide(guide);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 5);
    });
    await act(async () => {
      await fireEvent.press(getByTestId("villager-figure", { includeHiddenElements: true }));
    });

    expect(getByTestId("villager-line").props.children).toBe(guide);
    expect(useChorusStore.getState().current).not.toBeNull();
  });

  it("sends the guide away on the tap after it has finished", async () => {
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByTestId } = await renderCameo();

    await act(() => {
      speakGuide(guide);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * guide.length + 1);
    });
    await act(async () => {
      // Awaited: this testing-library's fireEvent is thenable, and an unhandled one swallows
      // whatever the press handler threw.
      await fireEvent.press(getByTestId("villager-bubble"));
    });

    expect(useChorusStore.getState().current).toBeNull();
  });

  it("does not type at all under reduced motion", async () => {
    useSettingsStore.setState({ reducedMotion: true });
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByText } = await renderCameo();

    await act(() => {
      speakGuide(guide);
    });

    // A typewriter is motion. Someone who asked the OS for less of it gets the whole line at once.
    expect(getByText(guide)).toBeTruthy();
  });

  it("gives a screen reader the whole sentence, not the part typed so far", async () => {
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByTestId } = await renderCameo();

    await act(() => {
      speakGuide(guide);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 3);
    });

    expect(getByTestId("villager-bubble").props.accessibilityLabel).toBe(guide);
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
