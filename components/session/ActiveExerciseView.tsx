import { ChevronDown, ChevronUp, Pause } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H2, Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { getExerciseAsset } from "@/constants/assetMap";
import {
  getExerciseBgForSessionStep,
  getExerciseBgRawForSessionStep,
} from "@/constants/exerciseColors";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatOvertime, formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossArena } from "./BossArena";
import { ExerciseHero } from "./ExerciseHero";

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

  const exerciseName = language === "fr" ? currentEx.exercise.frName : currentEx.exercise.enName;
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

  const screenBg = getExerciseBgForSessionStep({
    exercise: currentEx.exercise,
    targetType: currentEx.target.type,
  });
  const screenBgRaw = getExerciseBgRawForSessionStep({
    exercise: currentEx.exercise,
    targetType: currentEx.target.type,
  });

  // Tall enough that the movement reads across a room, capped so the counter and the CTA below
  // still have somewhere to live on a short screen — the same guard BossArena puts on its art.
  const heroHeight = Math.min(Math.round(height * 0.42), Math.round(width * 1.1));

  return (
    <YStack
      flex={1}
      bg={screenBg}
      pb={insets.bottom + 16}
      transition={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* The top of the screen is a picture, not a card. In a boss fight the arena owns that
          slot and the exercise art drops to a thumbnail beside its name below — the screen swaps
          one image for the other instead of stacking both, which is what keeps the column short
          enough for the CTA. */}
      {bossFight ? (
        <YStack px="$4" pt={insets.top + 56}>
          <BossArena
            currentHp={bossFight.currentHp}
            totalHp={bossFight.totalHp}
            bossImagePath={bossFight.imagePath}
            bossName={language === "fr" ? bossFight.frName : bossFight.enName}
            weaknessMuscle={bossFight.weaknessMuscle}
            lastDamage={
              lastDamageResult
                ? {
                    damage: lastDamageResult.damage,
                    isCritical: lastDamageResult.isCritical,
                    weaknessBonus: lastDamageResult.weaknessBonus,
                  }
                : null
            }
          />
        </YStack>
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
            {/* Exercise Name + How to do it. Without a boss the hero above already carries the
              name on the artwork, so only the fight branch repeats it here. */}
            <YStack items="center" gap="$2" width="100%">
              {!!bossFight && (
                <XStack items="center" justify="center" gap="$3" width="100%">
                  <YStack
                    width={52}
                    height={52}
                    bg="$surface"
                    rounded="$4"
                    overflow="hidden"
                    borderWidth={1}
                    borderColor="$borderStrong"
                  >
                    <Image
                      source={getExerciseAsset(currentEx.exercise.imagePath)}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={150}
                    />
                  </YStack>
                  <H2
                    fontWeight="700"
                    fontSize={28}
                    lineHeight={32}
                    style={{ textAlign: "center", flexShrink: 1 }}
                    color="$text"
                  >
                    {exerciseName}
                  </H2>
                </XStack>
              )}

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
                  {/* Intensity as reps-in-reserve rather than "go to failure" — the safer and more
                  teachable framing, and one the app can give as a cue instead of collecting as
                  data. */}
                  <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                    {t("session.reserve_hint")}
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
