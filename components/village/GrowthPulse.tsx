import type { ReactNode } from "react";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const AnimatedView = Animated.View;

/**
 * Wraps a just-grown building tile: one pulse on arrival, then it settles — the scene
 * reacting to what you just did, not a permanent badge to manage.
 */
export function GrowthPulse({ active, children }: { active: boolean; children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active || reducedMotion) return;
    scale.value = withSequence(
      withTiming(1.06, { duration: 260 }),
      withTiming(1, { duration: 260 }),
    );
  }, [active, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!active) return <>{children}</>;

  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
}
