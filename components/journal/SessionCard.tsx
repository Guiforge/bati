import { Image } from "expo-image";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { Calendar, Star, Trophy } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDuration } from "@/db";
import type { DifficultyCode } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

export interface JournalEntry {
  id: number;
  questTitle: string;
  /**
   * The quest's cover, list-sized, or null when it has none.
   *
   * Every row drew the same gold trophy, so a journal of twenty sessions was twenty identical
   * icons and the title was the only thing telling them apart - on the one screen whose job is
   * to let you find a session again. Resolved by the list rather than here, next to the title it
   * comes from: the quest template is already in hand there, and `SessionCard` is memoized on
   * props it should not be re-deriving.
   */
  cover?: ImageSourcePropType | null;
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

const COVER_STYLE = { width: "100%", height: "100%" } as const;

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

  const durationLabel = entry.durationSeconds ? formatDuration(entry.durationSeconds) : "--";

  return (
    <Card flat testID="journal-session-card" onPress={onPress}>
      <XStack gap="$3" items="center">
        {/* Icon */}
        <YStack
          width={50}
          height={50}
          bg="$surface2"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          items="center"
          justify="center"
          overflow="hidden"
        >
          {entry.cover ? (
            <Image
              source={entry.cover}
              recyclingKey={String(entry.id)}
              style={COVER_STYLE}
              contentFit="cover"
              accessible={false}
            />
          ) : (
            // A hero-authored quest has no cover, and the trophy is the honest stand-in: it says
            // "a session happened" without pretending to be a picture of one.
            <Trophy size={24} color="$resourceGold" />
          )}
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
