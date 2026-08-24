import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getStreakInfo, type StreakInfo } from "@/db/streaks";
import { reportError } from "@/src/reportError";

/**
 * The one way UI reads the flame. Refetches on focus so a transient failure (or a session
 * finished since the last visit) heals on the next look, instead of freezing zeros the way
 * JournalStats' one-shot effect used to: it swallowed the rejection and never refetched, so one
 * bad read froze the card at 0 for the tab's lifetime while every other flame reader recovered.
 */
export function useStreakInfo(): StreakInfo | null {
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getStreakInfo()
        .then((info) => {
          if (!cancelled) setStreak(info);
        })
        .catch((e) => reportError("streak.read", e));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return streak;
}
