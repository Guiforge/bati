import { Calendar, Star, Trophy } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
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

  // Difficulty colors with dark theme
  const difficultyColors = {
    easy: {
      bg: "rgba(34, 197, 94, 0.15)",
      border: "rgba(34, 197, 94, 0.4)",
    },
    medium: {
      bg: "rgba(13, 51, 242, 0.15)",
      border: "rgba(13, 51, 242, 0.4)",
    },
    hard: {
      bg: "rgba(239, 68, 68, 0.15)",
      border: "rgba(239, 68, 68, 0.4)",
    },
  };

  const colors = difficultyColors[entry.userLevel] || difficultyColors.medium;

  return (
    <Pressable onPress={onPress}>
      <YStack
        bg="$glassBg"
        borderWidth={1}
        borderRadius="$4"
        p="$3"
        pressStyle={{ opacity: 0.8 }}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
        }}
      >
        <XStack gap="$3" items="center">
          {/* Icon */}
          <YStack
            width={50}
            height={50}
            bg="rgba(13, 51, 242, 0.2)"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$primary"
            items="center"
            justify="center"
          >
            <Trophy size={24} color="$primary" />
          </YStack>

          <YStack flex={1} gap="$1">
            <XStack gap="$2" items="center">
              <Text fontWeight="900" fontSize={16} numberOfLines={1} color="$text" flex={1}>
                {entry.questTitle}
              </Text>
              {entry.hasNewRecords && (
                <XStack bg="$primary" px="$2" py="$1" borderRadius="$3" gap="$1" items="center">
                  <Star size={12} color="white" fill="white" />
                  <Text fontSize={10} fontWeight="bold" color="white">
                    {t("journal.pr_badge")}
                  </Text>
                </XStack>
              )}
            </XStack>

            <XStack gap="$2" items="center">
              <Calendar size={12} color="$textSecondary" opacity={0.7} />
              <Text fontSize={12} opacity={0.8} color="$textSecondary">
                {dateLabel}
              </Text>
            </XStack>

            <XStack gap="$2" mt="$1" flexWrap="wrap">
              <Tag label={durationLabel} tone="secondary" />
              <Tag label={t(`quests.level_${entry.userLevel}`, entry.userLevel)} tone="primary" />
            </XStack>
          </YStack>
        </XStack>
      </YStack>
    </Pressable>
  );
}
