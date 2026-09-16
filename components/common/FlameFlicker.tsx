import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FlameFlickerProps {
  /**
   * Size of the flame emoji
   */
  size?: number;
  /**
   * Whether to show the flicker animation
   */
  animate?: boolean;
}

/**
 * How many times the flame gusts when its screen takes focus. It is a greeting, not a metronome:
 * an endless loop drew 578 frames in 10 s of an untouched Home, held 16 % of a core on the UI
 * thread and 13 % on the render thread, and, because a Reanimated frame rewrites the window's
 * content, kept `uiautomator dump` from ever finding the window idle, on Home and on the village
 * (perf audit C7, measured again on 16/09). Four gusts are 4.8 s, which outlasts the look anyone
 * gives a streak counter, and leaving the tab and coming back plays them again. After them the
 * screen is still: 0 frames, 1.9 % of a core, and a dump that answers in 2 s.
 */
const GUSTS = 4;

/**
 * A flickering flame for the streak. Shared by the village scene and the home header.
 * Respects reduced motion preferences.
 *
 * Driven by a Reanimated worklet on the UI thread — the previous setInterval + setState
 * version re-rendered (and re-sprung through the JS thread) 2.5×/s for as long as the
 * home or village screen was mounted.
 *
 * Tabs stay mounted, so it also stops when its screen loses focus: the loop kept running under
 * every other screen and held the UI thread awake (perf audit C7). It starts again on return.
 */
export function FlameFlicker({ size = 48, animate = true }: FlameFlickerProps) {
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (!animate || reducedMotion || !focused) {
      cancelAnimation(flicker);
      flicker.value = 0;
      return;
    }
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(2, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      GUSTS,
    );
  }, [animate, reducedMotion, focused, flicker]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(flicker.value, [0, 1, 2], [1, 1.05, 0.98]) },
      { rotate: `${interpolate(flicker.value, [0, 1, 2], [0, 2, -2])}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text fontSize={size}>🔥</Text>
    </Animated.View>
  );
}
