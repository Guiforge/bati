import { useEffect, useMemo, useState } from "react";
import { Text, XStack } from "tamagui";
import { formatTime } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";

/**
 * SessionTimer
 *
 * Displays the global elapsed time since session start.
 * Updates every second via interval.
 */
export function SessionTimer() {
  const startTime = useSessionStore((s) => s.startTime);
  const totalPausedTime = useSessionStore((s) => s.totalPausedTime);
  const status = useSessionStore((s) => s.status);
  const lastPauseTimestamp = useSessionStore((s) => s.lastPauseTimestamp);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsedSeconds(0);
      return;
    }

    const calculate = (now: number) => {
      const elapsed = Math.floor((now - startTime - totalPausedTime) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    };

    // If paused, freeze at pause time
    if (status === "paused" && lastPauseTimestamp) {
      calculate(lastPauseTimestamp);
      return;
    }

    // Tick every second
    calculate(Date.now());
    const interval = setInterval(() => calculate(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startTime, totalPausedTime, status, lastPauseTimestamp]);

  return (
    <XStack items="center" gap="$2">
      <Text fontSize={14} fontWeight="800" color="$textSecondary">
        ⏱
      </Text>
      <Text fontSize={16} fontWeight="900" color="$text" fontFamily="$body">
        {formatTime(elapsedSeconds)}
      </Text>
    </XStack>
  );
}

/**
 * useSessionProgress - Hook for progress data
 */
export function useSessionProgress() {
  const quest = useSessionStore((s) => s.quest);
  const results = useSessionStore((s) => s.results);

  return useMemo(() => {
    if (!quest) return { percent: 0, completed: 0, total: 0 };

    const totalExercises = quest.exercises.length;
    const totalRounds = quest.rounds;
    const totalSets = totalExercises * totalRounds;
    const completedSets = results.length;
    const percent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

    return {
      percent: Math.min(100, percent),
      completed: completedSets,
      total: totalSets,
    };
  }, [quest, results.length]);
}
