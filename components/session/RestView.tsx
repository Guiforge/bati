import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H2, Progress, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { Minus, Pause, Plus } from "@/components/icons";
import { getExerciseThumb } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSessionInstructions } from "@/hooks/useSessionInstructions";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { localizedName } from "@/src/i18n/localized";
import { useChorusStore } from "@/stores/chorus";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossArena } from "./BossArena";
import { getHpPercent, getPhaseFromHp, getPhaseLook } from "./bossPhase";
import { ExerciseInstructionsModal } from "./ExerciseInstructions";

// One campfire per avatar archetype (scripts/generate-rest.py); a rest draws one at random.
const REST_ART = [
  require("../../assets/images/rest/rest_campfire.webp"),
  require("../../assets/images/rest/rest_campfire_archer.webp"),
  require("../../assets/images/rest/rest_campfire_archmage.webp"),
  require("../../assets/images/rest/rest_campfire_elder.webp"),
  require("../../assets/images/rest/rest_campfire_scout.webp"),
  require("../../assets/images/rest/rest_campfire_shadow.webp"),
];

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one screen component, boss/rest branches read top-to-bottom
export function RestView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { selection, mediumImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const quest = useSessionStore((s) => s.quest);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const currentRoundIndex = useSessionStore((s) => s.currentRoundIndex);
  const skipRest = useSessionStore((s) => s.skipRest);
  const addRestTime = useSessionStore((s) => s.addRestTime);
  const results = useSessionStore((s) => s.results);
  const updateLastResult = useSessionStore((s) => s.updateLastResult);
  const lastSetSkipped = useSessionStore((s) => s.lastSetSkipped);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);
  const status = useSessionStore((s) => s.status);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const { remainingSeconds, progress } = useSessionTimer();
  const cue = useChorusStore((s) => s.cue);
  // During a rest this is the movement *about to start* — `completeExercise` advances the index
  // before handing over — which is exactly the one the "up next" card names.
  const instruction = useSessionInstructions();
  const [showHowTo, setShowHowTo] = useState(false);
  // Drawn once per rest: this view is mounted and unmounted by `displayStatus`, so the mount is
  // the rest, and the pick must not re-roll on every timer tick's render.
  const [restArt] = useState(() => REST_ART[Math.floor(Math.random() * REST_ART.length)]);

  // Once per rest, on mount — this view is mounted and unmounted by `displayStatus`, so the
  // component's own lifecycle is already "one rest". The chorus decides whether anyone actually
  // comes: rest is `ambient`, so it is behind a cooldown, a budget and a 35% draw. Most rests
  // stay empty on purpose, which is the only reason the ones that do not are worth looking at.
  useEffect(() => {
    cue("rest");
  }, [cue]);

  // The rest timer runs out on its own and nothing consumed the zero: useSessionTimer floors
  // `resting` at 0, so the screen parked on 0:00 and the next exercise never started unless you
  // tapped "skip". Same hands-free advance the warm-up and the countdown already do.
  // skipRest() re-checks the status itself, so a repeat render firing this is harmless.
  useEffect(() => {
    if (status !== "resting" || remainingSeconds > 0) return;
    skipRest();
  }, [status, remainingSeconds, skipRest]);

  if (!quest) return null;

  // In 'resting' state, currentExerciseIndex points to the UPCOMING exercise
  // Rest is shown *before* an exercise, so the index always points at one — unless a saved
  // session is restored against a quest that has since been edited, in which case there is
  // nothing to rest before and the screen has nothing to say.
  // Same reason: an exercise index back at zero on any round past the first means the round just
  // ended, so this is the longer rest and the screen says so.
  const isRoundRest = currentExerciseIndex === 0 && currentRoundIndex > 0;
  const nextEx = quest.exercises[currentExerciseIndex];
  const nextExName = nextEx ? localizedName(nextEx.exercise, language) : "";

  const lastResult = results[results.length - 1];
  // Time-based sets record whatever the timer read when you tapped "done" — often a few seconds
  // off from what you actually held. Same ± control as reps, stepped by 5s.
  const isLastTimeBased = lastResult?.result.type === "time";
  const adjustStep = isLastTimeBased ? 5 : 1;

  // Same rule as the running screen: during a fight the room's colour is the boss's, and it
  // darkens as the fight turns.
  const phaseLook = bossFight
    ? getPhaseLook(getPhaseFromHp(getHpPercent(bossFight.currentHp, bossFight.totalHp)))
    : null;
  const screenBg = phaseLook?.bgToken ?? getQuestColorTokensFromQuest(quest).bg;

  const handleSkipRest = () => {
    mediumImpact();
    skipRest();
  };

  const handleAddRestTime = (seconds: number) => {
    selection();
    addRestTime(seconds);
  };

  const handleUpdateResult = (value: number) => {
    selection();
    updateLastResult(value);
  };

  return (
    // The root bleeds and an inner column carries the padding, the same shape the running screen
    // uses: the arena is full-bleed and starts at the screen's own top edge, so it cannot sit
    // inside a `px="$4"` container.
    <YStack
      flex={1}
      bg={screenBg}
      pb={insets.bottom + 16}
      gap="$4"
      transition={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* Campfire scene behind everything, quiet enough for the timer to stay readable — same
          low-opacity treatment AppBackground gives new_city. */}
      <Image
        source={restArt}
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
        contentFit="cover"
        pointerEvents="none"
      />
      {/* The one view of the flow that had no pause: on iOS there is no hardware back, so
          mid-rest the session could not be paused at all. Same floating control as the
          running screen. */}
      <XStack position="absolute" t={insets.top + 8} r="$4" z={10}>
        <Button
          testID="session-pause"
          size="$3"
          hitSlop={8}
          circular
          icon={<Pause size={20} color="$text" />}
          onPress={pauseSession}
          chromeless
          pressStyle={{ opacity: 0.7 }}
          accessibilityLabel={t("session.pause_accessibility")}
          accessibilityRole="button"
        />
      </XStack>

      {/* The boss finally does own the top of the screen during a boss adventure — it used to say
          so in a comment while rendering below the flame header. The header goes away during a
          fight: the boss is the screen's title, and printing both costs ~88 px of a screen that is
          mostly timer, which is more than the ScrollView can spare on a 360x640. */}
      {bossFight ? (
        <BossArena
          currentHp={bossFight.currentHp}
          totalHp={bossFight.totalHp}
          bossImagePath={bossFight.imagePath}
          bossName={bossDisplayName(bossFight, language)}
          tier={bossFight.tier}
          shiny={bossFight.shiny}
          weaknessMuscle={bossFight.weaknessMuscle}
          resistanceMuscle={bossFight.resistanceMuscle}
          lastDamage={lastDamageResult}
        />
      ) : (
        <YStack
          pt={insets.top + 16}
          items="center"
          gap="$2"
          transition={reducedMotion ? undefined : "bouncy"}
          enterStyle={reducedMotion ? undefined : { opacity: 0, y: -20 }}
        >
          <GameIcon name="flame" size={40} color="$warning" />
          <H2 color="$text" fontWeight="700" fontSize={32} lineHeight={38}>
            {isRoundRest ? t("session.round_rest_title") : t("session.rest_title")}
          </H2>
        </YStack>
      )}

      <YStack flex={1} px="$4" gap="$4">
        {/* Scrolls so the skip CTA below stays reachable — the timer, the set review and the
            up-next card are fixed-height siblings that never shrink, and a boss fight adds the
            arena on top of them. */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Timer */}
          <YStack items="center" gap="$2">
            <H1 fontSize={112} fontWeight="700" fontFamily="$body" color="$text">
              {formatTime(remainingSeconds)}
            </H1>
            <Progress
              value={Math.min(1, Math.max(0, progress)) * 100}
              size="$4"
              bg="$surface2"
              borderWidth={1}
              borderColor="$borderStrong"
              rounded="$6"
              width="100%"
              style={{ maxWidth: 360 }}
            >
              <Progress.Indicator transition="quick" bg="$primary" />
            </Progress>
            <XStack gap="$3">
              <Button
                size="$3"
                hitSlop={8}
                bg="$surface"
                borderWidth={1}
                borderColor="$borderStrong"
                onPress={() => handleAddRestTime(10)}
              >
                <Text fontWeight="700" color="$text">
                  +10s
                </Text>
              </Button>
              <Button
                size="$3"
                hitSlop={8}
                bg="$surface"
                borderWidth={1}
                borderColor="$borderStrong"
                onPress={() => handleAddRestTime(30)}
              >
                <Text fontWeight="700" color="$text">
                  +30s
                </Text>
              </Button>
            </XStack>
          </YStack>

          {/* Last Set Review — hidden after a skip. A skipped set writes no result, so
            `results.at(-1)` is a set from an earlier round: the stepper would silently correct
            something the hero is not looking at. */}
          {!!lastResult && !lastSetSkipped && (
            <YStack
              bg="$surface"
              p="$4"
              rounded="$6"
              borderWidth={1}
              borderColor="$borderStrong"
              gap="$2"
            >
              <XStack justify="space-between" items="center">
                <YStack>
                  <Text color="$textSecondary" fontSize={12} fontWeight="700">
                    {isLastTimeBased
                      ? t("session.adjust_seconds_label")
                      : t("session.adjust_reps_label")}
                  </Text>
                  <Text fontSize={12} color="$textSecondary">
                    {isLastTimeBased
                      ? t("session.adjust_seconds_hint")
                      : t("session.adjust_reps_hint")}
                  </Text>
                </YStack>

                <XStack items="center" gap="$3">
                  <Button
                    size="$3"
                    hitSlop={8}
                    circular
                    icon={<Minus size={16} />}
                    accessibilityLabel={t(
                      "session.decrease_result_accessibility",
                      "Decrease result",
                    )}
                    onPress={() =>
                      handleUpdateResult(Math.max(1, lastResult.result.value - adjustStep))
                    }
                  />
                  <Text
                    fontWeight="700"
                    fontSize={20}
                    color="$text"
                    style={{ minWidth: 42, textAlign: "center" }}
                  >
                    {isLastTimeBased ? `${lastResult.result.value}s` : lastResult.result.value}
                  </Text>
                  <Button
                    size="$3"
                    hitSlop={8}
                    circular
                    icon={<Plus size={16} />}
                    accessibilityLabel={t(
                      "session.increase_result_accessibility",
                      "Increase result",
                    )}
                    onPress={() => handleUpdateResult(lastResult.result.value + adjustStep)}
                  />
                </XStack>
              </XStack>
            </YStack>
          )}

          {/* Up Next Card. Tappable: the rest is the one moment reading is free, and the movement
              the hero is about to do is the one worth reading about. Same modal the running
              screen opens from its artwork. */}
          <YStack
            testID="rest-up-next"
            bg="$surface"
            p="$4"
            rounded="$6"
            borderWidth={1}
            borderColor="$borderStrong"
            gap="$2"
            onPress={() => {
              selection();
              setShowHowTo(true);
            }}
            pressStyle={{ opacity: 0.9 }}
            accessibilityRole="button"
            accessibilityLabel={t("session.how_to_do_it")}
            transition={reducedMotion ? undefined : "bouncy"}
            enterStyle={reducedMotion ? undefined : { opacity: 0, x: 30 }}
          >
            <Text color="$textSecondary" fontSize={12} fontWeight="700">
              {t("session.up_next")}
            </Text>
            <XStack gap="$3" items="center">
              <YStack
                width={50}
                height={50}
                bg="$surface2"
                rounded="$3"
                overflow="hidden"
                items="center"
                justify="center"
                borderWidth={1}
                borderColor="$borderStrong"
              >
                <Image
                  source={getExerciseThumb(nextEx?.exercise.imagePath ?? "")}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={150}
                />
              </YStack>
              <YStack flex={1}>
                <Text fontWeight="700" fontSize={18} numberOfLines={1} color="$text">
                  {nextExName}
                </Text>
                <Text color="$textSecondary">
                  {nextEx?.target.type === "time"
                    ? `${nextEx.target.value}s`
                    : `${nextEx?.target.value ?? 0} reps`}
                </Text>
              </YStack>
            </XStack>
          </YStack>
        </ScrollView>

        {/* Skip Button — the ScrollView's sibling, never inside it, so it stays reachable. */}
        <Button
          testID="session-skip-rest"
          size="$6"
          bg="$primary"
          pressStyle={{ opacity: 0.9 }}
          onPress={handleSkipRest}
          borderWidth={0}
          rounded="$6"
          accessibilityLabel={t("session.skip_rest_accessibility")}
          accessibilityRole="button"
        >
          <Text color="$text" fontSize={20} fontWeight="700">
            {t("session.skip_rest")}
          </Text>
        </Button>
      </YStack>

      <ExerciseInstructionsModal
        instruction={instruction}
        visible={showHowTo}
        onClose={() => setShowHowTo(false)}
      />
    </YStack>
  );
}
