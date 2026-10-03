import assert from "node:assert/strict";

import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import VillagePage from "@/app/(tabs)/village";
import { cameoBand } from "@/components/chorus/cameoAnchor";
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

let mockFocused = true;
let mockSceneLoading = false;
const mockUnderneath = jest.fn();
// The real hero is itself pressable (it opens the whole painting), and the zone is its child.
const mockPainting = jest.fn();
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));
jest.mock("@/components/chorus/screenCues", () => ({
  useScreenGuide: jest.fn(),
  useAmbientVisit: jest.fn(),
}));
// The scene is a stand-in shaped like the real one (the real one is covered in
// village-scene.test.tsx): a hero holding the figure, and a control below it that a press on the
// figure must never reach.
jest.mock("@/components/village/VillageScene", () => {
  const { View, Pressable, Text } = require("react-native");
  const { VillagerCameo } = require("@/components/chorus/VillagerCameo");
  return {
    VillageScene: () => (
      <View>
        <Pressable
          testID="village-hero"
          onPressIn={() => mockPainting()}
          onPress={() => mockPainting()}
        >
          {mockSceneLoading ? null : (
            <VillagerCameo band={{ top: 55, height: 300, figureHeight: 180 }} />
          )}
        </Pressable>
        <Pressable testID="under-the-villager" onPress={() => mockUnderneath()}>
          <Text>building</Text>
        </Pressable>
      </View>
    ),
  };
});

const WINDOW = { width: 390, height: 844 };

function villageTree() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, ...WINDOW },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillagePage />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

function renderVillage() {
  return render(villageTree());
}

function speakGuide(line: string) {
  useChorusStore.setState({
    current: {
      id: 2,
      owner: "village",
      moment: "guide_village",
      villager: "farmer",
      pose: "talk",
      line,
    },
  });
}

function speak() {
  useChorusStore.setState({
    current: {
      id: 1,
      owner: "village",
      moment: "rest",
      villager: "farmer",
      pose: "talk",
      line: en.villagers.farmer.rest[0] as string,
    },
  });
}

