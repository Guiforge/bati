import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H2, Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { getExerciseBgForSessionStep } from "@/src/constants/exerciseColors";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { formatOvertime, formatTime, useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";
import { useSettingsStore } from "@/src/stores/settings";
import { BossHpBar } from "./BossHpBar";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Main workout session view with multiple UI states
export function ActiveExerciseView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { impact } = useHaptics();
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
    setShowHowTo((prev) => !prev);
  };

  const handleComplete = () => {
    impact();

    if (isTimeBased) {
      completeExercise(Math.max(1, elapsedSeconds));
    } else {
      completeExercise(Math.max(1, adjustedReps));
    }
  };

  const handleAdjustReps = (delta: number) => {
    impact();
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
          <Text
            color="$color"
            opacity={0.7}
            fontSize={12}
            fontWeight="800"
            textTransform="uppercase"
          >
            {t("session.round_label", {
              count: currentRoundIndex + 1,
              total: quest.rounds,
            })}
          </Text>
          <Text color="$color" fontSize={16} fontWeight="900" textTransform="uppercase">
            {t("session.exercise_label", {
              count: currentExerciseIndex + 1,
              total: exercisesPerRound,
            })}
          </Text>
        </YStack>
        <Button
          size="$3"
          circular
          icon={<Text fontSize={20}>⏸️</Text>}
          onPress={pauseSession}
          chromeless
          hoverStyle={{ bg: "$pastelBlue" }}
          accessibilityLabel={t("session.pause_accessibility")}
          accessibilityRole="button"
        />
      </XStack>

      {/* Boss HP Bar (only for boss fights) */}
      {bossFight && (
        <BossHpBar
          currentHp={bossFight.currentHp}
          totalHp={bossFight.totalHp}
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
          borderColor="$color"
          rounded="$4"
        >
          <Progress.Indicator animation="bouncy" bg="$color" opacity={0.35} />
        </Progress>
        <XStack justify="space-between">
          <Text fontSize={10} fontWeight="900" opacity={0.5} color="$color">
            {t("session.round_label", {
              count: currentRoundIndex + 1,
              total: quest.rounds,
            })}
          </Text>
          <Text fontSize={10} fontWeight="900" opacity={0.5} color="$color">
            {Math.round(progressPercent)}%
          </Text>
        </XStack>
      </YStack>

      {/* Within-exercise timer progress (only for time-based exercises) */}
      {isTimeBased && (
        <YStack gap="$2">
          <XStack justify="space-between" items="baseline">
            <Text fontSize={12} fontWeight="900" color="$color" opacity={0.75}>
              {isOvertime ? t("session.bonus_time") : t("session.time_progress")}
            </Text>
            <Text fontSize={12} fontWeight="900" color="$color" opacity={0.6}>
              {isOvertime ? formatOvertime(overtimeSeconds) : formatTime(remainingSeconds)}
            </Text>
          </XStack>
          <Progress
            value={Math.min(1, Math.max(0, progress)) * 100}
            size="$4"
            bg="$bgLight"
            borderWidth={2}
            borderColor="$color"
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
        {/* Exercise Image Placeholder */}
        <YStack
          width="100%"
          aspectRatio={16 / 10}
          bg="$bgLight"
          rounded="$4"
          overflow="hidden"
          borderWidth={3}
          borderColor="$color"
          items="center"
          justify="center"
        >
          {/* In a real app, we'd resolve currentEx.exercise.imagePath */}
          <Text fontSize={50}>🏋️</Text>
        </YStack>

        {/* Exercise Name + How to do it */}
        <YStack items="center" gap="$2" width="100%">
          <H2
            fontWeight="900"
            textTransform="uppercase"
            fontSize={28}
            lineHeight={32}
            style={{ textAlign: "center" }}
            color="$color"
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
                  <Text fontSize={12} fontWeight="700" color="$color">
                    {t("session.how_to_do_it")}
                  </Text>
                  <Text fontSize={12} color="$color">
                    {showHowTo ? "▲" : "▼"}
                  </Text>
                </XStack>
              </Pressable>
              {showHowTo && (
                <YStack
                  bg="$bgLight"
                  p="$3"
                  rounded="$4"
                  borderWidth={2}
                  borderColor="$color"
                  mt="$2"
                  animation="quick"
                  enterStyle={{ opacity: 0, scale: 0.95 }}
                >
                  <Text fontSize={14} color="$color" opacity={0.9} lineHeight={20}>
                    {exerciseDescription}
                  </Text>
                </YStack>
              )}
            </YStack>
          ) : null}
        </YStack>

        {/* Big Counter */}
        <YStack
          bg={isTimeBased ? (isOvertime ? "$pastelGreen" : "$background") : "$background"}
          py="$6"
          px="$8"
          rounded="$8"
          borderWidth={3}
          borderColor={isOvertime ? "$success" : "$color"}
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
                  <Text
                    fontSize={14}
                    fontWeight="800"
                    color="$color"
                    opacity={0.7}
                    textTransform="uppercase"
                  >
                    🔥 {t("session.overtime")} 🔥
                  </Text>
                  <H1 fontSize={72} fontWeight="900" fontFamily="$body" color="$success">
                    {formatOvertime(overtimeSeconds)}
                  </H1>
                  <Paragraph
                    fontWeight="800"
                    opacity={0.8}
                    textTransform="uppercase"
                    color="$color"
                  >
                    {t("session.target_reached")}
                  </Paragraph>
                </>
              ) : (
                <>
                  {/* Normal countdown */}
                  <H1 fontSize={72} fontWeight="900" fontFamily="$body" color="$color">
                    {formatTime(remainingSeconds)}
                  </H1>
                  <Paragraph
                    fontWeight="800"
                    opacity={0.7}
                    textTransform="uppercase"
                    color="$color"
                  >
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
                  bg="$bgLight"
                  borderWidth={2}
                  borderColor="$color"
                  onPress={() => handleAdjustReps(-1)}
                  pressStyle={{ opacity: 0.8, scale: 0.95 }}
                  disabled={adjustedReps <= 1}
                  opacity={adjustedReps <= 1 ? 0.4 : 1}
                  accessibilityLabel={t("session.decrease_reps_accessibility")}
                  accessibilityRole="button"
                >
                  <Text fontSize={24} fontWeight="900" color="$color">
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
                  <H1 fontSize={80} fontWeight="900" fontFamily="$body" color="$color">
                    {adjustedReps}
                  </H1>
                  <Paragraph
                    fontWeight="800"
                    opacity={0.8}
                    textTransform="uppercase"
                    color="$color"
                  >
                    {t("session.reps")}
                  </Paragraph>
                </YStack>
                <Button
                  size="$4"
                  circular
                  bg="$bgLight"
                  borderWidth={2}
                  borderColor="$color"
                  onPress={() => handleAdjustReps(1)}
                  pressStyle={{ opacity: 0.8, scale: 0.95 }}
                  accessibilityLabel={t("session.increase_reps_accessibility")}
                  accessibilityRole="button"
                >
                  <Text fontSize={24} fontWeight="900" color="$color">
                    +
                  </Text>
                </Button>
              </XStack>
              {adjustedReps !== targetValue && (
                <Text fontSize={12} color="$color" opacity={0.6}>
                  {t("session.adjust_reps_hint")}
                </Text>
              )}
            </YStack>
          )}
        </YStack>

        {/* Hint for time-based exercises */}
        {isTimeBased && !isOvertime && (
          <Text fontSize={12} color="$color" opacity={0.5} style={{ textAlign: "center" }}>
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
        borderWidth={3}
        borderColor="$color"
        rounded="$6"
        accessibilityLabel={
          isOvertime
            ? t("session.finish_exercise_accessibility")
            : t("session.complete_exercise_accessibility")
        }
        accessibilityRole="button"
      >
        <Text color="white" fontSize={24} fontWeight="900" textTransform="uppercase">
          {isOvertime ? t("session.complete_overtime") : t("session.complete_button")}
        </Text>
      </Button>
    </YStack>
  );
}
