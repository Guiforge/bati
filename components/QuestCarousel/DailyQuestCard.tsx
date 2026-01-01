import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack, YStack } from "tamagui";

import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { getQuestColorTokensFromTemplateWithExercises } from "@/constants/exerciseColors";
import type { Exercise } from "@/db/exercises";
import type { QuestTemplate } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";

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
  const desc = language === "fr" ? quest.frDescription : quest.enDescription;
  const emoji = questEmoji(quest.rounds, quest.exercises.length);
  const tokens = getQuestColorTokensFromTemplateWithExercises({
    quest,
    exercisesById,
  });

  return (
    <Card
      bg={tokens.bg}
      onPress={() => router.push(`/quests/${quest.id}` as never)}
      borderWidth={4}
      borderColor="$primary"
    >
      <YStack gap="$3">
        <XStack justify="space-between" items="center">
          <XStack bg="$primary" px="$2" py="$1" rounded="$4" rotate="-2deg">
            <Text color="white" fontWeight="900" fontSize={12} textTransform="uppercase">
              {t("quests.daily_quest", "Daily Quest")}
            </Text>
          </XStack>
          <Text fontSize={12} fontWeight="bold" opacity={0.6}>
            {t("common.daily_xp_bonus")}
          </Text>
        </XStack>

        <XStack gap="$3" items="flex-start">
          <YStack
            width={54}
            height={54}
            rounded={27}
            bg="$bgLight"
            borderWidth={3}
            borderColor="$color"
            justify="center"
            items="center"
          >
            <Text fontSize={26}>{emoji}</Text>
          </YStack>

          <YStack flex={1} gap="$2">
            <Text fontWeight="900" fontSize={18} color="$color" numberOfLines={2}>
              {title}
            </Text>
            <Paragraph color="$color" opacity={0.7} size="$3" numberOfLines={2}>
              {desc}
            </Paragraph>

            <XStack gap="$2" flexWrap="wrap" pt="$1">
              <Tag
                label={t("quests.rounds", {
                  count: quest.rounds,
                  defaultValue: `${quest.rounds} rounds`,
                })}
                tone="secondary"
              />
              <Tag
                label={t("quests.exercises", {
                  count: quest.exercises.length,
                  defaultValue: `${quest.exercises.length} exercises`,
                })}
                tone="primary"
              />
            </XStack>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}
