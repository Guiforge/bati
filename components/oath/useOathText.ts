import type { i18n as I18n } from "i18next";
import { useTranslation } from "react-i18next";
import { DEFAULT_WEEKLY_TARGET, type OathProgress } from "@/db/oaths";

/**
 * One label for every surface that shows an oath (home card, victory screen, swear screen,
 * the reminder notification), so the wording can never drift between them.
 *
 * Takes the i18n instance rather than `t` so it works outside React too — the notification
 * scheduler has no hooks to call.
 */
export function oathText(progress: OathProgress, i18n: I18n): string {
  const exercise = progress.exerciseName
    ? i18n.language === "fr"
      ? progress.exerciseName.fr
      : progress.exerciseName.en
    : "";

  return i18n.t(`oath.metric_${progress.oath.metric}`, {
    count: progress.target,
    exercise,
    // `weekly_sessions` is the one metric with a second number in its label; without this the
    // home card rendered "sessions a week, for 8 weeks" with a hole in it.
    weekly: progress.oath.weeklyTarget ?? DEFAULT_WEEKLY_TARGET,
  });
}

export function useOathText(progress: OathProgress): string {
  const { i18n } = useTranslation();
  return oathText(progress, i18n);
}
