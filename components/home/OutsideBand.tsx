import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView } from "react-native";
import { getTokens, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Skeleton } from "@/components/common/Skeleton";
import { Play, SlidersHorizontal } from "@/components/icons";
import { getQuestThumb } from "@/constants/assetMap";
import { listOutings, type Outing } from "@/db/outings";
import { loadConfiguredQuest } from "@/db/questConfig";
import { Difficulty } from "@/db/targets";
import { ensureNotificationPermission, requestPermission } from "@/modules/bati-location";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
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
 * **A tap starts the session.** Going out is a decision taken while walking towards the door, and
 * the screen that used to sit in between only ever asked one question the leaver did not have: how
 * long. So the tile leaves, with no goal on it, and the hero who wants a number taps "Set up"
 * first — one tile, one target, rather than a 40 dp chevron nested in the tile that starts a GPS
 * (`DESIGN.md` floors a hit area at 44×44).
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
  const status = useSessionStore((s) => s.status);
  const startSession = useSessionStore((s) => s.startSession);
  const [outings, setOutings] = useState<Outing[] | null>(null);
  /** Double-tap guard, the same one the quest screen keeps for the same reason. */
  const [isStarting, setIsStarting] = useState(false);
  /**
   * A refusal that has just happened, never a refusal that was remembered: a stored one would
   * never learn that the hero granted the permission from Android's settings, and the band would
   * say "denied" for ever. We ask on the tap and answer the answer.
   */
  const [denied, setDenied] = useState(false);
  /** While on, a tile opens its quest instead of leaving. Per visit, cleared on every focus. */
  const [setup, setSetup] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Coming back from the session must not leave the band stuck on a tap it already served.
      setIsStarting(false);
      setSetup(false);
      // Both reads underneath are cached and invalidated on write, so coming back from the
      // editor picks up a hero-authored outing without costing a query on every focus.
      listOutings()
        .then(setOutings)
        .catch((error) => reportError("home.outsideBand", error));
    }, []),
  );

  const startOuting = useCallback(
    async (questId: number) => {
      if (isStarting) return;
      // A session that is neither idle nor finished is a live one — an outing paused by the
      // hardware back button still holds its uuid and its points. `startSession` would overwrite
      // it and orphan every fix it had written, so the tap rejoins it instead.
      if (status !== "idle" && status !== "finished") {
        router.push("/session" as never);
        return;
      }

      setIsStarting(true);
      try {
        // Position first, then the notification: from API 33 the ongoing notification is the only
        // surface an outing has in a pocket, and bundling the two would let one refusal veto the
        // other. `begin()` asks again and both are idempotent once granted.
        const permission = await requestPermission();
        if (!permission.granted) {
          // No fix means no ground, and a session that measures nothing is not the session this
          // tile promises. Nothing starts, and the band says where the grant lives.
          setDenied(true);
          setIsStarting(false);
          return;
        }
        setDenied(false);
        // Once per process, and `begin()` calls the same helper: a hero who refused here used to
        // get the system dialog again, over a chronometer already counting their walk.
        await ensureNotificationPermission();

        // Loaded at `medium` whatever the quest screen was left on: a level stretches an outing's
        // duration and multiplies its XP, and the hero who taps here has chosen neither.
        const loaded = await loadConfiguredQuest(questId, Difficulty.Medium);
        if (!loaded) {
          setIsStarting(false);
          return;
        }

        // Awaited on purpose: `startSession` loads the boss fight and the warm-up preference
        // before it populates the store, and the session screen redirects home on an empty one.
        await startSession(loaded.quest, loaded.level, { goal: null });
        router.push("/session" as never);
      } catch (error) {
        setIsStarting(false);
        reportError("home.startOuting", error);
      }
    },
    [isStarting, status, router, startSession],
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
      <XStack items="center" gap="$3">
        <Text flex={1} fontSize={13} fontWeight="700" color="$textSecondary" letterSpacing={0.8}>
          {t("home.outside_band", "Head out")}
        </Text>

        {/* The prepared door, at band level rather than in the tile: a second 44 dp target inside
            a 72 dp tile that starts a GPS is two decisions in one thumb. */}
        <XStack
          items="center"
          gap="$1.5"
          onPress={() => setSetup((v) => !v)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          pressStyle={{ opacity: 0.7 }}
          accessibilityRole="button"
          accessibilityState={{ selected: setup }}
          accessibilityLabel={t("home.outside_setup_a11y", "Set up an outing before heading out")}
        >
          <SlidersHorizontal size={14} color={setup ? "$primary" : "$textSecondary"} />
          <Text fontSize={13} fontWeight="700" color={setup ? "$primary" : "$textSecondary"}>
            {t("home.outside_setup", "Set up")}
          </Text>
        </XStack>
      </XStack>

      {/* Not on the tile: the name already takes two lines there, and a dead end printed on a
          72 dp thumbnail is a dead end nobody can read. */}
      {denied ? (
        <YStack gap="$2" pb="$1">
          <Text fontSize={13} color="$textSecondary">
            {t("session.expedition_status_denied")}
          </Text>
          <AppButton
            fullWidth={false}
            variant="outline"
            backgroundColor="$surface2"
            size="$3"
            fontSize={15}
            onPress={() =>
              Linking.openSettings().catch((e: unknown) => reportError("home.openSettings", e))
            }
            accessibilityRole="button"
            accessibilityLabel={t("session.expedition_open_settings")}
          >
            {t("session.expedition_open_settings")}
          </AppButton>
        </YStack>
      ) : null}

      {/* Horizontal rather than a row of equal columns: the seeded three are not a promise.
          A hero who writes their own outing adds a fourth, and a fixed-width tile that scrolls
          survives that where three flexed columns quietly squeeze. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -pageInset }}
        contentContainerStyle={{ gap: 10, paddingHorizontal: pageInset }}
      >
        {outings.map(({ quest, exercise }) => {
          const name = localizedName(exercise, language);
          return (
            <YStack
              key={quest.id}
              width={TILE_WIDTH}
              bg="$surface"
              borderWidth={1}
              borderColor="$borderStrong"
              rounded="$6"
              overflow="hidden"
              onPress={() => {
                if (setup) {
                  router.push(`/quests/${quest.id}` as never);
                  return;
                }
                startOuting(quest.id).catch((error) => reportError("home.startOuting", error));
              }}
              pressStyle={{ opacity: 0.85, scale: 0.98 }}
              accessibilityRole="button"
              // The name alone would be the same label the tile wore when it only opened a screen,
              // and two versions of one gesture send a hero running when they meant to read.
              accessibilityLabel={
                setup ? name : t("home.outside_start_a11y", { quest: name, defaultValue: name })
              }
            >
              {/* The quest's cover, and the movement art was tried instead and reverted: those
                  three are square portraits of a walker, a runner and a rider, and a 116x72 crop
                  takes them at the waist with the scrim over the legs, which is where the motion
                  is. At this size no art distinguishes anything - it is texture, and the name
                  carries the meaning. The glyph below is what carries "this leaves". */}
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
              {/* Decorative, not a target: the tile is the target. Its own disc rather than a bare
                  glyph, so it survives whatever the art puts behind it, and it is the only thing
                  that separates a tile that leaves from a tile that reads. */}
              {setup ? null : (
                <YStack
                  position="absolute"
                  t="$1.5"
                  r="$1.5"
                  width={22}
                  height={22}
                  rounded={11}
                  bg="rgba(11,15,25,0.72)"
                  justify="center"
                  items="center"
                  pointerEvents="none"
                >
                  <Play size={12} color="$text" strokeWidth={2.5} />
                </YStack>
              )}
              {/* Bottom-anchored, so a one-line name and a two-line one share a baseline instead
                  of floating at different heights across the row. */}
              <YStack position="absolute" l={0} r={0} b={0} px="$2" pb="$1.5">
                <Text
                  fontSize={12}
                  fontWeight="700"
                  color="$text"
                  numberOfLines={2}
                  lineHeight={15}
                >
                  {name}
                </Text>
              </YStack>
            </YStack>
          );
        })}
      </ScrollView>
    </YStack>
  );
}
