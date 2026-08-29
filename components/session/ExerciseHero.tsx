import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ImageSourcePropType } from "react-native";
import { H1, YStack } from "tamagui";
import { rawColors } from "@/constants/rawColors";

type ExerciseHeroProps = {
  source: ImageSourcePropType;
  /** The movement's name, painted on the artwork rather than under it. */
  name: string;
  height: number;
  /** The screen colour the artwork fades into — a raw string, because gradients cannot take a token. */
  fadeTo: string;
  /** Safe-area top, so the scrim covers the status bar the art now runs behind. */
  topInset: number;
  /** Opens the movement's instructions. The art is the biggest, most obvious thing to tap. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * The exercise, at the size of the thing you are about to do.
 *
 * It replaces a bordered 16:10 box inset from the screen edge, which spent a third of the
 * available room on a picture and the rest on its own frame. Here the artwork *is* the top of
 * the screen: no border, no rounding, no padding, running under the status bar.
 *
 * Same construction as BossArena — art, a gradient scrim, text on top — because the boss fight
 * already proved that a painting carries a session screen better than a card does. The
 * difference is that this one has no card around it at all.
 */
export function ExerciseHero({
  source,
  name,
  height,
  fadeTo,
  topInset,
  onPress,
  accessibilityLabel,
}: ExerciseHeroProps) {
  return (
    <YStack
      height={height}
      width="100%"
      position="relative"
      bg="$surface"
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.92 } : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? accessibilityLabel : undefined}
    >
      {/* ponytail: the exercise art ships at 1024x768, so a full-bleed hero upscales it ~1.2x on
          a 3x screen and `cover` crops the sides. Re-export the assets wider (and as WebP, see
          docs/architecture/performance.md rule #2) if the softness ever reads as blur. */}
      <Image
        source={source}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={150}
      />

      {/* Top scrim: the HUD sits on painted art with no card behind it, and some of these
          paintings are bright. This is what holds its contrast, not decoration. Fully opaque at
          the very top: the character art reaches the asset's own edge, and without it the figure
          hard-clips against the status bar instead of fading out under the HUD. */}
      <LinearGradient
        colors={[rawColors.bgDark, rawColors.bgOverlay, "transparent"]}
        locations={[0, 0.4, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: topInset + 80 }}
        pointerEvents="none"
      />

      {/* Bottom scrim: ends on the screen's own background, so the artwork has no visible edge —
          which is the whole point of dropping the border. */}
      <LinearGradient
        colors={["transparent", fadeTo]}
        locations={[0, 0.85]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.round(height * 0.6),
        }}
        pointerEvents="none"
      />

      <H1
        position="absolute"
        b="$3"
        l="$4"
        r="$4"
        fontFamily="$heading"
        fontWeight="700"
        fontSize={32}
        lineHeight={36}
        color="$text"
        numberOfLines={2}
      >
        {name}
      </H1>
    </YStack>
  );
}
