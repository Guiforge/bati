import { useFocusEffect } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useState } from "react";
import { adventureWeeks } from "@/db/estimate";
import { getReminderDays } from "@/db/reminders";
import { reportError } from "@/src/reportError";

/**
 * The hero's own rhythm: how many days a week they chose for their reminders, or null. Days are
 * only ever written by turning the reminder on (docs/designs/rappels.md), so a count here means
 * the hero said how often they train, not that the app guessed.
 */
export function useReminderPace(): number | null {
  const [pace, setPace] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getReminderDays()
        .then((days) => {
          const count = Object.keys(days).length;
          if (!cancelled) setPace(count > 0 ? count : null);
        })
        .catch((error: unknown) => reportError("reminders.pace", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return pace;
}

/** "≈ 4 weeks", or "≈ 4 weeks at your pace" once the hero's days say what their pace is. */
export function adventureWeeksLabel(steps: number, pace: number | null, t: TFunction): string {
  const count = adventureWeeks(steps, pace ?? undefined);
  return pace === null
    ? t("adventures.weeks", { count, defaultValue: `≈ ${count} weeks` })
    : t("adventures.weeks_pace", { count });
}
