import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { H3, Text, XStack, YStack } from "tamagui";

import { Card } from "@/src/components/common/Card";
import { getQuestColorTokensFromTemplateWithExercises } from "@/src/constants/exerciseColors";
import { estimateQuestSeconds, formatDuration } from "@/src/db/estimate";
import type { Exercise } from "@/src/db/exercises";
import type { QuestTemplate } from "@/src/db/quests";
import { computeSessionXp } from "@/src/db/xp";
import { GameIcon } from "@/src/hooks/useGameIcon";
import { useSettingsStore } from "@/src/stores/settings";

interface DailyQuestCardProps {
  quest: QuestTemplate;
  exercisesById: Record<number, Exercise>;
}

function questEmoji(rounds: number, exerciseCount: number) {
  if (rounds >= 4) return "🧨";
  if (exerciseCount >= 4) return "⚔️";
  return "🪓";
}

export function DailyQuestCard({ quest, exercisesById }: DailyQuestCardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const title = language === "fr" ? quest.frTitle : quest.enTitle;
  const emoji = questEmoji(quest.rounds, quest.exercises.length);
  const tokens = getQuestColorTokensFromTemplateWithExercises({
    quest,
    exercisesById,
  });

  // Calculate estimates
  const estimatedSeconds = useMemo(() => {
    const input = {
      rounds: quest.rounds,
      restSeconds: quest.restSeconds,
      exercises: quest.exercises.map((e) => {
        const ex = exercisesById[e.exerciseId];
        const avgValue = Math.round((e.baseTarget.min + e.baseTarget.max) / 2);
        return {
          exercise: ex ?? { secondsPerRep: 3 },
          target: { type: e.baseTarget.type as "reps" | "time", value: avgValue },
        };
      }),
    };
    return estimateQuestSeconds(input);
  }, [quest, exercisesById]);

  const estimatedXp = useMemo(() => {
    return computeSessionXp({ durationSeconds: estimatedSeconds, userLevel: "medium" });
  }, [estimatedSeconds]);

  // Metadata string
  const duration = formatDuration(estimatedSeconds, language);
  const exerciseCount = quest.exercises.length;
  const metadata = `${quest.rounds} ${t("quest.rounds", "rounds")} • ${duration} • ${exerciseCount} ${t("quest.exercises", "exercises")}`;

  return (
    <Card
      bg={tokens.bg}
      onPress={() => router.push(`/quests/${quest.id}` as never)}
      borderWidth={3}
      borderColor="$color"
      p={0}
      overflow="hidden"
      animation="bouncy"
      pressStyle={{ scale: 0.98 }}
    >
      {/* Header Section (Colored Background with Large Icon/Emoji) */}
      <YStack
        bg={tokens.bg}
        height={100}
        justify="center"
        items="center"
        position="relative"
        borderBottomWidth={3}
        borderColor="$color"
      >
        <Text fontSize={64}>{emoji}</Text>

        {/* Rewards Badge */}
        <XStack
          position="absolute"
          bg="$primary"
          px="$2"
          py="$1"
          rounded="$4"
          borderWidth={2}
          borderColor="$color"
          items="center"
          gap="$1"
          rotate="2deg"
          shadowColor="$color"
          shadowRadius={0}
          shadowOffset={{ width: 2, height: 2 }}
          style={{ top: 8, right: 8 }}
        >
          <GameIcon name="lorc/star-prominences" size={12} tintColor="white" />
          <Text color="white" fontWeight="900" fontSize={12}>
            +{estimatedXp} XP
          </Text>
        </XStack>
      </YStack>

      {/* Content Section */}
      <YStack p="$3" gap="$1">
        <H3 color="$color" fontWeight="900" fontSize={20} numberOfLines={1}>
          {title}
        </H3>

        <Text color="$color" opacity={0.7} fontSize={14} fontWeight="bold">
          {metadata}
        </Text>
      </YStack>
    </Card>
  );
}
