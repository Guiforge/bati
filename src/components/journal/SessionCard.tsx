import { Calendar, Star, Trophy } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/src/components/common/Card";
import { Tag } from "@/src/components/common/Tag";
import { formatDuration } from "@/src/db";
import type { DifficultyCode } from "@/src/db/schema";
import { useSettingsStore } from "@/src/stores/settings";

export interface JournalEntry {
  id: number;
  questTitle: string;
  performedAt: Date;
  durationSeconds: number | null;
  userLevel: DifficultyCode;
  hasNewRecords?: boolean;
}

interface SessionCardProps {
  entry: JournalEntry;
  onPress?: () => void;
}

export function SessionCard({ entry, onPress }: SessionCardProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const dateLabel = new Intl.DateTimeFormat(language, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(entry.performedAt));

  const durationLabel = entry.durationSeconds
    ? formatDuration(entry.durationSeconds, language)
    : "--";

  const sessionBg =
    entry.userLevel === "easy"
      ? "$pastelGreen"
      : entry.userLevel === "hard"
        ? "$pastelPink"
        : "$pastelBlue";

  return (
    <Card onPress={onPress} bg={sessionBg}>
      <XStack gap="$3" items="center">
        {/* Icon */}
        <YStack
          width={50}
          height={50}
          bg="$pastelYellow"
          rounded="$4"
          borderWidth={2}
          borderColor="$color"
          items="center"
          justify="center"
        >
          <Trophy size={24} color="$color" />
        </YStack>

        <YStack flex={1} gap="$1">
          <XStack gap="$2" items="center">
            <Text fontWeight="900" fontSize={16} numberOfLines={1} color="$color" flex={1}>
              {entry.questTitle}
            </Text>
            {entry.hasNewRecords && (
              <XStack
                bg="$primary"
                px="$2"
                py="$1"
                rounded="$3"
                borderWidth={2}
                borderColor="$color"
                gap="$1"
                items="center"
              >
                <Star size={12} color="$color" fill="$color" />
                <Text fontSize={10} fontWeight="bold" color="$color">
                  {t("journal.pr_badge")}
                </Text>
              </XStack>
            )}
          </XStack>

          <XStack gap="$2" items="center">
            <Calendar size={12} color="$color" opacity={0.5} />
            <Text fontSize={12} opacity={0.6} color="$color">
              {dateLabel}
            </Text>
          </XStack>

          <XStack gap="$2" mt="$1" flexWrap="wrap">
            <Tag label={durationLabel} tone="secondary" />
            <Tag label={t(`quests.level_${entry.userLevel}`, entry.userLevel)} tone="primary" />
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
