import { useIsFocused } from "@react-navigation/native";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spinner, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import {
  getScheduledSessionsForWeek,
  rescheduleSession,
  type ScheduledSessionWithQuest,
  skipScheduledSession,
} from "@/db/scheduling";

export function WeeklyCalendar() {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<ScheduledSessionWithQuest[]>([]);
  const [loading, setLoading] = useState(true);

  // Start of current week (Monday)
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScheduledSessionsForWeek(weekStart);
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (isFocused) {
      loadSessions();
    }
  }, [isFocused, loadSessions]);

  const handleSkip = async (sessionId: number) => {
    try {
      await skipScheduledSession(sessionId);
      await loadSessions();
    } catch (e) {
      console.error("Failed to skip session:", e);
    }
  };

  const handleReschedule = async (sessionId: number, currentDate: Date) => {
    try {
      const nextDay = addDays(new Date(currentDate), 1);
      await rescheduleSession(sessionId, nextDay);
      await loadSessions();
    } catch (e) {
      console.error("Failed to reschedule session:", e);
    }
  };

  const sessionsForSelectedDate = sessions.filter((s) =>
    isSameDay(new Date(s.scheduledDate), selectedDate),
  );

  return (
    <YStack gap="$4">
      {/* Week Strip */}
      <XStack justify="space-between">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const hasSession = sessions.some((s) => isSameDay(new Date(s.scheduledDate), day));

          return (
            <Card
              key={day.toISOString()}
              onPress={() => setSelectedDate(day)}
              bg={isSelected ? "$primary" : "$bgLight"}
              borderColor={isSelected ? "$color" : "transparent"}
              p="$2"
              width={45}
              items="center"
              pressStyle={{ opacity: 0.8 }}
            >
              <Text fontSize="$2" fontWeight="bold" color={isSelected ? "white" : "$color"}>
                {format(day, "EEE")}
              </Text>
              <Text fontSize="$4" fontWeight="800" color={isSelected ? "white" : "$color"}>
                {format(day, "d")}
              </Text>
              {hasSession && (
                <YStack
                  width={6}
                  height={6}
                  rounded={3}
                  bg={isSelected ? "white" : "$primary"}
                  mt="$1"
                />
              )}
            </Card>
          );
        })}
      </XStack>

      {/* Selected Day Content */}
      <YStack gap="$3">
        <Text fontSize="$5" fontWeight="bold">
          {format(selectedDate, "EEEE, MMMM d")}
        </Text>

        {loading ? (
          <Spinner size="large" color="$primary" />
        ) : sessionsForSelectedDate.length > 0 ? (
          sessionsForSelectedDate.map((session) => (
            <Card key={session.id} p="$4">
              <YStack gap="$2">
                <Text fontWeight="bold" fontSize="$4">
                  {session.quest.enTitle}
                </Text>
                <XStack justify="space-between" items="center">
                  <Text fontSize="$2" opacity={0.7}>
                    {session.status.toUpperCase()}
                  </Text>
                  {session.preferredHour !== null && (
                    <Text fontSize="$2" opacity={0.7}>
                      {session.preferredHour}:00
                    </Text>
                  )}
                </XStack>
                {session.status === "pending" && (
                  <XStack justify="flex-end" mt="$2" gap="$2">
                    <AppButton
                      variant="secondary"
                      size="$2"
                      onPress={() => handleReschedule(session.id, session.scheduledDate)}
                    >
                      {t("scheduling.reschedule_tomorrow", "Move +1 Day")}
                    </AppButton>
                    <AppButton variant="secondary" size="$2" onPress={() => handleSkip(session.id)}>
                      {t("scheduling.skip", "Skip")}
                    </AppButton>
                  </XStack>
                )}
              </YStack>
            </Card>
          ))
        ) : (
          <Card p="$4" bg="$bgLight" opacity={0.7}>
            <Text style={{ textAlign: "center" }}>
              {t("scheduling.no_sessions", "No workouts scheduled")}
            </Text>
          </Card>
        )}
      </YStack>
    </YStack>
  );
}
