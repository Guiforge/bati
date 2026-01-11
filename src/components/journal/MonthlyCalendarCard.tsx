import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/src/components/common/Card";
import { listCompletedSessions } from "@/src/db/completed";
import { useSettingsStore } from "@/src/stores/settings";

type DayData = {
  date: number;
  hasWorkout: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
  isStreakDay: boolean;
};

type MonthData = {
  year: number;
  month: number; // 0-11
  days: DayData[];
  workoutCount: number;
  streakDays: number;
};

const DAYS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_FR = ["D", "L", "M", "M", "J", "V", "S"];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function getMonthData(
  year: number,
  month: number,
  workoutDates: Set<string>,
  streakDates: Set<string>
): MonthData {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();

  const days: DayData[] = [];

  // Add previous month padding days
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    days.push({
      date,
      hasWorkout: workoutDates.has(dateStr),
      isToday: false,
      isCurrentMonth: false,
      isStreakDay: streakDates.has(dateStr),
    });
  }

  // Add current month days
  let workoutCount = 0;
  let streakDays = 0;

  for (let date = 1; date <= lastDay.getDate(); date++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    const dayDate = new Date(year, month, date);
    dayDate.setHours(0, 0, 0, 0);

    const hasWorkout = workoutDates.has(dateStr);
    const isStreakDay = streakDates.has(dateStr);

    if (hasWorkout) workoutCount++;
    if (isStreakDay) streakDays++;

    days.push({
      date,
      hasWorkout,
      isToday: dayDate.getTime() === today.getTime(),
      isCurrentMonth: true,
      isStreakDay,
    });
  }

  // Add next month padding days to complete the grid (6 rows x 7 days = 42)
  const remainingDays = 42 - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let date = 1; date <= remainingDays; date++) {
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
    days.push({
      date,
      hasWorkout: workoutDates.has(dateStr),
      isToday: false,
      isCurrentMonth: false,
      isStreakDay: streakDates.has(dateStr),
    });
  }

  return { year, month, days, workoutCount, streakDays };
}

function calculateStreakDates(workoutDates: Set<string>): Set<string> {
  const streakDates = new Set<string>();
  const sortedDates = Array.from(workoutDates).sort();

  if (sortedDates.length === 0) return streakDates;

  // Find consecutive sequences
  let currentStreak: string[] = [sortedDates[0]];

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak.push(sortedDates[i]);
    } else {
      // End of streak - add to streakDates if 2+ days
      if (currentStreak.length >= 2) {
        for (const d of currentStreak) streakDates.add(d);
      }
      currentStreak = [sortedDates[i]];
    }
  }

  // Handle last streak
  if (currentStreak.length >= 2) {
    for (const d of currentStreak) streakDates.add(d);
  }

  return streakDates;
}

export function MonthlyCalendarCard() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    async function loadData() {
      // Get all sessions for workout dates
      const sessions = await listCompletedSessions(500);

      const workoutDates = new Set<string>();
      for (const session of sessions) {
        const dateStr = session.performedAt.toISOString().split("T")[0];
        workoutDates.add(dateStr);
      }

      const streakDates = calculateStreakDates(workoutDates);
      const data = getMonthData(currentMonth.year, currentMonth.month, workoutDates, streakDates);
      setMonthData(data);
    }

    loadData();
  }, [currentMonth]);

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => ({
      year: prev.month === 0 ? prev.year - 1 : prev.year,
      month: prev.month === 0 ? 11 : prev.month - 1,
    }));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => ({
      year: prev.month === 11 ? prev.year + 1 : prev.year,
      month: prev.month === 11 ? 0 : prev.month + 1,
    }));
  };

  if (!monthData) {
    return null;
  }

  const dayLabels = language === "fr" ? DAYS_FR : DAYS_EN;
  const monthName = language === "fr" ? MONTHS_FR[monthData.month] : MONTHS_EN[monthData.month];

  return (
    <Card p="$3">
      <YStack gap="$2">
        {/* Header with month navigation */}
        <XStack items="center" justify="space-between" px="$1">
          <Pressable onPress={goToPrevMonth}>
            <ChevronLeft size={24} color="$text" />
          </Pressable>
          <Text fontWeight="900" fontSize={16} color="$text">
            {monthName} {monthData.year}
          </Text>
          <Pressable onPress={goToNextMonth}>
            <ChevronRight size={24} color="$text" />
          </Pressable>
        </XStack>

        {/* Day labels */}
        <XStack justify="space-around">
          {dayLabels.map((day) => (
            <Text
              key={day}
              width={32}
              style={{ textAlign: "center" }}
              fontSize={12}
              fontWeight="600"
              color="$text"
              opacity={0.6}
            >
              {day}
            </Text>
          ))}
        </XStack>

        {/* Calendar grid */}
        <YStack gap="$1">
          {[0, 1, 2, 3, 4, 5].map((week) => (
            <XStack key={`week-${week}`} justify="space-around">
              {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Calendar rendering requires conditional styling per day */}
              {monthData.days.slice(week * 7, week * 7 + 7).map((day) => (
                <YStack
                  key={`day-${week}-${day.date ?? "empty"}`}
                  width={32}
                  height={32}
                  rounded={16}
                  items="center"
                  justify="center"
                  bg={
                    day.isToday
                      ? "$primary"
                      : day.hasWorkout && day.isCurrentMonth
                        ? day.isStreakDay
                          ? "$success"
                          : "$glassBg"
                        : undefined
                  }
                  borderWidth={day.isToday ? 2 : 0}
                  borderColor="$borderStrong"
                >
                  <Text
                    fontSize={13}
                    fontWeight={day.hasWorkout || day.isToday ? "700" : "400"}
                    color={day.isToday ? "white" : "$textSecondary"}
                    opacity={day.isCurrentMonth ? 1 : 0.3}
                  >
                    {day.date}
                  </Text>
                </YStack>
              ))}
            </XStack>
          ))}
        </YStack>

        {/* Stats row */}
        <XStack
          justify="space-around"
          pt="$2"
          borderTopWidth={1}
          borderColor="$borderStrong"
          opacity={0.2}
        >
          <YStack items="center">
            <Text fontWeight="900" fontSize={18} color="$text">
              {monthData.workoutCount}
            </Text>
            <Text fontSize={11} color="$text" opacity={0.6}>
              {t("journal.workout_days")}
            </Text>
          </YStack>
          <YStack items="center">
            <Text fontWeight="900" fontSize={18} color="$success">
              {monthData.streakDays}
            </Text>
            <Text fontSize={11} color="$text" opacity={0.6}>
              {t("journal.streak_active", "Streak days").replace(" 🔥", "")}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}
