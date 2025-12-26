import { Flame, Target, Timer, TrendingUp, Trophy, Zap } from "@tamagui/lucide-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts";
import { type ColorTokens, Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
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

type StreakInfo = {
  current: number;
  best: number;
  isActive: boolean;
};

function calculateStreak(sessions: JournalStatsProps["sessions"]): StreakInfo {
  if (sessions.length === 0) {
    return { current: 0, best: 0, isActive: false };
  }

  // Sort by date descending (most recent first)
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
  );

  // Get unique days
  const uniqueDays = new Set<string>();
  sorted.forEach((s) => {
    const date = new Date(s.performedAt);
    uniqueDays.add(date.toISOString().split("T")[0]);
  });

  const sortedDays = Array.from(uniqueDays).sort().reverse();

  if (sortedDays.length === 0) {
    return { current: 0, best: 0, isActive: false };
  }

  // Check if streak is active (worked out today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWorkoutDate = new Date(sortedDays[0]);
  lastWorkoutDate.setHours(0, 0, 0, 0);

  const isActive =
    lastWorkoutDate.getTime() === today.getTime() ||
    lastWorkoutDate.getTime() === yesterday.getTime();

  // Calculate current streak
  let currentStreak = 0;
  if (isActive) {
    const checkDate = new Date(lastWorkoutDate);
    for (const dayStr of sortedDays) {
      const day = new Date(dayStr);
      day.setHours(0, 0, 0, 0);

      if (day.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (day.getTime() < checkDate.getTime()) {
        break;
      }
    }
  }

  // Calculate best streak
  let bestStreak = 0;
  const allDays = Array.from(uniqueDays).sort();
  let tempStreak = 1;
  for (let i = 1; i < allDays.length; i++) {
    const prev = new Date(allDays[i - 1]);
    const curr = new Date(allDays[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  return {
    current: currentStreak,
    best: bestStreak,
    isActive,
  };
}

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
    const dateStr = date.toISOString().split("T")[0];
    const label = new Intl.DateTimeFormat(language, {
      weekday: "short",
    }).format(date);

    days.push({ date: dateStr, label, minutes: 0 });
  }

  sessions.forEach((s) => {
    const dateStr = new Date(s.performedAt).toISOString().split("T")[0];
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
      rounded="$4"
      borderWidth={2}
      borderColor="$color"
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
      <Text fontWeight="900" fontSize={20} color="$color">
        {value}
      </Text>
      <Text
        fontSize={11}
        color="$color"
        opacity={0.6}
        fontWeight="600"
        style={{ textAlign: "center" }}
      >
        {label}
      </Text>
    </YStack>
  );
}

export function JournalStats({ sessions }: JournalStatsProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
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

  const streak = useMemo(() => calculateStreak(sessions), [sessions]);
  const weekdayData = useMemo(() => getWeekdayStats(sessions, language), [sessions, language]);
  const last7Days = useMemo(() => getLast7DaysData(sessions, language), [sessions, language]);

  if (!stats || sessions.length === 0) {
    return null;
  }

  const chartWidth = Math.min(width - 80, 300);

  // Prepare weekday chart data
  const weekdayChartData = weekdayData.map((d) => ({
    value: d.count,
    label: d.day,
    frontColor: d.count > 0 ? "#6366F1" : "#E5E7EB",
  }));

  // Prepare last 7 days line chart data
  const lineChartData = last7Days.map((d) => ({
    value: d.minutes,
    label: d.label,
    dataPointText: d.minutes > 0 ? String(d.minutes) : "",
  }));

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
              <Text fontWeight="900" fontSize={28} color={streak.isActive ? "white" : "$color"}>
                {streak.current} {t("journal.days", "days")}
              </Text>
              <Text
                fontSize={14}
                color={streak.isActive ? "white" : "$color"}
                opacity={streak.isActive ? 0.9 : 0.6}
                fontWeight="600"
              >
                {streak.isActive
                  ? t("journal.streak_active", "Current streak 🔥")
                  : t("journal.streak_inactive", "Streak paused")}
              </Text>
            </YStack>
          </XStack>
          <YStack items="center">
            <Text fontSize={12} color={streak.isActive ? "white" : "$color"} opacity={0.7}>
              {t("journal.best_streak", "Best")}
            </Text>
            <Text fontWeight="900" fontSize={20} color={streak.isActive ? "white" : "$secondary"}>
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
          <Text fontWeight="900" fontSize={16} color="$color">
            {t("journal.recent_activity", "Recent Activity")}
          </Text>
          <XStack gap="$4" justify="space-around">
            <YStack items="center" gap="$1">
              <XStack items="center" gap="$2">
                <Target size={16} color="$primary" />
                <Text fontWeight="900" fontSize={24} color="$primary">
                  {stats.thisWeekCount}
                </Text>
              </XStack>
              <Text fontSize={12} color="$color" opacity={0.6}>
                {t("journal.this_week", "This Week")}
              </Text>
            </YStack>
            <YStack width={1} height={40} bg="$color" opacity={0.1} />
            <YStack items="center" gap="$1">
              <XStack items="center" gap="$2">
                <Timer size={16} color="$success" />
                <Text fontWeight="900" fontSize={24} color="$success">
                  {stats.thisWeekMinutes}
                </Text>
              </XStack>
              <Text fontSize={12} color="$color" opacity={0.6}>
                {t("journal.minutes_this_week", "Mins This Week")}
              </Text>
            </YStack>
            <YStack width={1} height={40} bg="$color" opacity={0.1} />
            <YStack items="center" gap="$1">
              <XStack items="center" gap="$2">
                <TrendingUp size={16} color="$secondary" />
                <Text fontWeight="900" fontSize={24} color="$secondary">
                  {stats.thisMonthCount}
                </Text>
              </XStack>
              <Text fontSize={12} color="$color" opacity={0.6}>
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
            <Text fontWeight="900" fontSize={16} color="$color">
              {t("journal.last_7_days", "Last 7 Days")}
            </Text>
            <Paragraph color="$color" opacity={0.6} size="$2">
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
              color="#6366F1"
              dataPointsColor="#6366F1"
              dataPointsRadius={5}
              curved
              areaChart
              startFillColor="rgba(99, 102, 241, 0.3)"
              endFillColor="rgba(99, 102, 241, 0.01)"
              startOpacity={0.8}
              endOpacity={0.1}
              noOfSections={3}
              maxValue={Math.ceil(maxDailyMinutes / 10) * 10 + 10}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: "#9CA3AF", fontSize: 10 }}
              xAxisLabelTextStyle={{ color: "#9CA3AF", fontSize: 9 }}
              hideRules
              isAnimated
              animationDuration={500}
            />
          </YStack>
        </YStack>
      </Card>

      {/* Favorite Workout Days */}
      <Card>
        <YStack gap="$3">
          <YStack gap="$1">
            <Text fontWeight="900" fontSize={16} color="$color">
              {t("journal.workout_days", "Workout Days")}
            </Text>
            <Paragraph color="$color" opacity={0.6} size="$2">
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
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: "#9CA3AF", fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: "#6B7280",
                fontSize: 10,
                fontWeight: "600",
              }}
              hideRules
              isAnimated
              animationDuration={500}
            />
          </YStack>
        </YStack>
      </Card>

      {/* Difficulty Distribution */}
      <Card>
        <YStack gap="$3">
          <Text fontWeight="900" fontSize={16} color="$color">
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
              <YStack flex={stats.levels.easy} bg="#22C55E" height="100%" />
            )}
            {stats.levels.medium > 0 && (
              <YStack flex={stats.levels.medium} bg="#6366F1" height="100%" />
            )}
            {stats.levels.hard > 0 && (
              <YStack flex={stats.levels.hard} bg="#EF4444" height="100%" />
            )}
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}
