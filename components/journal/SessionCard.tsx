import { Calendar, Star, Trophy } from "@tamagui/lucide-icons";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDuration } from "@/db";
import type { DifficultyCode } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

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
  // Takes the id instead of a closure so the list can pass one stable handler to every
  // row and React.memo actually skips re-renders.
  onPressEntry?: (id: number) => void;
}

const SESSION_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

export const SessionCard = memo(function SessionCard({ entry, onPressEntry }: SessionCardProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const onPress = onPressEntry ? () => onPressEntry(entry.id) : undefined;

  const dateLabel = getDateTimeFormat(language, SESSION_DATE_OPTIONS).format(
    new Date(entry.performedAt),
  );

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
    <Card flat testID="journal-session-card" onPress={onPress} bg={sessionBg}>
      <XStack gap="$3" items="center">
        {/* Icon */}
        <YStack
          width={50}
          height={50}
          bg="$pastelYellow"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          items="center"
          justify="center"
        >
          <Trophy size={24} color="$text" />
        </YStack>

        <YStack flex={1} gap="$1">
          <XStack gap="$2" items="center">
            <Text fontWeight="700" fontSize={16} numberOfLines={1} color="$text" flex={1}>
              {entry.questTitle}
            </Text>
            {!!entry.hasNewRecords && (
              <XStack
                bg="$primary"
                px="$2"
                py="$1"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderStrong"
                gap="$1"
                items="center"
              >
                <Star size={12} color="$text" fill="$text" />
                <Text fontSize={10} fontWeight="bold" color="$text">
                  {t("journal.pr_badge")}
                </Text>
              </XStack>
            )}
          </XStack>

          <XStack gap="$2" items="center">
            <Calendar size={12} color="$text" opacity={0.5} />
            <Text fontSize={12} opacity={0.6} color="$text">
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
});
