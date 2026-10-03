import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { useTypedLine } from "@/components/chorus/useTypedLine";
import { VillagerLine } from "@/components/chorus/VillagerLine";
import { CAMEO_LINGER_MS, TYPE_MS_PER_CHAR } from "@/constants/villagers";
import en from "@/locales/en.json";
import { type Cameo, type CueOwner, useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({
  preferences: {
    getRecentCameoLines: jest.fn().mockResolvedValue([]),
    setRecentCameoLines: jest.fn().mockResolvedValue(undefined),
    getGuidesSeen: jest.fn().mockResolvedValue([]),
    setGuidesSeen: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));

let mockFocused = true;
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));

const REST_LINE = en.villagers.farmer.rest[0] as string;
const GUIDE = en.villagers.farmer.guide_village[0] as string;

function tree(reserve?: number, owner: CueOwner = "rest") {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillagerLine owner={owner} reserve={reserve} />
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

function speak(moment: "rest" | "guide_village", line: string, id = 1, owner: CueOwner = "rest") {
  useChorusStore.setState({
    current: { id, owner, moment, villager: "farmer", pose: "talk", line },
  });
}

describe("VillagerLine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    useSettingsStore.setState({ reducedMotion: false });
    useChorusStore.setState({ current: null });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("draws nothing when nobody speaks and no slot is asked for", async () => {
    const { queryByTestId } = await render(tree());
    expect(queryByTestId("villager-line-block")).toBeNull();
  });

  it("shows the line and carries nothing a touch could land on", async () => {
    const { getByText, getByTestId, toJSON } = await render(tree());
    await act(() => {
      speak("rest", REST_LINE);
    });

    expect(getByText(REST_LINE)).toBeTruthy();
    const block = getByTestId("villager-line-block");
    // Plain text for a screen reader, and not a control: no role, no responder.
    expect(block.props.accessibilityRole).toBeUndefined();
    expect(block.props.accessibilityLabel).toContain(REST_LINE);
    expect(block.props.onPress).toBeUndefined();
    expect(block.props.onStartShouldSetResponder).toBeUndefined();
    // Nothing anywhere in the rendered tree takes a press.
    const pressable: string[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      const n = node as { props?: Record<string, unknown>; children?: unknown };
      for (const key of ["onPress", "onPressIn", "onPressOut", "onResponderGrant"]) {
        if (typeof n.props?.[key] === "function") pressable.push(key);
      }
      walk(n.children);
    };
    walk(toJSON());
    expect(pressable).toEqual([]);
  });

  it("stays well past the old linger time while its screen is focused", async () => {
    const { queryByText } = await render(tree());
    await act(() => {
      speak("rest", REST_LINE);
    });
    await act(() => {
      jest.advanceTimersByTime(CAMEO_LINGER_MS.ambient * 10);
    });

    expect(queryByText(REST_LINE)).toBeTruthy();
    expect(useChorusStore.getState().current).not.toBeNull();
  });

  it("is dismissed when its screen loses focus", async () => {
    const { queryByText, rerender } = await render(tree());
    await act(() => {
      speak("rest", REST_LINE);
    });

    mockFocused = false;
    await act(async () => {
      await rerender(tree());
    });

    expect(queryByText(REST_LINE)).toBeNull();
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("is dismissed when its screen unmounts", async () => {
    const { unmount } = await render(tree());
    await act(() => {
      speak("rest", REST_LINE);
    });
    await act(async () => {
      await unmount();
    });
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("is not drawn by a screen that is not focused, and does not dismiss the cue meant for another", async () => {
    mockFocused = false;
    const { queryByText } = await render(tree());
    await act(() => {
      speak("rest", REST_LINE);
    });
    expect(queryByText(REST_LINE)).toBeNull();
    expect(useChorusStore.getState().current).not.toBeNull();
  });

  // A cue has one screen. Drawing whatever was current put the Village's guide (cued during a
  // load) on the next tab's line, and tab A's line on tab B for a frame.
  it("does not draw, nor dismiss, a cue another screen owns", async () => {
    const { queryByText, rerender } = await render(tree(undefined, "quests"));
    await act(() => {
      speak("rest", REST_LINE, 1, "village");
    });
    expect(queryByText(REST_LINE)).toBeNull();

    mockFocused = false;
    await act(async () => {
      await rerender(tree(undefined, "quests"));
    });
    expect(useChorusStore.getState().current?.owner).toBe("village");
  });

  it("draws its own cue, and dismisses it on blur", async () => {
    const { queryByText, rerender } = await render(tree(undefined, "quests"));
    await act(() => {
      speak("rest", REST_LINE, 1, "quests");
    });
    expect(queryByText(REST_LINE)).toBeTruthy();

    mockFocused = false;
    await act(async () => {
      await rerender(tree(undefined, "quests"));
    });
    expect(useChorusStore.getState().current).toBeNull();
  });

  it("types a guide at its final size, and never an ambient line", async () => {
    const { getByTestId } = await render(tree());
    await act(() => {
      speak("guide_village", GUIDE);
    });
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * 5);
    });
    expect(getByTestId("villager-line").props.children).not.toBe(GUIDE);

    await act(() => {
      speak("rest", REST_LINE, 2);
    });
    expect(getByTestId("villager-line").props.children).toBe(REST_LINE);
  });

  it("does not type under reduced motion", async () => {
    useSettingsStore.setState({ reducedMotion: true });
    const { getByTestId } = await render(tree());
    await act(() => {
      speak("guide_village", GUIDE);
    });
    expect(getByTestId("villager-line").props.children).toBe(GUIDE);
  });

  it("keeps a slot of fixed height, whether or not a villager comes", async () => {
    const { getByTestId } = await render(tree(88));
    const before = getByTestId("villager-line-slot").props.style;
    await act(() => {
      speak("rest", REST_LINE);
    });
    const after = getByTestId("villager-line-slot").props.style;

    expect(before).toBeDefined();
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    expect(JSON.stringify(before)).toMatch(/"height":\d+/);
  });
});

/**
 * A guide that replaces a line already shown in full (the Village's ambient cue, then its guide
 * after the async read) was drawn for one frame with as many of its characters as the old line
 * had, then blanked and typed: a flash of the sentence before it starts.
 */
describe("useTypedLine", () => {
  it("starts a new line from nothing on its very first frame", async () => {
    useSettingsStore.setState({ reducedMotion: false });
    const frames: string[] = [];
    function Probe({ cameo }: { cameo: Cameo }) {
      frames.push(useTypedLine(cameo).shown);
      return null;
    }
    const ambient: Cameo = {
      id: 1,
      owner: "village",
      moment: "village_visit",
      villager: "farmer",
      pose: "talk",
      line: REST_LINE,
    };
    const guide: Cameo = { ...ambient, id: 2, moment: "guide_village", line: GUIDE };

    jest.useFakeTimers();
    const { rerender } = await render(<Probe cameo={ambient} />);
    expect(frames.at(-1)).toBe(REST_LINE);

    frames.length = 0;
    await rerender(<Probe cameo={guide} />);
    expect(frames[0]).toBe("");

    // And after a line that typed itself out, too.
    await act(() => {
      jest.advanceTimersByTime(TYPE_MS_PER_CHAR * (GUIDE.length + 1));
    });
    expect(frames.at(-1)).toBe(GUIDE);
    frames.length = 0;
    await rerender(<Probe cameo={{ ...guide, id: 3, line: REST_LINE }} />);
    expect(frames[0]).toBe("");
    jest.useRealTimers();
  });
});
