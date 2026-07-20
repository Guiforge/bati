import { ChevronDown, ChevronUp, Pause } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H2, Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { getExerciseAsset } from "@/constants/assetMap";
import { getExerciseBgForSessionStep } from "@/constants/exerciseColors";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatOvertime, formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossHpBar } from "./BossHpBar";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Main workout session view with multiple UI states
export function ActiveExerciseView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  return (
    <YStack
      flex={1}
      bg={screenBg}
      pt={insets.top + 16}
      pb={insets.bottom + 16}
      px="$4"
      gap="$4"
      animation={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* Header: Progress & Pause */}
      <XStack items="center" justify="space-between">
        <YStack>
          <Text color="$textSecondary" fontSize={12} fontWeight="700">
            {t("session.round_label", {
              count: currentRoundIndex + 1,
              total: quest.rounds,
            })}
          </Text>
          <Text color="$text" fontSize={16} fontWeight="700">
            {t("session.exercise_label", {
              count: currentExerciseIndex + 1,
              total: exercisesPerRound,
            })}
          </Text>
        </YStack>
        <Button
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

      {/* Boss HP Bar (only for boss fights) */}
      {bossFight && (
        <BossHpBar
          currentHp={bossFight.currentHp}
          totalHp={bossFight.totalHp}
          bossImagePath={bossFight.imagePath}
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
      )}

      {/* Overall progress (subtle) */}
      <YStack gap="$1">
        <Progress
          value={progressPercent}
          size="$2"
          bg="$bgLight"
          borderWidth={1}
          borderColor="$borderStrong"
          rounded="$4"
        >
          <Progress.Indicator animation="bouncy" bg="$color" opacity={0.35} />
        </Progress>
        <XStack justify="space-between">
          <Text fontSize={10} fontWeight="700" color="$textSecondary">
            {t("session.round_label", {
              count: currentRoundIndex + 1,
              total: quest.rounds,
            })}
          </Text>
          <Text fontSize={10} fontWeight="700" color="$textSecondary">
            {Math.round(progressPercent)}%
          </Text>
        </XStack>
      </YStack>

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
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$6"
          >
            <Progress.Indicator
              animation="quick"
              bg={isOvertime ? "$success" : "$primary"}
              opacity={isOvertime ? 0.9 : 1}
            />
          </Progress>
        </YStack>
      )}

      {/* Main Content */}
      <YStack flex={1} items="center" justify="center" gap="$5">
        {/* Exercise image — real per-exercise art, with placeholder fallback in getExerciseAsset */}
        <YStack
          width="100%"
          aspectRatio={16 / 10}
          bg="$surface"
          rounded="$4"
          overflow="hidden"
          borderWidth={1}
          borderColor="$borderStrong"
          items="center"
          justify="center"
        >
          <Image
            source={getExerciseAsset(currentEx.exercise.imagePath)}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        </YStack>

        {/* Exercise Name + How to do it */}
        <YStack items="center" gap="$2" width="100%">
          <H2
            fontWeight="700"
            fontSize={28}
            lineHeight={32}
            style={{ textAlign: "center" }}
            color="$text"
          >
            {exerciseName}
          </H2>

          {/* How to do it - expandable */}
          {exerciseDescription ? (
            <YStack width="100%">
              <Pressable onPress={handleToggleHowTo}>
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
              {showHowTo && (
                <YStack
                  bg="$surface2"
                  p="$3"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  mt="$2"
                  animation="quick"
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

        {/* Big Counter */}
        <YStack
          bg={isTimeBased ? (isOvertime ? "$surface2" : "$surface") : "$surface"}
          py="$6"
          px="$8"
          rounded="$8"
          borderWidth={1}
          borderColor={isOvertime ? "$success" : "$borderStrong"}
          width="100%"
          items="center"
          justify="center"
          animation="quick"
        >
          {isTimeBased ? (
            <YStack items="center" gap="$2">
              {isOvertime ? (
                <>
                  {/* Overtime display - counting UP */}
                  <Text fontSize={14} fontWeight="700" color="$textSecondary">
                    🔥 {t("session.overtime")} 🔥
                  </Text>
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
                  borderWidth={1}
                  borderColor="$borderStrong"
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
                  animation={reducedMotion ? undefined : "bouncy"}
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
                  borderWidth={1}
                  borderColor="$borderStrong"
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

      {/* Footer Action */}
      <Button
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
  );
}
