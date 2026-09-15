import { act, render } from "@testing-library/react-native";
import { cancelAnimation, withRepeat } from "react-native-reanimated";
import { TamaguiProvider } from "tamagui";

import { FlameFlicker } from "@/components/common/FlameFlicker";
import { VillageEmbers } from "@/components/village/VillageEmbers";
import config from "@/tamagui.config";

/**
 * Tabs stay mounted. A loop that ignores focus keeps running under every other screen: the
 * village embers took the whole app from 16 to 30 ms a frame once the tab had been visited. Both
 * ambient animations must stop when their screen loses focus and start again when it comes back.
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
    withTiming: () => "timing",
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
    expect(withRepeat).toHaveBeenCalledTimes(4);

    mockFocused = false;
    await act(() => view.rerender(wrap(embers())));
    expect(view.toJSON()).toBeNull();

    mockFocused = true;
    await act(() => view.rerender(wrap(embers())));
    expect(view.toJSON()).not.toBeNull();
    expect(withRepeat).toHaveBeenCalledTimes(8);
  });
});
