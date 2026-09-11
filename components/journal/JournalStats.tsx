import { useTranslation } from "react-i18next";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Flame, Footprints, Map as MapIcon, Timer, Trophy, Zap } from "@/components/icons";
import { TrendsCard } from "@/components/journal/TrendsCard";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDurationEstimate } from "@/db";
import type { JournalStatsSummary } from "@/db/completed";
import { useStreakInfo } from "@/hooks/useStreakInfo";
import { useSettingsStore } from "@/stores/settings";
import type { JournalSession } from "./journalGrids";

interface JournalStatsProps {
  /**
   * The page the journal list is already holding. Only the weekday histogram reads it: "when you
   * usually train" is a shape rather than a total, and the recent hundred answer it better than
   * five years would. Every number that says "Total" comes from `stats`.
   */
  sessions: JournalSession[];
  /** The whole table's totals, counted in SQL. Null while the read is in flight. */
  stats: JournalStatsSummary | null;
}

function StatCard({
  icon,
  value,
  label,
  color = "$primary",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: ColorTokens;
}) {
  return (
    <YStack
      flex={1}
      bg="$surface2"
      p="$3"
      rounded="$6"
      borderWidth={1}
      borderColor="$borderStrong"
      items="center"
      gap="$1"
    >
      <YStack
        width={36}
        height={36}
        rounded={18}
        bg={color}
        items="center"
        justify="center"
        mb="$1"
      >
        {icon}
      </YStack>
      {/* One line, always. A third of the screen holds "3" and "20 min" comfortably and "25.00 km"
          not at all: it wrapped onto two lines and pushed the label into the card below. The tile
          is a fixed third of a row, so the value is what has to give. */}
      <Text fontWeight="700" fontSize={18} color="$text" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text
        fontSize={11}
        color="$text"
        opacity={0.6}
        fontWeight="700"
        style={{ textAlign: "center" }}
      >
        {label}
      </Text>
    </YStack>
  );
}

export function JournalStats({ sessions, stats }: JournalStatsProps) {
  const { t } = useTranslation();
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);

  const streak = useStreakInfo();

  if (!stats || sessions.length === 0) {
    return null;
  }

  return (
    <YStack gap="$4">
      {/* Streak Card */}
      {streak ? (
        <Card bg="$surface2">
          <XStack items="center" justify="space-between">
            <XStack items="center" gap="$3">
              <YStack
                width={50}
                height={50}
                rounded={25}
                bg="$bgLight"
                items="center"
                justify="center"
              >
                <Flame size={28} color={streak.isActive ? "$success" : "$textSecondary"} />
              </YStack>
              <YStack>
                <Text fontWeight="700" fontSize={28} color="$text">
                  {streak.current} {t("journal.days", "days")}
                </Text>
                <Text
                  fontSize={14}
                  color={streak.isActive ? "$success" : "$textSecondary"}
                  fontWeight="700"
                >
                  {streak.isActive
                    ? t("journal.streak_active", "Current streak 🔥")
                    : t("journal.streak_inactive", "Streak paused")}
                </Text>
              </YStack>
            </XStack>
            <YStack items="center">
              <Text fontSize={12} color="$textSecondary">
                {t("journal.best_streak", "Best")}
              </Text>
              <Text fontWeight="700" fontSize={20} color="$secondary">
                {streak.best}
              </Text>
            </YStack>
          </XStack>
        </Card>
      ) : (
        // Same row shape as the loaded card above (50px icon disc is the tallest element),
        // so the layout doesn't jump once the read lands — the sibling cards on this screen
        // (TrendsCard, PersonalRecordsCard) reserve height the same way.
        <SkeletonCard>
          <Skeleton height={50} />
        </SkeletonCard>
      )}

      {/* What the effort was worth, before how much of it there has been. The tiles below are
          lifetime totals, which move by a fraction of a percent on any given day; this is the one
          block on the card that can look different next week. */}
      <TrendsCard />

      {/* Quick Stats Grid */}
      <XStack gap="$3">
        <StatCard
          icon={<Trophy size={18} color="$white" />}
          value={stats.totalWorkouts}
          label={t("journal.total_workouts", "Total Workouts")}
          // StatCard's `color` fills the icon disc (`bg={color}`) — it is a background, so it
          // stays $primary while foreground uses moved to $primaryText.
          color="$primary"
        />
        <StatCard
          icon={<Timer size={18} color="$white" />}
          value={stats.totalMinutes}
          label={t("journal.total_minutes", "Total Minutes")}
          color="$success"
        />
        <StatCard
          icon={<Zap size={18} color="$white" />}
          value={formatDurationEstimate(stats.avgMinutes * 60)}
          label={t("journal.avg_duration", "Avg Duration")}
          color="$secondary"
        />
      </XStack>

      {/* Outings, on their own row. Only once there is one, like the walk tiles on the records
          card: three empty tiles would tell a hero who lifts that they are missing something. */}
      {stats.outings ? (
        <XStack gap="$3">
          <StatCard
            icon={<Footprints size={18} color="$white" />}
            value={stats.outings.count}
            label={t("journal.total_outings", "Total Outings")}
            color="$primary"
          />
          <StatCard
            icon={<MapIcon size={18} color="$white" />}
            value={formatDistance(stats.outings.leaguesM, distanceUnit)}
            label={t("journal.pr_ground", "Ground covered")}
            color="$success"
          />
          <StatCard
            icon={<Timer size={18} color="$white" />}
            value={formatDurationEstimate(stats.outings.avgMinutes * 60)}
            label={t("journal.avg_outing", "Avg Outing")}
            color="$secondary"
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
