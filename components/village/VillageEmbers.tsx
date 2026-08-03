import { useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { YStack } from "tamagui";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Fixed, not random: a village that reshuffles its embers every time you open the tab reads as
 * a screensaver. The same motes in the same places read as the same place, still burning.
 *
 * `left` is a fraction of the hero width, `start` a fraction of its height — the embers rise out
 * of the middle band, where every tier illustration puts its rooftops and its fires. They stop
 * short of the bottom on purpose: that is where the title sits, and a mote crossing a word is
 * a smudge, not atmosphere.
 *
 * The list is read from the front, so raising the count with the tier *adds* fires without moving
 * the ones already there — a hamlet with one chimney does not suddenly rearrange itself into a
 * capital, it gains lights.
 */
const EMBERS = [
  { left: 0.13, start: 0.62, size: 3, duration: 5200, delay: 0 },
  { left: 0.28, start: 0.7, size: 2, duration: 6600, delay: 1500 },
  { left: 0.46, start: 0.58, size: 2, duration: 5800, delay: 900 },
  { left: 0.62, start: 0.68, size: 3, duration: 7200, delay: 2600 },
  { left: 0.77, start: 0.64, size: 2, duration: 6100, delay: 400 },
  { left: 0.89, start: 0.72, size: 2, duration: 6800, delay: 3300 },
  { left: 0.2, start: 0.55, size: 2, duration: 7600, delay: 2000 },
  { left: 0.37, start: 0.66, size: 3, duration: 6300, delay: 4100 },
  { left: 0.7, start: 0.56, size: 2, duration: 7000, delay: 1200 },
] as const;

/**
 * How many of them burn, by village tier. One chimney at the hamlet, the whole skyline at the
 * eternal capital — the motion itself carries the progression, not just the painting behind it.
 */
function emberCount(tier: number): number {
  return Math.min(EMBERS.length, tier + 1);
}

/** How far up the hero an ember climbs before it dies, as a fraction of the hero height. */
const DRIFT = 0.42;

type EmberProps = (typeof EMBERS)[number] & { heroHeight: number; heroWidth: number };

function Ember({ left, start, size, duration, delay, heroHeight, heroWidth }: EmberProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    // One linear climb, looped. The fade lives in the interpolation, so a single value drives
    // both and they can never fall out of step.
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1));
  }, [t, delay, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.65, 1], [0, 0.6, 0.3, 0]),
    transform: [
      { translateY: -t.value * heroHeight * DRIFT },
      // A lazy sideways sway, half a period per climb, so they don't rise like an elevator.
      { translateX: interpolate(t.value, [0, 0.5, 1], [0, size * 2.5, 0]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: heroWidth * left,
          top: heroHeight * start,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <YStack width="100%" height="100%" rounded={size} bg="$resourceGold" />
    </Animated.View>
  );
}

/**
 * Ambient embers drifting up off the village. No asset, no layout cost, transform and opacity
 * only — the two properties Reanimated can drive without touching the JS thread
 * (docs/architecture/performance.md).
 *
 * Returns nothing under reduced motion, so the views are never mounted rather than mounted and
 * held still.
 */
export function VillageEmbers({
  heroHeight,
  heroWidth,
  tier,
}: {
  heroHeight: number;
  heroWidth: number;
  tier: number;
}) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <>
      {EMBERS.slice(0, emberCount(tier)).map((ember) => (
        <Ember key={ember.left} {...ember} heroHeight={heroHeight} heroWidth={heroWidth} />
      ))}
    </>
  );
}
