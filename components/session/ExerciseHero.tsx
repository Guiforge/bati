import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ImageSourcePropType } from "react-native";
import { H1, YStack } from "tamagui";
import { rawColors } from "@/constants/rawColors";

type ExerciseHeroProps = {
  source: ImageSourcePropType;
  /** The movement's name, painted on the artwork rather than under it. */
  name: string;
  /** Floor for the picture band, below the HUD. The hero grows past it to fill the column. */
  minHeight: number;
  /** The screen colour the artwork fades into — a raw string, because gradients cannot take a token. */
  fadeTo: string;
  /** Safe-area top: the picture starts below it and the HUD row, so the figure's head is no
   *  longer painted under the status bar (see the top-scrim note below). */
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
/** The floating HUD row in ActiveExerciseView: 8 top + ~36 row + 8 gap + 3 hairline. */
const HUD_HEIGHT = 56;

export function ExerciseHero({
  source,
  name,
  minHeight,
  fadeTo,
  topInset,
  onPress,
  accessibilityLabel,
}: ExerciseHeroProps) {
  return (
    <YStack
      // Plain RN flex, not Tamagui's `flex={1}`: without a `styleCompat`, Tamagui expands that to
      // `flexBasis: auto`, and the hero then sizes to its content instead of to the column.
      style={{ flex: 1 }}
      minH={topInset + HUD_HEIGHT + minHeight}
      width="100%"
      position="relative"
      bg="$bgDark"
      pt={topInset + HUD_HEIGHT}
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.92 } : undefined}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
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

      {/* Top scrim: the status bar's own band, and barely past it.

          It used to run `topInset + 80` — around 120dp on a punch-hole phone, opaque to ~48dp.
          The exercise art is 1280x1280 in a slot that is nearly square, so `cover` crops about 5%
          and the figure is very nearly all in frame: the head lands ~21dp down and the shoulders
          and arms between 40 and 120. All of it was under that wash. On a lunge, knee-over-ankle
          and the trailing arm *are* the instruction, and the app was painting over them.

          Same argument as the bottom scrim one gradient down: this was holding contrast for the
          HUD *and* covering the status bar, and only the second needs the paint. The HUD row
          carries its own shadow now (ActiveExerciseView), so this ends just past the inset.

          What it cannot fix: the head sits *inside* the status bar band, because the artwork runs
          full-bleed under it. No scrim setting reveals those pixels — that one is a layout
          decision, not a gradient. */}
      <LinearGradient
        colors={[rawColors.bgDark, rawColors.bgOverlay, "transparent"]}
        locations={[0, 0.6, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: topInset + 28 }}
        pointerEvents="none"
      />

      {/* Bottom scrim: ends on the screen's own background, so the artwork has no visible edge —
          which is the whole point of dropping the border.

          It used to cover 60% of the hero and reach full `fadeTo` at 85% of that, so on a 354dp
          hero the painting was washed from 142dp down and painted over outright for the last
          32dp. On the darker illustrations the movement itself disappeared into it.

          The reason it had to be that heavy was the title below, not the seam: one gradient was
          holding contrast for the H1 *and* dissolving the edge. The H1 carries its own shadow
          now, so this only has the edge left to do — 38% of the hero, solid for the last tenth of
          itself, which is all it takes to hide a seam. About 78dp of painting handed back. */}
      <LinearGradient
        colors={["transparent", fadeTo]}
        locations={[0, 0.9]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
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
        fontSize={20}
        lineHeight={24}
        color="$text"
        // Its own contrast, so the scrim above does not have to supply it by covering the
        // painting. Same trick the onboarding titles use over their full-bleed art.
        textShadowColor="rgba(6, 8, 18, 0.85)"
        textShadowOffset={{ width: 0, height: 2 }}
        textShadowRadius={6}
        numberOfLines={1}
      >
        {name}
      </H1>
    </YStack>
  );
}
