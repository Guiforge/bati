import { act, render } from "@testing-library/react-native";
import { cancelAnimation, withRepeat, withTiming } from "react-native-reanimated";
import { TamaguiProvider } from "tamagui";

import { FlameFlicker } from "@/components/common/FlameFlicker";
import { VillageEmbers } from "@/components/village/VillageEmbers";
import config from "@/tamagui.config";

/**
 * Tabs stay mounted. A loop that ignores focus keeps running under every other screen: the
 * village embers took the whole app from 16 to 30 ms a frame once the tab had been visited. Both
 * ambient animations must stop when their screen loses focus and start again when it comes back.
 *
 * Focus was only half of it. A loop with no end also keeps the *visible* screen awake: every
 * Reanimated frame rewrites the window's content, so Home drew 578 frames in 10 s of being
 * untouched and the village 602, and `uiautomator dump` never found either window idle, which
 * takes Maestro and the accessibility readers with it (perf audit C7). Both effects now run a
 * bounded burst and stop, so the second half of this file guards the count: an infinite repeat
 * is what regressed, and it is one character away.
 */

// Reanimated needs a native worklets module jest-expo doesn't install. A shared value here is a
// plain box, so the test reads what the component asked the UI thread to run.
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    Easing: { linear: (t: number) => t },
    cancelAnimation: jest.fn(),
    interpolate: () => 0,
    useAnimatedStyle: () => ({}),
    useSharedValue: (v: unknown) => require("react").useState(() => ({ value: v }))[0],
    withDelay: (_ms: number, animation: unknown) => animation,
    withRepeat: jest.fn(() => "loop"),
    withSequence: () => "sequence",
    withTiming: jest.fn(() => "timing"),
  };
});

let mockFocused = true;
jest.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const wrap = (node: React.ReactNode) => (
  <TamaguiProvider config={config} defaultTheme="dark">
    {node}
  </TamaguiProvider>
);

describe("ambient animations follow screen focus", () => {
  beforeEach(() => {
    mockFocused = true;
    jest.clearAllMocks();
  });

  it("cancels the flame's loop when the screen loses focus, and restarts it on return", async () => {
    const view = await render(wrap(<FlameFlicker />));
    expect(withRepeat).toHaveBeenCalledTimes(1);
    expect(cancelAnimation).not.toHaveBeenCalled();

    mockFocused = false;
    await act(() => view.rerender(wrap(<FlameFlicker />)));
    expect(cancelAnimation).toHaveBeenCalledTimes(1);
    const flicker = jest.mocked(cancelAnimation).mock.calls[0]?.[0] as { value: unknown };
    expect(flicker.value).toBe(0);

    mockFocused = true;
    await act(() => view.rerender(wrap(<FlameFlicker />)));
    expect(withRepeat).toHaveBeenCalledTimes(2);
    expect(flicker.value).toBe("loop");
  });

  it("unmounts the embers while the village is out of focus", async () => {
    // A fresh element each time: React skips a child whose element is the same object.
    const embers = () => <VillageEmbers heroHeight={400} heroWidth={400} tier={3} />;
    const view = await render(wrap(embers()));
    expect(view.toJSON()).not.toBeNull();
    expect(withTiming).toHaveBeenCalledTimes(4);

    mockFocused = false;
    await act(() => view.rerender(wrap(embers())));
    expect(view.toJSON()).toBeNull();

    mockFocused = true;
    await act(() => view.rerender(wrap(embers())));
    expect(view.toJSON()).not.toBeNull();
    expect(withTiming).toHaveBeenCalledTimes(8);
  });
});

describe("ambient animations end on their own", () => {
  beforeEach(() => {
    mockFocused = true;
    jest.clearAllMocks();
  });

  it("gusts the flame a fixed number of times instead of looping for ever", async () => {
    await render(wrap(<FlameFlicker />));
    const repeats = jest.mocked(withRepeat).mock.calls[0]?.[1];
    expect(repeats).toBeGreaterThan(0);
    // 1.2 s a gust: long enough to be seen on arrival, short enough that the window goes idle
    // while the hero is still reading the screen.
    expect(repeats).toBeLessThanOrEqual(8);
  });

  it("gives each ember one climb and no repeat", async () => {
    await render(wrap(<VillageEmbers heroHeight={400} heroWidth={400} tier={3} />));
    expect(withTiming).toHaveBeenCalledTimes(4);
    expect(withRepeat).not.toHaveBeenCalled();
  });
});
