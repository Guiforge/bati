import { Image } from "expo-image";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Tag } from "@/components/common/Tag";
import { Calendar, Star, Trophy } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDuration } from "@/db";
import { hasGround } from "@/db/expeditions";
import type { DifficultyCode, Locomotion } from "@/db/schema";
import type { LngLat } from "@/src/gps/trace";
import { useSettingsStore } from "@/stores/settings";
import { TraceThumb } from "./TraceThumb";

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
  leaguesM: number | null;
  /** What the session paid. Zero on a row that somehow earned nothing, which draws no tag. */
  xpEarned: number;
  /** Moving seconds, on an outing. Null on a workout and on an outing saved before 0046. */
  movingSeconds: number | null;
  /** Which kind of session this was (`0049`). Null is a workout. */
  outing: Locomotion | null;
  /**
   * A few dozen points of this run, thinned for a thumbnail (`previewPathsFor`, `db/gps.ts`).
   * Empty on a workout, and on an outing whose service never started.
   */
  tracePoints: readonly LngLat[];
  userLevel: DifficultyCode;
  hasNewRecords?: boolean;
  /**
   * What the badge broke, when the row knows: the movement's name, or the record's own word.
   *
   * Null on every session saved before `0051`, which is when the row started keeping it. The
   * badge falls back to "PR" there rather than guessing: recomputing which record fell against
   * today's history would answer a different question than the one the day asked.
   */
  recordLabel?: string | null;
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
  const unit = useSettingsStore((s) => s.distanceUnit);
  const onPress = onPressEntry ? () => onPressEntry(entry.id) : undefined;

  const dateLabel = getDateTimeFormat(language, SESSION_DATE_OPTIONS).format(
    new Date(entry.performedAt),
  );

  const durationLabel = entry.durationSeconds ? formatDuration(entry.durationSeconds) : "--";
  // An outing's row leads with the ground, which is the one number a walk is remembered by.
  const metaLabel = hasGround(entry)
    ? `${formatDistance(entry.leaguesM, unit)} · ${durationLabel}`
    : durationLabel;

  return (
    <Card flat testID="journal-session-card" onPress={onPress}>
      <XStack gap="$3" items="center">
        {/* Icon */}
        {/* 64, not 50.
            The journal's covers are dark-fantasy paintings, and a dark painting cropped to a 50 px
            square on a dark card is a smudge: four rows of it read as four identical smudges with
            the title as the only thing telling them apart, on the one screen whose job is finding
            a session again. Fourteen more pixels is the whole fix, and the axe, the shield and the
            tower are legible at it.

            A ring in the quest's own colour was tried and dropped: `accent` is the same token for
            every key, and `bg`'s pastels resolve to near-identical plums against `$surface2`, so
            it was an ornament that looked like information. */}
        <YStack
          width={64}
          height={64}
          bg="$surface2"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          items="center"
          justify="center"
          overflow="hidden"
        >
          {/* The run itself, when there is one. The three seeded outings share three pictures, so
              a page of walks was a column of identical thumbnails - the same complaint the
              trophy below records, one row further in. A line is never the same twice. */}
          {/* One segment: `previewPathsFor` downsamples and drops the clock, so a row cannot know
              where the run broke. The detail screen behind it draws the real stretches. */}
          {entry.tracePoints.length > 1 ? (
            <TraceThumb segments={[entry.tracePoints]} size={64} />
          ) : entry.cover ? (
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
                <Text fontSize={10} fontWeight="bold" color="$text" numberOfLines={1}>
                  {entry.recordLabel ?? t("journal.pr_badge")}
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
            <Tag label={metaLabel} tone="secondary" />
            {/* What the session was worth, not only how long it took.
                A row gave a duration and a difficulty and never what was done inside it, so two
                runs of the same quest a month apart were indistinguishable unless one happened to
                last longer, which is the one thing nobody is trying to maximise. XP is priced off
                reps, tempo and difficulty, so it is the effort, in the unit this game already
                counts in. */}
            {entry.xpEarned > 0 ? (
              <Tag label={t("quests.reward_xp", { count: entry.xpEarned })} tone="primary" />
            ) : null}
            <Tag label={t(`quests.level_${entry.userLevel}`, entry.userLevel)} tone="primary" />
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
});
