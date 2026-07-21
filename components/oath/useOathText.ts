import { useTranslation } from "react-i18next";
import type { OathProgress } from "@/db/oaths";

/**
 * One label for the three surfaces that show an oath (home card, victory screen,
 * swear screen), so the wording can never drift between them.
 */
export function useOathText(progress: OathProgress): string {
  const { t, i18n } = useTranslation();

  const exercise = progress.exerciseName
    ? i18n.language === "fr"
      ? progress.exerciseName.fr
      : progress.exerciseName.en
    : "";

  return t(`oath.metric_${progress.oath.metric}`, {
    count: progress.target,
    exercise,
  });
}
