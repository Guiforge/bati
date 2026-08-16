import { ChevronLeft, ChevronRight } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { getDateTimeFormat, getWeekStart } from "@/constants/dateFormatters";
import { listWorkoutDayKeys } from "@/db/completed";
import { getStreakInfo } from "@/db/streaks";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";
import { buildMonthGrid, type MonthGrid, weekdayReference } from "./journalGrids";

function LegendDot({ color, label }: { color: ColorTokens; label: string }) {
  return (
    <XStack items="center" gap="$1.5">
      <YStack
        width={10}
        height={10}
        rounded={5}
        bg={color}
        borderWidth={1}
        borderColor="$borderStrong"
      />
      <Text fontSize={11} color="$text" opacity={0.6}>
        {label}
      </Text>
    </XStack>
  );
}

export function MonthlyCalendarCard() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const weekStartsOn = getWeekStart(language);

  const [monthData, setMonthData] = useState<MonthGrid | null>(null);
  // The card's streak cell shows the same flame as the home header (db/streaks.ts), not a
  // second consecutive-days count: two "streak" numbers with different definitions on screen
  // at once read as a bug.
  const [flameDays, setFlameDays] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    getStreakInfo()
      .then((info) => setFlameDays(info.current))
      .catch((error) => reportError("journal.calendar", error));
  }, []);

  useEffect(() => {
    async function loadData() {
      // An empty grid beats the eternal skeleton a failed read used to leave behind.
      let workoutDates = new Set<string>();
      try {
        workoutDates = await listWorkoutDayKeys();
      } catch (error) {
        reportError("journal.calendar", error);
      }
      const data = buildMonthGrid(
        currentMonth.year,
        currentMonth.month,
        workoutDates,
        weekStartsOn,
      );
      setMonthData(data);
    }

    loadData().catch((e) => reportError("journal.calendar", e));
  }, [currentMonth, weekStartsOn]);

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
    // Fixed-height placeholder: the grid is always 6 rows, so reserve it instead of popping in.
    return (
      <SkeletonCard>
        <Skeleton height={296} />
      </SkeletonCard>
    );
  }

  const narrowWeekday = getDateTimeFormat(language, { weekday: "narrow" });
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    narrowWeekday.format(weekdayReference((weekStartsOn + i) % 7)),
  );
  const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
  const monthName = capitalize(
    getDateTimeFormat(language, { month: "long" }).format(
      new Date(monthData.year, monthData.month, 1),
    ),
  );

  return (
    <Card p="$3">
      <YStack gap="$2">
        {/* Header with month navigation */}
        <XStack items="center" justify="space-between" px="$1">
          <Pressable
            onPress={goToPrevMonth}
            accessibilityRole="button"
            accessibilityLabel={t("journal.prev_month", "Previous month")}
            hitSlop={12}
          >
            <ChevronLeft size={24} color="$text" />
          </Pressable>
          <Text fontWeight="700" fontSize={16} color="$text">
            {monthName} {monthData.year}
          </Text>
          <Pressable
            onPress={goToNextMonth}
            accessibilityRole="button"
            accessibilityLabel={t("journal.next_month", "Next month")}
            hitSlop={12}
          >
            <ChevronRight size={24} color="$text" />
          </Pressable>
        </XStack>

        {/* Day labels */}
        <XStack justify="space-around">
          {/* Index keys: French labels repeat ("M" for Mardi and Mercredi), so the label isn't unique. */}
          {dayLabels.map((day, i) => (
            <Text
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 7-label list, never reordered
              key={`${i}-${day}`}
              width={32}
              style={{ textAlign: "center" }}
              fontSize={12}
              fontWeight="700"
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
                        ? "$pastelGreen"
                        : undefined
                  }
                  borderWidth={day.isToday ? 2 : 0}
                  borderColor="$borderStrong"
                >
                  <Text
                    fontSize={13}
                    fontWeight={day.hasWorkout || day.isToday ? "700" : "400"}
                    color={day.isToday ? "$white" : "$text"}
                    opacity={day.isCurrentMonth ? 1 : 0.3}
                  >
                    {day.date}
                  </Text>
                </YStack>
              ))}
            </XStack>
          ))}
        </YStack>

        {/* Legend */}
        <XStack justify="center" gap="$4" pt="$1">
          <LegendDot color="$pastelGreen" label={t("journal.legend_workout", "Workout")} />
          <LegendDot color="$primary" label={t("journal.legend_today", "Today")} />
        </XStack>

        {/* Stats row */}
        <YStack height={1} bg="$text" opacity={0.1} mt="$1" />
        <XStack justify="space-around" pt="$1">
          <YStack items="center">
            <Text fontWeight="700" fontSize={18} color="$text">
              {monthData.workoutCount}
            </Text>
            <Text fontSize={11} color="$text" opacity={0.6}>
              {t("journal.workout_days", { count: monthData.workoutCount })}
            </Text>
          </YStack>
          <YStack items="center">
            <Text fontWeight="700" fontSize={18} color="$resourceFire">
              {flameDays}
            </Text>
            <Text fontSize={11} color="$text" opacity={0.6}>
              {t("journal.streak_days", { count: flameDays, defaultValue: "Flame days" })}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </Card>
  );
}
