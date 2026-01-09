import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { formatTime } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";

/**
 * SessionProgressBar
 *
 * Displays a persistent progress bar at the top of exercise/rest screens showing:
 * - Overall session progress (exercises completed / total)
 * - Global elapsed time since session start
 */
export function SessionProgressBar() {
  const { t } = useTranslation();

  const quest = useSessionStore((s) => s.quest);
  const results = useSessionStore((s) => s.results);
  const startTime = useSessionStore((s) => s.startTime);
  const totalPausedTime = useSessionStore((s) => s.totalPausedTime);

  // Calculate elapsed time
  const elapsedSeconds = useMemo(() => {
    if (!startTime) return 0;
    return Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
  }, [startTime, totalPausedTime]);

  // Calculate progress
  const progressData = useMemo(() => {
    if (!quest) return { percent: 0, completed: 0, total: 0 };

    const totalExercises = quest.exercises.length;
    const totalRounds = quest.rounds;
    const totalSets = totalExercises * totalRounds;

    // Count completed sets from results
    const completedSets = results.length;

    const percent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

    return {
      percent: Math.min(100, percent),
      completed: completedSets,
      total: totalSets,
    };
  }, [quest, results.length]);

  if (!quest) return null;

  return (
    <YStack gap="$2" px="$1">
      {/* Stats Row */}
      <XStack justifyContent="space-between" items="center">
        <XStack items="center" gap="$2">
          <Text
            fontSize={11}
            fontWeight="800"
            color="$textSecondary"
            textTransform="uppercase"
            letterSpacing={1}
          >
            {t("session.progress")}
          </Text>
          <Text fontSize={12} fontWeight="900" color="$text">
            {progressData.completed}/{progressData.total}
          </Text>
        </XStack>

        <XStack items="center" gap="$2">
          <Text fontSize={11} fontWeight="800" color="$textSecondary">
            ⏱
          </Text>
          <Text fontSize={12} fontWeight="900" color="$text" fontFamily="$body">
            {formatTime(elapsedSeconds)}
          </Text>
        </XStack>
      </XStack>

      {/* Progress Bar */}
      <Progress
        value={progressData.percent}
        size="$2"
        bg="$bgOverlay"
        borderWidth={1}
        borderColor="$borderStrong"
        borderRadius="$2"
      >
        <Progress.Indicator animation="quick" bg="$primary" borderRadius="$2" />
      </Progress>
    </YStack>
  );
}
