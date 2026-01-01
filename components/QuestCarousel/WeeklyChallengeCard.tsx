import { startOfWeek, endOfWeek } from "date-fns";
import { and, gte, lte } from "drizzle-orm";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { db, schema } from "@/db/client";

export function WeeklyChallengeCard() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const target = 3;

  useEffect(() => {
    const fetchProgress = async () => {
      const now = new Date();
      const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const end = endOfWeek(now, { weekStartsOn: 1 });

      const sessions = await db.query.completedQuest.findMany({
        where: and(
          gte(schema.completedQuest.performedAt, start),
          lte(schema.completedQuest.performedAt, end)
        ),
      });

      setProgress(sessions.length);
    };
    fetchProgress();
  }, []);

  const isCompleted = progress >= target;
  const percentage = Math.min(100, (progress / target) * 100);

  return (
    <Card bg="$bgLight" borderWidth={3} borderColor="$secondary" p="$4">
      <YStack gap="$3">
        <XStack justify="space-between" items="center">
          <Text fontWeight="900" fontSize={16} color="$color" textTransform="uppercase">
            {t("challenges.weekly_title", "Weekly Challenge")}
          </Text>
          <Text fontSize={12} fontWeight="bold" color="$secondary">
            {t("challenges.reward_xp", { count: 500 })}
          </Text>
        </XStack>

        <Text fontSize={14} color="$color">
          {t("challenges.complete_quests", "Complete {{count}} quests", { count: target })}
        </Text>

        <YStack gap="$2">
          <XStack justify="space-between">
            <Text fontSize={12} fontWeight="bold" opacity={0.6}>
              {progress} / {target}
            </Text>
            {isCompleted && (
              <Text fontSize={12} fontWeight="bold" color="$primary">
                {t("common.completed", "Completed!")}
              </Text>
            )}
          </XStack>
          <Progress value={percentage} bg="$background" height={10}>
            <Progress.Indicator bg={isCompleted ? "$primary" : "$secondary"} animation="bouncy" />
          </Progress>
        </YStack>
      </YStack>
    </Card>
  );
}
