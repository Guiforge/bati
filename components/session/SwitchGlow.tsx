import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { rawColors } from "@/constants/rawColors";

/** Deep enough to be seen from the floor, out of the corner of an eye. */
const GLOW_DP = 96;
const FADE_MS = 250;

/**
 * The last seconds before a per-side hold changes sides, felt at the edges of the screen.
 *
 * The product owner's idea, from games: colour around the edges says "something is about to
 * happen" to someone who is not reading. Kept to what the persona audit of 2026-10-07 let through:
 *
 * - Top and bottom only. The boss arena already breathes `$error` on its left and right edges when
 *   the boss enrages, so a frame all round, or one that pulsed, would read as "you are being hit".
 * - One colour, the braise of "get ready to switch sides", and no meaning carried by hue alone:
 *   braise and green are the pair deuteranopia confuses.
 * - Static. It fades in and stays; nothing loops (docs/architecture/performance.md).
 * - Nothing for "almost done": the end of a hold asks nothing of the hero, the clock runs on into
 *   overtime and the bar already turns green.
 *
 * Always mounted, only its opacity moves, so the screen under it never changes shape.
 */
export function SwitchGlow({
  visible,
  reducedMotion,
}: {
  visible: boolean;
  reducedMotion: boolean;
}) {
  const opacity = visible ? 1 : 0;
  // Reanimated rather than a Tamagui `transition`, the same split `ExerciseHero` makes: the Tamagui
  // prop on this layer kept its first opacity in jest, so nothing could assert the glow. Under
  // reduced motion it is a plain style, and simply cuts.
  const fade = useAnimatedStyle(
    () => ({ opacity: withTiming(opacity, { duration: FADE_MS }) }),
    [opacity],
  );

  return (
    <Animated.View
      testID="session-switch-glow"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, reducedMotion ? { opacity } : fade]}
    >
      <LinearGradient
        colors={[rawColors.warningGlow, "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: GLOW_DP }}
      />
      <LinearGradient
        colors={["transparent", rawColors.warningGlow]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: GLOW_DP }}
      />
    </Animated.View>
  );
}
