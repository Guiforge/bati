import { useIsFocused } from "expo-router";
import { useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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

/**
 * How bright the motes burn, by tier. The count alone made a capital's sky busier than a
 * hamlet's but no warmer; scaling the peak as well is what makes the difference read as *more
 * fire* rather than *more dots*. Clamped so tier 1 is a suggestion and tier 12 still sits under
 * the artwork rather than on top of it.
 */
function emberPeak(tier: number): number {
  return Math.min(0.75, 0.42 + tier * 0.03);
}

type EmberProps = (typeof EMBERS)[number] & {
  heroHeight: number;
  heroWidth: number;
  peak: number;
};

function Ember({ left, start, size, duration, delay, heroHeight, heroWidth, peak }: EmberProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    // One linear climb, once. The fade lives in the interpolation, so a single value drives both
    // and they can never fall out of step.
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.linear }));
  }, [t, delay, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.65, 1], [0, peak, peak * 0.5, 0]),
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
 * Ambient embers drifting up off the village. No asset, transform and opacity only: with
 * `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` on (package.json), those two go straight to the native
 * view each frame. Anything else in the worklet, or the flag gone, and every frame of the climb
 * clones and commits the shadow tree, a layout pass on the UI thread. Before the flag, a
 * Fairphone 6 spent 48 % of its UI thread and missed every frame for the ten seconds the field
 * burns, with only two motes lit; the commit is the suspect the flag removes, see
 * docs/architecture/performance.md for what was measured and what was not.
 *
 * Returns nothing under reduced motion, so the views are never mounted rather than mounted and
 * held still. Nothing either while the tab is out of focus: tabs stay mounted, and the loops left
 * running under other screens took their frames from 16 to 30 ms (perf audit C1). Unmounting is
 * the pause, since `useSharedValue` cancels its animation on unmount; the embers start their
 * climb again when the hero comes back.
 *
 * They climb once per visit rather than for ever. Nine staggered loops that never ended drew 602
 * frames in 10 s of an untouched village, held 31 % of a core on the UI thread, and kept
 * `uiautomator dump` from ever finding the window idle, which takes Maestro and the accessibility
 * readers with it (perf audit C7). A rest cannot be shared here the way the flame rests between
 * gusts: nine motes on nine schedules always leave one of them moving, so the only quiet the
 * window ever gets is the one after the last climb. The field burns for about ten seconds, longer
 * than anyone looks at a painting, and lights again on the next visit. Measured on 16/09: once
 * the last mote is out, 0 frames and 1.5 % of a core, a dump in 2 s, and the village's own scroll
 * off a flat p50 of 31 ms with every frame janky, down to 16 to 25 ms over three passes.
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
  const focused = useIsFocused();
  if (reducedMotion || !focused) return null;

  return (
    <>
      {EMBERS.slice(0, emberCount(tier)).map((ember) => (
        <Ember
          key={ember.left}
          {...ember}
          heroHeight={heroHeight}
          heroWidth={heroWidth}
          peak={emberPeak(tier)}
        />
      ))}
    </>
  );
}
