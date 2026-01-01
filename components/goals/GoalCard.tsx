import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { type Goal, type GoalProgress, getCurrentWeekCompletion, goalTypeInfo } from "@/db/goals";
import type { GoalTypeCode } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

type WeekCompletionData = {
  goal: Goal | null;
  progress: GoalProgress | null;
  percentage: number;
  isComplete: boolean;
};

export function GoalCard({ onPress }: { onPress?: () => void }) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [data, setData] = useState<WeekCompletionData | null>(null);

  const loadData = useCallback(async () => {
    try {
      const result = await getCurrentWeekCompletion();
      setData(result);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // No goal set - show prompt to set one
  if (!data?.goal) {
    return (
      <Card bg="$bgLight" width="100%" onPress={onPress}>
        <XStack items="center" gap="$3">
          <YStack
            width={48}
            height={48}
            rounded={24}
            bg="$pastelYellow"
            items="center"
            justify="center"
            borderWidth={2}
            borderColor="$color"
          >
            <Text fontSize={24}>🎯</Text>
          </YStack>
          <YStack flex={1} gap="$1">
            <Text fontWeight="900" fontSize={16} color="$color">
              {t("goals.no_goal")}
            </Text>
            <Paragraph color="$color" opacity={0.6} fontSize={12}>
              {t("goals.no_goal_subtitle")}
            </Paragraph>
          </YStack>
          <Text fontWeight="900" color="$primary" fontSize={14}>
            {t("goals.set_goal")} →
          </Text>
        </XStack>
      </Card>
    );
  }

  const { goal, progress, percentage, isComplete } = data;
  const typeInfo = goalTypeInfo[goal.goalType as GoalTypeCode];
  const typeName = language === "fr" ? typeInfo.fr : typeInfo.en;

  // Determine status message
  let statusMessage: string;
  let statusColor: "$success" | "$primary" | "$color";
  if (isComplete) {
    statusMessage = t("goals.goal_complete");
    statusColor = "$success";
  } else if (progress && progress.completedSessions > 0) {
    statusMessage = t("goals.on_track");
    statusColor = "$primary";
  } else {
    statusMessage = t("goals.weekly_progress");
    statusColor = "$color";
  }

  return (
    <Card bg="$pastelYellow" width="100%" onPress={onPress}>
      <YStack gap="$2">
        {/* Header row */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Text fontSize={24}>{typeInfo.emoji}</Text>
            <YStack>
              <Text fontWeight="900" fontSize={16} color="$color">
                {typeName}
              </Text>
              <Text fontSize={12} color="$color" opacity={0.6}>
                {t("goals.days", { count: goal.daysPerWeek })} •{" "}
                {t("goals.minutes", { count: goal.sessionMinutes })}
              </Text>
            </YStack>
          </XStack>
          <Text fontWeight="900" color={statusColor} fontSize={12}>
            {statusMessage}
          </Text>
        </XStack>

        {/* Progress bar */}
        {progress && (
          <YStack gap="$1">
            <Progress size="$3" value={percentage} bg="$background" rounded="$4">
              <Progress.Indicator animation="bouncy" bg={isComplete ? "$success" : "$primary"} />
            </Progress>
            <XStack justify="space-between">
              <Text fontSize={12} color="$color" opacity={0.6}>
                {t("goals.sessions_completed", {
                  completed: progress.completedSessions,
                  target: progress.targetSessions,
                })}
              </Text>
              <Text fontWeight="700" fontSize={12} color="$color">
                {Math.round(percentage)}%
              </Text>
            </XStack>
          </YStack>
        )}
      </YStack>
    </Card>
  );
}
