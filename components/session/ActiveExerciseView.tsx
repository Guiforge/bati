import { ChevronDown, ChevronUp, Crosshair, Pause } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import {
  getExerciseBgForSessionStep,
  getExerciseBgRawForSessionStep,
} from "@/constants/exerciseColors";
import { critChance } from "@/db/bossFights";
import { formatTarget } from "@/db/targets";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatOvertime, formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { localizedName } from "@/src/i18n/localized";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossArena } from "./BossArena";
import { getHpPercent, getPhaseFromHp, getPhaseLook } from "./bossPhase";
import { ExerciseHero } from "./ExerciseHero";
import { sessionArtHeight } from "./sessionArt";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Main workout session view with multiple UI states
export function ActiveExerciseView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const { selection, heavyImpact } = useHaptics();
  const reducedMotion = useReducedMotion();

  const quest = useSessionStore((s) => s.quest);
  const currentRoundIndex = useSessionStore((s) => s.currentRoundIndex);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const completeExercise = useSessionStore((s) => s.completeExercise);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);

  const { remainingSeconds, elapsedSeconds, isOvertime, progress } = useSessionTimer();

  // Get current exercise safely
  const currentEx = quest?.exercises[currentExerciseIndex];
  const targetValue = currentEx?.target.value ?? 0;
  const [adjustedReps, setAdjustedReps] = useState(targetValue);
  const [showHowTo, setShowHowTo] = useState(false);

  if (!quest || !currentEx) return null;

  const isTimeBased = currentEx.target.type === "time";
  const ghost = currentEx.ghost;

  const exerciseName = localizedName(currentEx.exercise, language);
  const exerciseDescription =
    language === "fr" ? currentEx.exercise.frDescription : currentEx.exercise.enDescription;

  // Progress calculation
  const exercisesPerRound = quest.exercises.length;
  const totalSteps = exercisesPerRound * quest.rounds;
  const currentStep = currentRoundIndex * exercisesPerRound + currentExerciseIndex + 1;
  const progressPercent = (currentStep / totalSteps) * 100;

  const handleToggleHowTo = () => {
    selection();
    setShowHowTo((prev) => !prev);
  };

  const handleComplete = () => {
    // Heavy haptic feedback on exercise completion
    heavyImpact();

    // For time-based exercises, record actual elapsed time
    // For rep-based, record the adjusted value
    if (isTimeBased) {
      // DB constraints require resultValue > 0.
      completeExercise(Math.max(1, elapsedSeconds));
    } else {
      completeExercise(Math.max(1, adjustedReps));
    }
  };

  const handleAdjustReps = (delta: number) => {
    selection();
    setAdjustedReps((prev) => Math.max(1, prev + delta));
  };

  // Calculate overtime seconds for display
  const overtimeSeconds = isOvertime ? Math.abs(remainingSeconds) : 0;

  // A fight owns the room's colour. Without this the fire dragon is fought on the "shoulders"
  // pastel, because both branches read the exercise's muscle. Derived from the same pure function
  // the arena uses on the same inputs, so the scrim and the screen it fades into cannot drift.
  const phaseLook = bossFight
    ? getPhaseLook(getPhaseFromHp(getHpPercent(bossFight.currentHp, bossFight.totalHp)))
    : null;
  const screenBg =
    phaseLook?.bgToken ??
    getExerciseBgForSessionStep({
      exercise: currentEx.exercise,
      targetType: currentEx.target.type,
    });
  const screenBgRaw =
    phaseLook?.bgRaw ??
    getExerciseBgRawForSessionStep({
      exercise: currentEx.exercise,
      targetType: currentEx.target.type,
    });

  // Tall enough that the movement reads across a room, capped so the counter and the CTA below
  // still have somewhere to live on a short screen — the same slot, and the same size, as the arena.
  const heroHeight = sessionArtHeight(width, height);
  const targetMuscle = currentEx.exercise.muscles[0];

  return (
    <YStack
      flex={1}
      bg={screenBg}
      pb={insets.bottom + 16}
      transition={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* The top of the screen is a picture, not a card — the same full-bleed slot either way. In
          a fight the arena owns it and the exercise rides on the arena's own scrim, so both images
          are on screen at once and the column is no taller than the hero branch. */}
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
        >
          {/* The exercise is still what you are doing — it just does it on the boss's ground.
              It used to shrink to a 52 px chip below the fold, so you could not see the movement
              you were performing. */}
          <XStack items="center" gap="$2">
            <YStack
              width={36}
              height={36}
              rounded={18}
              overflow="hidden"
              borderWidth={1}
              borderColor="$borderStrong"
            >
              <Image
                source={getExerciseThumb(currentEx.exercise.imagePath)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />
            </YStack>
            <Text flex={1} fontWeight="700" fontSize={16} color="$text" numberOfLines={1}>
              {exerciseName}
            </Text>
            {!!targetMuscle && (
              <XStack items="center" gap="$1">
                <Crosshair size={12} color="$textSecondary" />
                <Text fontSize={12} color="$textSecondary">
                  {t(`muscles.${targetMuscle}`)}
                </Text>
              </XStack>
            )}
          </XStack>
        </BossArena>
      ) : (
        <ExerciseHero
          source={getExerciseAsset(currentEx.exercise.imagePath)}
          name={exerciseName}
          height={heroHeight}
          fadeTo={screenBgRaw}
          topInset={insets.top}
        />
      )}

      {/* The HUD: where you are, how far in, and the way out — one row floating over the art
          instead of the two-row header plus framed progress block plus its own label row that
          used to sit above the picture. Every value is the one that was already here; `ROUND`
          simply stopped being printed twice. */}
      <YStack position="absolute" t={insets.top + 8} l={0} r={0} px="$4" gap="$2" z={10}>
        <XStack items="center" justify="space-between" gap="$2">
          {/* 12px, not 13: "MANCHE 1 / 3 · EXERCICE 2 / 5" is the long form and it has to survive
              a 320dp screen without ellipsing away the exercise counter. */}
          <Text color="$text" fontSize={12} fontWeight="700" numberOfLines={1} flex={1}>
            {t("session.round_label", {
              count: currentRoundIndex + 1,
              total: quest.rounds,
            })}
            {" · "}
            {t("session.exercise_label", {
              count: currentExerciseIndex + 1,
              total: exercisesPerRound,
            })}
          </Text>
          <XStack items="center" gap="$2">
            <Text fontSize={12} fontWeight="700" color="$textSecondary">
              {Math.round(progressPercent)}%
            </Text>
            <Button
              testID="session-pause"
              size="$3"
              hitSlop={8}
              circular
              icon={<Pause size={20} color="$text" />}
              onPress={pauseSession}
              chromeless
              hoverStyle={{ bg: "$pastelBlue" }}
              pressStyle={{ opacity: 0.7 }}
              accessibilityLabel={t("session.pause_accessibility")}
              accessibilityRole="button"
            />
          </XStack>
        </XStack>

        {/* Overall progress as a hairline: the bar was already the subtle element, a frame around
            it was never doing any work. */}
        <YStack height={3} rounded="$10" bg="$bgOverlay" overflow="hidden">
          <YStack
            height={3}
            width={`${progressPercent}%`}
            bg="$text"
            opacity={0.55}
            transition={reducedMotion ? undefined : "bouncy"}
          />
        </YStack>
      </YStack>

      <YStack flex={1} px="$4" pt="$4" gap="$4">
        {/* Within-exercise timer progress (only for time-based exercises) */}
        {isTimeBased && (
          <YStack gap="$2">
            <XStack justify="space-between" items="baseline">
              <Text fontSize={12} fontWeight="700" color="$textSecondary">
                {isOvertime ? t("session.bonus_time") : t("session.time_progress")}
              </Text>
              <Text fontSize={12} fontWeight="700" color="$textSecondary">
                {isOvertime ? formatOvertime(overtimeSeconds) : formatTime(remainingSeconds)}
              </Text>
            </XStack>
            <Progress
              value={Math.min(1, Math.max(0, progress)) * 100}
              size="$4"
              bg="$surface2"
              borderWidth={0}
              rounded="$6"
            >
              <Progress.Indicator
                transition="quick"
                bg={isOvertime ? "$success" : "$primary"}
                opacity={isOvertime ? 0.9 : 1}
              />
            </Progress>
          </YStack>
        )}

        {/* Main Content — scrolls so the footer CTA below stays reachable. The hero, the boss
          HUD and the progress bars are fixed-height siblings in a column that does not shrink
          (flexShrink is 0 in RN), so before this the tall content simply pushed "done" past the
          bottom edge — worst on a boss fight, on a small screen, or with "how to" expanded. */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          showsVerticalScrollIndicator={false}
        >
          <YStack items="center" justify="center" gap="$5">
            {/* The exercise's name is on the artwork either way now — the hero paints it, and in a
              fight the arena carries it on its own scrim. Nothing repeats it here. */}
            <YStack items="center" gap="$2" width="100%">
              {/* The template named a harder movement and the hero is not on that rung yet
                (issue #33). Named here too: mid-session is where the substitution is felt, and
                a hero who thinks the app got it wrong is a hero who logs a lie. */}
              {currentEx.substitutedFor ? (
                <Text fontSize={12} color="$textSecondary" fontFamily="$body" text="center">
                  {t("quests.served_easier_rung", {
                    name: localizedName(currentEx.substitutedFor, language),
                    defaultValue: `Working up to ${localizedName(currentEx.substitutedFor, language)}`,
                  })}
                </Text>
              ) : null}

              {/* How to do it - expandable */}
              {exerciseDescription ? (
                <YStack width="100%">
                  <Pressable
                    onPress={handleToggleHowTo}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showHowTo }}
                    accessibilityLabel={t("session.how_to_do_it")}
                  >
                    <XStack
                      items="center"
                      justify="center"
                      gap="$2"
                      py="$1"
                      opacity={0.7}
                      hoverStyle={{ opacity: 1 }}
                    >
                      <Text fontSize={12} fontWeight="700" color="$textSecondary">
                        {t("session.how_to_do_it")}
                      </Text>
                      {showHowTo ? (
                        <ChevronUp size={14} color="$textSecondary" />
                      ) : (
                        <ChevronDown size={14} color="$textSecondary" />
                      )}
                    </XStack>
                  </Pressable>
                  {!!showHowTo && (
                    <YStack
                      bg="$surface2"
                      p="$3"
                      rounded="$4"
                      mt="$2"
                      transition="quick"
                      enterStyle={{ opacity: 0, scale: 0.95 }}
                    >
                      <Text fontSize={14} color="$textSecondary" lineHeight={20}>
                        {exerciseDescription}
                      </Text>
                    </YStack>
                  )}
                </YStack>
              ) : null}
            </YStack>

            {/* Big Counter — the loudest thing on the screen, so it needs no outline to be found.
              The border stays only in overtime, where it is a state signal and not decoration. */}
            <YStack
              bg={isTimeBased && isOvertime ? "$surface2" : "$surface"}
              py="$6"
              px="$8"
              rounded="$8"
              borderWidth={isOvertime ? 1 : 0}
              borderColor="$success"
              width="100%"
              items="center"
              justify="center"
              transition="quick"
            >
              {isTimeBased ? (
                <YStack items="center" gap="$2">
                  {isOvertime ? (
                    <>
                      {/* Overtime display - counting UP */}
                      <XStack items="center" gap="$2">
                        <GameIcon name="flame" size={16} color="$success" />
                        <Text fontSize={14} fontWeight="700" color="$textSecondary">
                          {t("session.overtime")}
                        </Text>
                        <GameIcon name="flame" size={16} color="$success" />
                      </XStack>
                      <H1 fontSize={72} fontWeight="700" fontFamily="$body" color="$success">
                        {formatOvertime(overtimeSeconds)}
                      </H1>
                      <Paragraph fontWeight="700" color="$textSecondary">
                        {t("session.target_reached")}
                      </Paragraph>
                    </>
                  ) : (
                    <>
                      {/* Normal countdown */}
                      <H1 fontSize={72} fontWeight="700" fontFamily="$body" color="$text">
                        {formatTime(remainingSeconds)}
                      </H1>
                      <Paragraph fontWeight="700" color="$textSecondary">
                        {t("session.seconds")}
                      </Paragraph>
                    </>
                  )}
                </YStack>
              ) : (
                <YStack items="center" gap="$2">
                  <XStack items="center" gap="$4">
                    <Button
                      size="$4"
                      circular
                      bg="$surface2"
                      borderWidth={0}
                      onPress={() => handleAdjustReps(-1)}
                      pressStyle={{ opacity: 0.8, scale: 0.95 }}
                      disabled={adjustedReps <= 1}
                      opacity={adjustedReps <= 1 ? 0.4 : 1}
                      accessibilityLabel={t("session.decrease_reps_accessibility")}
                      accessibilityRole="button"
                    >
                      <Text fontSize={24} fontWeight="700" color="$text">
                        −
                      </Text>
                    </Button>
                    <YStack
                      items="center"
                      key={reducedMotion ? undefined : adjustedReps}
                      transition={reducedMotion ? undefined : "bouncy"}
                      enterStyle={reducedMotion ? undefined : { scale: 1.15 }}
                      scale={1}
                    >
                      <H1 fontSize={80} fontWeight="700" fontFamily="$body" color="$text">
                        {adjustedReps}
                      </H1>
                      <Paragraph fontWeight="700" color="$textSecondary">
                        {t("session.reps")}
                      </Paragraph>
                    </YStack>
                    <Button
                      size="$4"
                      circular
                      bg="$surface2"
                      borderWidth={0}
                      onPress={() => handleAdjustReps(1)}
                      pressStyle={{ opacity: 0.8, scale: 0.95 }}
                      accessibilityLabel={t("session.increase_reps_accessibility")}
                      accessibilityRole="button"
                    >
                      <Text fontSize={24} fontWeight="700" color="$text">
                        +
                      </Text>
                    </Button>
                  </XStack>
                  {adjustedReps !== targetValue && (
                    <Text fontSize={12} color="$textSecondary">
                      {t("session.adjust_reps_hint")}
                    </Text>
                  )}
                  {/* In a fight the ± control *is* the decision, so say what it buys. Crit odds
                  scale with how far past the target you go, and nothing on screen has ever
                  admitted the rule exists. Outside a fight, intensity as reps-in-reserve rather
                  than "go to failure" — the safer and more teachable framing, and one the app can
                  give as a cue instead of collecting as data. */}
                  <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                    {bossFight
                      ? t("session.crit_hint", {
                          percent: Math.round(critChance(adjustedReps, targetValue) * 100),
                        })
                      : t("session.reserve_hint")}
                  </Text>
                </YStack>
              )}
            </YStack>

            {/* Hint for time-based exercises */}
            {isTimeBased && !isOvertime && (
              <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                {t("session.keep_going_hint")}
              </Text>
            )}

            {/* What the hero already did on this movement. Outside the reps/time ternary above so
                one line serves both units, and read straight off the quest — `getQuestById` put it
                there, so nothing is queried mid-workout and a recovered session keeps it.
                Two phrasings: on a first-ever session `last` and `best` are the same number, and
                "last time 12 · best 12" reads like a bug. */}
            {ghost ? (
              <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                {ghost.best > ghost.last
                  ? t("session.ghost_last_best", {
                      last: formatTarget({ type: currentEx.target.type, value: ghost.last }),
                      best: formatTarget({ type: currentEx.target.type, value: ghost.best }),
                    })
                  : t("session.ghost_last", {
                      value: formatTarget({ type: currentEx.target.type, value: ghost.last }),
                    })}
              </Text>
            ) : null}
          </YStack>
        </ScrollView>

        {/* Footer Action */}
        <Button
          testID="session-complete-exercise"
          size="$6"
          bg={isOvertime ? "$success" : "$primary"}
          pressStyle={{ opacity: 0.8 }}
          onPress={handleComplete}
          borderWidth={0}
          rounded="$6"
          accessibilityLabel={
            isOvertime
              ? t("session.finish_exercise_accessibility")
              : t("session.complete_exercise_accessibility")
          }
          accessibilityRole="button"
        >
          <Text color="$text" fontSize={24} fontWeight="700">
            {isOvertime ? t("session.complete_overtime") : t("session.complete_button")}
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