describe("the Village's floating villager", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    mockSceneLoading = false;
    mockUnderneath.mockClear();
    mockPainting.mockClear();
    useSettingsStore.setState({ reducedMotion: false });
    useChorusStore.setState({ current: null });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("draws nothing at all when nobody is speaking", async () => {
    const { queryByTestId } = await renderVillage();
    expect(queryByTestId("villager-cameo")).toBeNull();
    expect(queryByTestId("villager-zone")).toBeNull();
  });

  it("shows the line", async () => {
    const { getByText } = await renderVillage();
    await act(() => {
      speak();
    });
    expect(getByText(en.villagers.farmer.rest[0] as string)).toBeTruthy();
  });

  it("is sent away on press-in, and the press stops there", async () => {
    const { getByTestId, queryByTestId } = await renderVillage();
    await act(() => {
      speak();
    });

    await act(() => {
      fireEvent(getByTestId("villager-zone"), "pressIn");
    });

    expect(useChorusStore.getState().current).toBeNull();
    expect(queryByTestId("villager-cameo")).toBeNull();
    // The zone takes the press itself: the painting it stands in (pressable, it opens the scene)
    // never hears of it.
    expect(mockPainting).not.toHaveBeenCalled();
    expect(mockUnderneath).not.toHaveBeenCalled();
  });

  it("makes the zone one generous button for a screen reader, with the sentence readable", async () => {
    const { getByTestId } = await renderVillage();
    await act(() => {
      speakGuide(en.villagers.farmer.guide_village[0] as string);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 3);
    });

    const zone = getByTestId("villager-zone");
    expect(zone.props.accessibilityRole).toBe("button");
    // The sentence is in the label, not the hint: a user with hints off must still hear it. The
    // whole sentence, not the part typed so far.
    expect(zone.props.accessibilityLabel).toContain(en.villagers.farmer.guide_village[0] as string);
    expect(zone.props.accessibilityLabel).toContain("villagers.names.farmer");
    expect(zone.props.accessibilityHint).toBe("villagers.send_away");
  });

  // TalkBack and VoiceOver activate with a click, which calls `onPress` and never `onPressIn`.
  it("is sent away by an accessibility activation too", async () => {
    const { getByTestId } = await renderVillage();
    await act(() => {
      speak();
    });
    await fireEvent.press(getByTestId("villager-zone"));
    expect(useChorusStore.getState().current).toBeNull();
    expect(mockPainting).not.toHaveBeenCalled();
  });

  // The scene is a skeleton while it loads and the figure is not mounted: the page, which is, owns
  // the cue, or a guide cued then would be typed on the next tab's line.
  it("dismisses the Village's cue on blur even while the scene is still loading", async () => {
    mockSceneLoading = true;
    const { rerender } = await renderVillage();
    await act(() => {
      speakGuide(en.villagers.farmer.guide_village[0] as string);
    });
    expect(useChorusStore.getState().current).not.toBeNull();

    mockFocused = false;
    await act(async () => {
      await rerender(villageTree());
    });
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("names the speaker in the bubble", async () => {
    const { getByText } = await renderVillage();
    await act(() => {
      speak();
    });
    expect(getByText("villagers.names.farmer")).toBeTruthy();
  });

  it("does not adopt another screen's cue", async () => {
    const { queryByTestId } = await renderVillage();
    await act(() => {
      useChorusStore.setState({
        current: {
          id: 5,
          owner: "journal",
          moment: "guide_journal",
          villager: "herbalist",
          pose: "talk",
          line: "Not for the Village.",
        },
      });
    });
    expect(queryByTestId("villager-cameo")).toBeNull();
    expect(useChorusStore.getState().current?.owner).toBe("journal");
  });

  it("asks for no guide on a window with no room for the figure", async () => {
    const { useScreenGuide, useAmbientVisit } = jest.requireMock(
      "@/components/chorus/screenCues",
    ) as { useScreenGuide: jest.Mock; useAmbientVisit: jest.Mock };
    useScreenGuide.mockClear();
    useAmbientVisit.mockClear();
    // 841x701 dp, an unfolded foldable: the hero is a short band with no room above the title.
    const dims = jest.spyOn(require("react-native"), "useWindowDimensions").mockReturnValue({
      width: 841,
      height: 701,
      scale: 1,
      fontScale: 1,
    });
    await renderVillage();
    dims.mockRestore();
    expect(useScreenGuide).toHaveBeenCalledWith("guide_village", { enabled: false });
    expect(useAmbientVisit).toHaveBeenCalledWith("village_visit", { enabled: false });
  });

  it("lets a press elsewhere reach the screen, and sends the villager away on the way", async () => {
    const { getByTestId, queryByTestId } = await renderVillage();
    await act(() => {
      speak();
    });

    const watch = getByTestId("village-touch-watch");
    let claimed = true;
    await act(() => {
      claimed = watch.props.onStartShouldSetResponderCapture();
    });
    expect(claimed).toBe(false);
    expect(useChorusStore.getState().current).toBeNull();
    expect(queryByTestId("villager-cameo")).toBeNull();

    await fireEvent.press(getByTestId("under-the-villager"));
    expect(mockUnderneath).toHaveBeenCalledTimes(1);
  });

  it("does not take a first tap to finish the line: one press-in and it is gone, mid-sentence", async () => {
    const { getByTestId } = await renderVillage();
    await act(() => {
      speakGuide(en.villagers.farmer.guide_village[0] as string);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 5);
    });
    await act(() => {
      fireEvent(getByTestId("villager-zone"), "pressIn");
    });
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("leaves on its own after the linger", async () => {
    const { queryByText } = await renderVillage();
    await act(() => {
      speak();
    });
    await act(() => {
      jest.advanceTimersByTime(CAMEO_LINGER_MS.ambient + 1);
    });
    expect(queryByText(en.villagers.farmer.rest[0] as string)).toBeNull();
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("leaves when the hero leaves the Village", async () => {
    const { rerender } = await renderVillage();
    await act(() => {
      speak();
    });
    mockFocused = false;
    await act(async () => {
      await rerender(villageTree());
    });
    expect(useChorusStore.getState().current).toBeNull();
  });

  // Journal day one showed no guide. The Village tab stays mounted once visited, and its figure
  // took every cue raised while it was unfocused for its own and dismissed it: the Journal's guide
  // was cued, then sent away by a screen nobody was looking at.
  it("does not dismiss a cue raised for another screen while the Village is not focused", async () => {
    mockFocused = false;
    const { queryByTestId } = await renderVillage();
    await act(() => {
      useChorusStore.setState({
        current: {
          id: 6,
          owner: "journal",
          moment: "guide_journal",
          villager: "herbalist",
          pose: "talk",
          line: en.villagers.herbalist.guide_journal[0] as string,
        },
      });
    });
    // Long enough to type it out and outlive any linger: an unfocused Village must never draw it
    // or time it out.
    await act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(queryByTestId("villager-cameo")).toBeNull();
    expect(useChorusStore.getState().current?.owner).toBe("journal");
  });

  it("types a guide out, and not under reduced motion", async () => {
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByTestId } = await renderVillage();
    await act(() => {
      speakGuide(guide);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 5);
    });
    expect(getByTestId("villager-line").props.children).not.toBe(guide);
  });

  it("does not type at all under reduced motion", async () => {
    useSettingsStore.setState({ reducedMotion: true });
    const guide = en.villagers.farmer.guide_village[0] as string;
    const { getByTestId } = await renderVillage();
    await act(() => {
      speakGuide(guide);
    });
    expect(getByTestId("villager-line").props.children).toBe(guide);
  });
});

describe("cameo band", () => {
  it("stays inside the painting, above the title block, on every window it can be given", () => {
    for (const hero of [390, 520, 700]) {
      const band = cameoBand(hero, 47, hero);
      assert(band);
      expect(band.top).toBeGreaterThanOrEqual(47);
      // 150 is the title block: nothing the zone covers is a card or the village name.
      expect(band.top + band.height).toBeLessThanOrEqual(hero - 150);
      expect(band.figureHeight).toBeLessThanOrEqual(band.height);
    }
  });

  it("gives no band to a hero too short to hold a figure, rather than one over the title", () => {
    expect(cameoBand(224, 47, 360)).toBeNull();
  });

  it("is a figure, not a takeover: under half the column wide", () => {
    const band = cameoBand(700, 24, 700);
    assert(band);
    expect(band.figureHeight * 0.75).toBeLessThan(700 * 0.5);
  });

  it("leaves the villager home when there is no band", async () => {
    // Not rendered by the Village stand-in with a band: render the figure bare with none.
    useChorusStore.setState({ current: null });
    const { queryByTestId } = await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillagerCameo band={null} />
      </TamaguiProvider>,
    );
    await act(() => {
      speak();
    });
    expect(queryByTestId("villager-zone")).toBeNull();
    expect(useChorusStore.getState().current).toBeNull();
  });
});
