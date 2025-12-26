import { Calendar, Trophy } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { formatDuration } from "@/db";
import type { DifficultyCode } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

export interface JournalEntry {
  id: number;
  questTitle: string;
  performedAt: Date;
  durationSeconds: number | null;
  userLevel: DifficultyCode;
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

  return (
    <Card onPress={onPress}>
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
          <Trophy size={24} color="#1A1A2E" />
        </YStack>

        <YStack flex={1} gap="$1">
          <Text fontWeight="900" fontSize={16} numberOfLines={1} color="$color">
            {entry.questTitle}
          </Text>

          <XStack gap="$2" items="center">
            <Calendar size={12} color="$color" opacity={0.5} />
            <Text fontSize={12} opacity={0.6} color="$color">
              {dateLabel}
            </Text>
          </XStack>

          <XStack gap="$2" mt="$1" flexWrap="wrap">
            <Chip label={durationLabel} tone="secondary" />
            <Chip
              label={t(`quests.level_${entry.userLevel}`, entry.userLevel)}
              tone="primary"
            />
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
