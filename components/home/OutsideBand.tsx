import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { getTokens, Text, YStack } from "tamagui";
import { Skeleton } from "@/components/common/Skeleton";
import { getQuestThumb } from "@/constants/assetMap";
import { listOutings, type Outing } from "@/db/outings";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

// The name sits *on* the art rather than under it, which is what makes the tile 72 tall instead
// of 122. Measured, not guessed: the band cost the oath card its place on Home - on a 372x828
// screen the fold is at 685 dp and the oath used to start at 597. A door out is worth a strip,
// not a second gallery under the one scene Home is built around.
const TILE_WIDTH = 116;
const TILE_HEIGHT = 72;

/**
 * The door out of the village, on Home.
 *
 * Home's suggestion waterfall (`useSmartAction`) reaches an expedition through neither of its
 * two content rules: one follows the oath's exercise chain, the other the muscles the last
 * thirty days went light on, and an expedition carries no muscles on purpose
 * (drizzle/0041_the_three_ways_out.sql). So the three ways out could not be offered by the one
 * surface that offers anything, and the only way to reach them was the "Outside" chip, last in
 * a horizontally scrolling filter rail, in the third tab. Four taps and a hunt to go running.
 *
 * A band rather than a fourth rule in the waterfall: the stage is the one thing Home asks for
 * tonight, and going out is not a suggestion, it is a door that should always be where you left
 * it. Deliberately quieter than the stage — art and a name, no primary-blue button — because
 * two commanding actions in one viewport is neither of them commanding.
 *
 * The tile names the *movement*, not the quest: "Course du Messager" says which one is the run,
 * "La Parole Doit Passer" does not.
 *
 * A tap opens the quest, it does not start the session. Same rule as the stage: Home hands over
 * the quest and the hero commits on the screen that can still change the duration, which is the
 * one thing they actually want to set before walking out of the door.
 */
export function OutsideBand() {
  const { t } = useTranslation();
  // Home pads its column by $4. The band cancels that padding and puts it back inside the
  // scroll, so the row runs to the physical screen edge: the tile that does not fit is then cut
  // by the screen, which reads as "there is more", instead of being cut in mid-air inside the
  // margin, which reads as a broken word. Read from the token rather than written as 18, so it
  // still lines up with everything above it if the scale ever moves.
  const pageInset = getTokens().space.$4.val;
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [outings, setOutings] = useState<Outing[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Both reads underneath are cached and invalidated on write, so coming back from the
      // editor picks up a hero-authored outing without costing a query on every focus.
      listOutings()
        .then(setOutings)
        .catch((error) => reportError("home.outsideBand", error));
    }, []),
  );

  if (outings === null) {
    // Reserve the band rather than guess at its contents: a placeholder tile would claim there
    // is a way out before the read says there is one.
    return (
      <YStack gap="$2">
        <Skeleton height={14} width={80} bg="$surface" />
        <Skeleton height={TILE_HEIGHT} bg="$surface" />
      </YStack>
    );
  }

  if (outings.length === 0) return null;

  return (
    <YStack gap="$2">
      <Text fontSize={13} fontWeight="700" color="$textSecondary" letterSpacing={0.8}>
        {t("home.outside_band", "Head out")}
      </Text>

      {/* Horizontal rather than a row of equal columns: the seeded three are not a promise.
          A hero who writes their own outing adds a fourth, and a fixed-width tile that scrolls
          survives that where three flexed columns quietly squeeze. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -pageInset }}
        contentContainerStyle={{ gap: 10, paddingHorizontal: pageInset }}
      >
        {outings.map(({ quest, exercise }) => (
          <YStack
            key={quest.id}
            width={TILE_WIDTH}
            bg="$surface"
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$6"
            overflow="hidden"
            onPress={() => router.push(`/quests/${quest.id}` as never)}
            pressStyle={{ opacity: 0.85, scale: 0.98 }}
            accessibilityRole="button"
          >
            {/* The quest's cover, and the movement art was tried instead and reverted: those
                three are square portraits of a walker, a runner and a rider, and a 116x72 crop
                takes them at the waist with the scrim over the legs, which is where the motion
                is. At this size no art distinguishes anything - it is texture, and the name
                carries the meaning. A glyph would carry it, if the tiles ever need to be
                scannable without reading. */}
            <Image
              source={getQuestThumb(quest.imagePath)}
              style={{ width: TILE_WIDTH, height: TILE_HEIGHT }}
              contentFit="cover"
              transition={200}
            />
            {/* $bgDark (#0B0F19) as rgba - LinearGradient takes plain colors, not tokens. The
                same device as the stage's cover at a quarter of the size: without it a pale sky
                in the art takes the name with it. */}
            <LinearGradient
              colors={["rgba(11,15,25,0)", "rgba(11,15,25,0.94)"]}
              // Measured on device, in the tile's padding gutter where only the scrim shows:
              // 12.98:1 behind the palest of the three, against the 4.5:1 that 12 px bold needs.
              // A darker ramp was tried and reverted - it bought nothing and hid the art. Measure
              // the gutter, never the text rows: antialiased glyph edges read as a pale
              // background and turn a passing scrim into a fake 4.28:1.
              start={{ x: 0, y: 0.25 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            {/* Bottom-anchored, so a one-line name and a two-line one share a baseline instead
                of floating at different heights across the row. */}
            <YStack position="absolute" l={0} r={0} b={0} px="$2" pb="$1.5">
              <Text fontSize={12} fontWeight="700" color="$text" numberOfLines={2} lineHeight={15}>
                {language === "fr" ? exercise.frName : exercise.enName}
              </Text>
            </YStack>
          </YStack>
        ))}
      </ScrollView>
    </YStack>
  );
}
