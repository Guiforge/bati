import { Flame, Target, Timer, TrendingUp, Trophy, Zap } from "@tamagui/lucide-icons";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { type ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { TrendsCard } from "@/components/journal/TrendsCard";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { DIFFICULTY_COLOR_TOKENS, rawColors } from "@/constants/rawColors";
import { dayKey } from "@/db/dates";
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
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekdaysFr = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  sessions.forEach((s) => {
    const day = new Date(s.performedAt).getDay();
    counts[day]++;
  });

  const labels = language === "fr" ? weekdaysFr : weekdays;
  return labels.map((day, i) => ({ day, count: counts[i] }));
}

function getLast7DaysData(sessions: JournalStatsProps["sessions"], language: string) {
  const days: { date: string; label: string; minutes: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = dayKey(date);
    const label = getDateTimeFormat(language, { weekday: "short" }).format(date);

    days.push({ date: dateStr, label, minutes: 0 });
  }

  sessions.forEach((s) => {
    const dateStr = dayKey(new Date(s.performedAt));
    const dayData = days.find((d) => d.date === dateStr);
    if (dayData && s.durationSeconds) {
      dayData.minutes += Math.round(s.durationSeconds / 60);
    }
  });

  return days;
}

function StatCard({
  icon,
  value,
  label,
  color = "$primary",
  bgColor = "$bgLight",
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: ColorTokens;
  bgColor?: ColorTokens;
}) {
  return (
    <YStack
      flex={1}
      bg={bgColor}
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

    // This week stats
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
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
  }, [sessions]);

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
  const last7Days = useMemo(() => getLast7DaysData(sessions, language), [sessions, language]);

  // Memoized like weekdayData/last7Days above: gifted-charts rebuilds (and re-animates)
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

  const lineChartData = useMemo(
    () =>
      last7Days.map((d) => ({
        value: d.minutes,
        label: d.label,
        dataPointText: d.minutes > 0 ? String(d.minutes) : "",
      })),
    [last7Days],
  );

  if (!stats || sessions.length === 0) {
    return null;
  }

  const chartWidth = Math.min(width - 80, 300);
  const maxWeekdayCount = Math.max(...weekdayData.map((d) => d.count), 1);
  const maxDailyMinutes = Math.max(...last7Days.map((d) => d.minutes), 1);

  return (
    <YStack gap="$4">
      {/* Streak Card */}
      <Card bg={streak.isActive ? "$success" : "$pastelYellow"}>
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3">
            <YStack
              width={50}
              height={50}
              rounded={25}
              bg={streak.isActive ? "rgba(255,255,255,0.2)" : "$bgLight"}
              items="center"
              justify="center"
            >
              <Flame size={28} color={streak.isActive ? "white" : "$secondary"} />
            </YStack>
            <YStack>
              <Text fontWeight="700" fontSize={28} color={streak.isActive ? "white" : "$text"}>
                {streak.current} {t("journal.days", "days")}
              </Text>
              <Text
                fontSize={14}
                color={streak.isActive ? "white" : "$text"}
                opacity={streak.isActive ? 0.9 : 0.6}
                fontWeight="700"
              >
                {streak.isActive
                  ? t("journal.streak_active", "Current streak 🔥")
                  : t("journal.streak_inactive", "Streak paused")}
              </Text>
            </YStack>
          </XStack>
          <YStack items="center">
            <Text fontSize={12} color={streak.isActive ? "white" : "$text"} opacity={0.7}>
              {t("journal.best_streak", "Best")}
            </Text>
            <Text fontWeight="700" fontSize={20} color={streak.isActive ? "white" : "$secondary"}>
              {streak.best}
            </Text>
          </YStack>
        </XStack>
      </Card>

      {/* Quick Stats Grid */}
      <XStack gap="$3">
        <StatCard
          icon={<Trophy size={18} color="white" />}
          value={stats.totalWorkouts}
          label={t("journal.total_workouts", "Total Workouts")}
          color="$primary"
          bgColor="$pastelBlue"
        />
        <StatCard
          icon={<Timer size={18} color="white" />}
          value={stats.totalMinutes}
          label={t("journal.total_minutes", "Total Minutes")}
          color="$success"
          bgColor="$pastelGreen"
        />
        <StatCard
          icon={<Zap size={18} color="white" />}
          value={stats.avgMinutes}
          label={t("journal.avg_duration", "Avg Duration")}
          color="$secondary"
          bgColor="$pastelPurple"
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
                <Target size={16} color="$primary" />
                <Text fontWeight="700" fontSize={24} color="$primary">
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

      {/* Last 7 Days Chart */}
      <Card>
        <YStack gap="$3">
          <YStack gap="$1">
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("journal.last_7_days", "Last 7 Days")}
            </Text>
            <Paragraph color="$text" opacity={0.6} size="$2">
              {t("journal.minutes_per_day", "Minutes trained each day")}
            </Paragraph>
          </YStack>
          <YStack items="center" py="$2">
            <LineChart
              data={lineChartData}
              width={chartWidth}
              height={120}
              spacing={chartWidth / 8}
              initialSpacing={20}
              endSpacing={20}
              thickness={3}
              color={rawColors.primary}
              dataPointsColor={rawColors.primary}
              dataPointsRadius={5}
              curved
              areaChart
              startFillColor="rgba(13, 51, 242, 0.35)"
              endFillColor="rgba(13, 51, 242, 0.02)"
              startOpacity={0.8}
              endOpacity={0.1}
              noOfSections={3}
              maxValue={Math.ceil(maxDailyMinutes / 10) * 10 + 10}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={rawColors.borderStrong}
              yAxisTextStyle={{ color: rawColors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: rawColors.textSecondary, fontSize: 9 }}
              hideRules
            />
          </YStack>
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
          <YStack items="center" py="$2">
            <BarChart
              data={weekdayChartData}
              width={chartWidth}
              height={100}
              barWidth={28}
              spacing={12}
              barBorderRadius={6}
              noOfSections={3}
              maxValue={Math.ceil(maxWeekdayCount / 2) * 2 + 2}
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
