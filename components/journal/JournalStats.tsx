import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { type ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import {
  Flame,
  Footprints,
  Map as MapIcon,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "@/components/icons";
import { TrendsCard } from "@/components/journal/TrendsCard";
import { formatDistance } from "@/constants/distanceFormat";
import { DIFFICULTY_COLOR_TOKENS, rawColors } from "@/constants/rawColors";
import { formatDurationEstimate } from "@/db";
import { useStreakInfo } from "@/hooks/useStreakInfo";
import { useSettingsStore } from "@/stores/settings";
import { buildJournalStats, buildWeekdayBars, type JournalSession } from "./journalGrids";

interface JournalStatsProps {
  sessions: JournalSession[];
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
      <Text fontWeight="700" fontSize={20} color="$text">
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

export function JournalStats({ sessions }: JournalStatsProps) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const { width } = useWindowDimensions();

  const stats = useMemo(
    () => (sessions.length === 0 ? null : buildJournalStats(sessions, language)),
    [sessions, language],
  );

  const streak = useStreakInfo();

  // "When you usually train", so training only — the card says so under its own title.
  const weekdayData = useMemo(
    () =>
      buildWeekdayBars(
        sessions.filter((s) => s.outing === null).map((s) => s.performedAt),
        language,
      ),
    [sessions, language],
  );

  // Memoized like weekdayData above: gifted-charts rebuilds (and re-animates)
  // its whole SVG tree whenever the data array identity changes.
  const weekdayChartData = useMemo(
    () =>
      weekdayData.map((d) => ({
        value: d.count,
        label: d.day,
        frontColor: d.count > 0 ? rawColors.primary : rawColors.borderStrong,
      })),
    [weekdayData],
  );

  if (!stats || sessions.length === 0) {
    return null;
  }

  const chartWidth = Math.min(width - 80, 300);
  const maxWeekdayCount = Math.max(...weekdayData.map((d) => d.count), 1);

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

      {/* This Week/Month Stats */}
      <Card>
        <YStack gap="$3">
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("journal.recent_activity", "Recent Activity")}
          </Text>
          <XStack gap="$4" justify="space-around">
            <YStack items="center" gap="$1">
              <XStack items="center" gap="$2">
                <Target size={16} color="$primaryText" />
                <Text fontWeight="700" fontSize={24} color="$primaryText">
                  {stats.thisWeekCount}
                </Text>
              </XStack>
              <Text fontSize={12} color="$text" opacity={0.6}>
                {t("journal.this_week", "This Week")}
              </Text>
            </YStack>
            <YStack width={1} height={40} bg="$text" opacity={0.1} />
            <YStack items="center" gap="$1">
              <XStack items="center" gap="$2">
                <Timer size={16} color="$success" />
                <Text fontWeight="700" fontSize={24} color="$success">
                  {stats.thisWeekMinutes}
                </Text>
              </XStack>
              <Text fontSize={12} color="$text" opacity={0.6}>
                {t("journal.minutes_this_week", "Mins This Week")}
              </Text>
            </YStack>
            <YStack width={1} height={40} bg="$text" opacity={0.1} />
            <YStack items="center" gap="$1">
              <XStack items="center" gap="$2">
                <TrendingUp size={16} color="$secondary" />
                <Text fontWeight="700" fontSize={24} color="$secondary">
                  {stats.thisMonthCount}
                </Text>
              </XStack>
              <Text fontSize={12} color="$text" opacity={0.6}>
                {t("journal.this_month", "This Month")}
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </Card>

      {/* Favorite Workout Days */}
      <Card>
        <YStack gap="$3">
          <YStack gap="$1">
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("journal.workout_days", "Workout Days")}
            </Text>
            <Paragraph color="$text" opacity={0.6} size="$2">
              {t("journal.when_you_train", "When you usually train")}
            </Paragraph>
          </YStack>
          <YStack
            items="center"
            py="$2"
            accessible
            accessibilityLabel={`${t("journal.when_you_train", "When you usually train")}: ${weekdayData
              .map((d) => `${d.day} ${d.count}`)
              .join(", ")}`}
          >
            {/* 2 sections, not 3: maxValue is always even, so halves stay integers —
                thirds gave the session-count axis labels like 2.7 */}
            <BarChart
              data={weekdayChartData}
              width={chartWidth}
              height={100}
              barWidth={28}
              spacing={12}
              barBorderRadius={6}
              noOfSections={2}
              maxValue={Math.ceil(maxWeekdayCount / 2) * 2 + 2}
              formatYLabel={(label) => String(Number.parseFloat(label))}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={rawColors.borderStrong}
              yAxisTextStyle={{ color: rawColors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: rawColors.textSecondary,
                fontSize: 10,
                fontWeight: "600",
              }}
              hideRules
            />
          </YStack>
        </YStack>
      </Card>

      {/* Difficulty Distribution */}
      <Card>
        <YStack gap="$3">
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("journal.difficulty_split", "Difficulty Split")}
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            <Chip
              label={`${t("quests.level_easy", "Easy")}: ${stats.levels.easy}`}
              tone="success"
            />
            <Chip
              label={`${t("quests.level_medium", "Medium")}: ${stats.levels.medium}`}
              tone="primary"
            />
            <Chip
              label={`${t("quests.level_hard", "Hard")}: ${stats.levels.hard}`}
              tone="secondary"
            />
          </XStack>
          {/* Visual bar */}
          <XStack height={12} rounded={6} overflow="hidden" bg="$bgLight">
            {stats.levels.easy > 0 && (
              <YStack flex={stats.levels.easy} bg={DIFFICULTY_COLOR_TOKENS.easy} height="100%" />
            )}
            {stats.levels.medium > 0 && (
              <YStack
                flex={stats.levels.medium}
                bg={DIFFICULTY_COLOR_TOKENS.medium}
                height="100%"
              />
            )}
            {stats.levels.hard > 0 && (
              <YStack flex={stats.levels.hard} bg={DIFFICULTY_COLOR_TOKENS.hard} height="100%" />
            )}
          </XStack>
        </YStack>
      </Card>

      {/* Historical Trends */}
      <TrendsCard />
    </YStack>
  );
}
