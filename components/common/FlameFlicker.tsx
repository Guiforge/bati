import { useEffect } from "react";
import Animated, {
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
 * A flickering flame for the streak. Shared by the village scene and the home header.
 * Respects reduced motion preferences.
 *
 * Driven by a Reanimated worklet on the UI thread — the previous setInterval + setState
 * version re-rendered (and re-sprung through the JS thread) 2.5×/s for as long as the
 * home or village screen was mounted.
 */
export function FlameFlicker({ size = 48, animate = true }: FlameFlickerProps) {
  const reducedMotion = useReducedMotion();
  const flicker = useSharedValue(0);

  useEffect(() => {
    if (!animate || reducedMotion) {
      flicker.value = 0;
      return;
    }
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(2, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ),
      -1,
    );
  }, [animate, reducedMotion, flicker]);

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
