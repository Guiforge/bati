import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H2, Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { formatOvertime, formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

export function ActiveExerciseView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { quest, currentRoundIndex, currentExerciseIndex, completeExercise, pauseSession } =
    useSessionStore();
  const { remainingSeconds, elapsedSeconds, isOvertime, progress } = useSessionTimer();

  if (!quest) return null;

  const currentEx = quest.exercises[currentExerciseIndex];
  const isTimeBased = currentEx.target.type === "time";
  const targetValue = currentEx.target.value;

  const exerciseName = language === "fr" ? currentEx.exercise.frName : currentEx.exercise.enName;

  // Progress calculation
  const exercisesPerRound = quest.exercises.length;
  const totalSteps = exercisesPerRound * quest.rounds;
  const currentStep = currentRoundIndex * exercisesPerRound + currentExerciseIndex + 1;
  const progressPercent = (currentStep / totalSteps) * 100;

  const handleComplete = () => {
    // For time-based exercises, record actual elapsed time
    // For rep-based, record the target value
    if (isTimeBased) {
      completeExercise(elapsedSeconds);
    } else {
      completeExercise(targetValue);
    }
  };

  // Calculate overtime seconds for display
  const overtimeSeconds = isOvertime ? Math.abs(remainingSeconds) : 0;

  const screenBg = isTimeBased ? "$pastelBlue" : "$pastelYellow";

  return (
    <YStack flex={1} bg={screenBg} pt={insets.top + 16} pb={insets.bottom + 16} px="$4" gap="$4">
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
              defaultValue: `ROUND ${currentRoundIndex + 1} / ${quest.rounds}`,
            })}
          </Text>
          <Text color="$color" fontSize={16} fontWeight="900" textTransform="uppercase">
            {t("session.exercise_label", {
              count: currentExerciseIndex + 1,
              total: exercisesPerRound,
              defaultValue: `EXERCISE ${currentExerciseIndex + 1} / ${exercisesPerRound}`,
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
        />
      </XStack>

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
              defaultValue: `Round ${currentRoundIndex + 1} / ${quest.rounds}`,
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
              {isOvertime
                ? t("session.bonus_time", "BONUS TIME")
                : t("session.time_progress", "TIME")}
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

        {/* Exercise Name */}
        <YStack items="center" gap="$1">
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
                    🔥 {t("session.overtime", "BONUS TIME")} 🔥
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
                    {t("session.target_reached", "Target reached!")}
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
                    {t("session.seconds", "Seconds")}
                  </Paragraph>
                </>
              )}
            </YStack>
          ) : (
            <YStack items="center">
              <H1 fontSize={80} fontWeight="900" fontFamily="$body" color="$color">
                {targetValue}
              </H1>
              <Paragraph fontWeight="800" opacity={0.8} textTransform="uppercase" color="$color">
                {t("session.reps", "Reps")}
              </Paragraph>
            </YStack>
          )}
        </YStack>

        {/* Hint for time-based exercises */}
        {isTimeBased && !isOvertime && (
          <Text fontSize={12} color="$color" opacity={0.5} style={{ textAlign: "center" }}>
            {t("session.keep_going_hint", "Keep going! Timer continues after target.")}
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
      >
        <Text color="white" fontSize={24} fontWeight="900" textTransform="uppercase">
          {isOvertime
            ? t("session.complete_overtime", "FINISH! 🎉")
            : t("session.complete_button", "DONE!")}
        </Text>
      </Button>
    </YStack>
  );
}
