import { Flame, Target, Timer, TrendingUp, Trophy, Zap } from "@tamagui/lucide-icons";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { type ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { TrendsCard } from "@/components/journal/TrendsCard";
import { getDateTimeFormat, getWeekStart } from "@/constants/dateFormatters";
import { DIFFICULTY_COLOR_TOKENS, rawColors } from "@/constants/rawColors";
import { getStreakInfo, type StreakInfo } from "@/db/streaks";
import { useSettingsStore } from "@/stores/settings";

interface JournalStatsProps {
  sessions: {
    id: number;
    performedAt: Date;
    durationSeconds: number | null;
    userLevel: string;
  }[];
}

type WeekdayData = {
  day: string;
  count: number;
};

function getWeekdayStats(sessions: JournalStatsProps["sessions"], language: string): WeekdayData[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];

  sessions.forEach((s) => {
    const day = new Date(s.performedAt).getDay();
    counts[day]++;
  });

  // 2023-01-01 was a Sunday: day 1 + i lands on getDay() === i, which lets Intl name any
  // weekday. Ordered from the locale's first day of the week (Monday in French).
  const weekStartsOn = getWeekStart(language);
  const shortWeekday = getDateTimeFormat(language, { weekday: "short" });
  return Array.from({ length: 7 }, (_, i) => {
    const day = (weekStartsOn + i) % 7;
    const label = shortWeekday.format(new Date(2023, 0, 1 + day)).replace(/\.$/, "");
    return { day: label.charAt(0).toUpperCase() + label.slice(1), count: counts[day] };
  });
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
  const { width } = useWindowDimensions();

  const stats = useMemo(() => {
    if (sessions.length === 0) return null;

    const totalWorkouts = sessions.length;
    const totalMinutes = sessions.reduce(
      (acc, s) => acc + (s.durationSeconds ? Math.round(s.durationSeconds / 60) : 0),
      0,
    );
    const avgMinutes = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0;

    // Level distribution
    const levels = { easy: 0, medium: 0, hard: 0 };
    sessions.forEach((s) => {
      if (s.userLevel === "easy") levels.easy++;
      else if (s.userLevel === "hard") levels.hard++;
      else levels.medium++;
    });

    // This week stats, from the locale's first day of the week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - ((today.getDay() - getWeekStart(language) + 7) % 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekSessions = sessions.filter((s) => new Date(s.performedAt) >= startOfWeek);
    const thisWeekMinutes = thisWeekSessions.reduce(
      (acc, s) => acc + (s.durationSeconds ? Math.round(s.durationSeconds / 60) : 0),
      0,
    );

    // This month stats
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthSessions = sessions.filter((s) => new Date(s.performedAt) >= startOfMonth);

    return {
      totalWorkouts,
      totalMinutes,
      avgMinutes,
      levels,
      thisWeekCount: thisWeekSessions.length,
      thisWeekMinutes,
      thisMonthCount: thisMonthSessions.length,
    };
  }, [sessions, language]);

  const [streak, setStreak] = useState<StreakInfo>({
    current: 0,
    best: 0,
    isActive: false,
    lastWorkoutDate: null,
  });
  useEffect(() => {
    getStreakInfo()
      .then(setStreak)
      .catch(() => {
        // Keep default zero-streak state
      });
  }, []);

  const weekdayData = useMemo(() => getWeekdayStats(sessions, language), [sessions, language]);

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
          value={stats.avgMinutes}
          label={t("journal.avg_duration", "Avg Duration")}
          color="$secondary"
        />
      </XStack>

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
