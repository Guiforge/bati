import { useFocusEffect } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useState } from "react";
import { adventureWeeks } from "@/db/estimate";
import { getReminderDays } from "@/db/reminders";
import { reportError } from "@/src/reportError";

/**
 * The hero's own rhythm: how many days a week they chose for their reminders, null for none, and
 * undefined until read. Days are written by turning the reminder on, here or on a synced device
 * (`MERGED_PREFERENCES`), so a count means the hero said how often they train, not that the app
 * guessed (docs/designs/rappels.md). They outlive the switch being turned off, on purpose.
 */
export function useReminderPace(): number | null | undefined {
  const [pace, setPace] = useState<number | null | undefined>(undefined);
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

/**
 * "≈ 4 weeks", or "≈ 6 weeks on your days" once the hero's days say what their pace is. Nothing
 * while the days are still being read: a loading screen must not show a number it is about to
 * change.
 */
export function adventureWeeksLabel(
  steps: number,
  pace: number | null | undefined,
  t: TFunction,
): string | null {
  if (pace === undefined) return null;
  const count = adventureWeeks(steps, pace ?? undefined);
  return pace === null
    ? t("adventures.weeks", { count, defaultValue: `≈ ${count} weeks` })
    : t("adventures.weeks_pace", { count });
}
