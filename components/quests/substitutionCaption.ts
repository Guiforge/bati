import type { TFunction } from "i18next";
import type { QuestExercise } from "@/db/quests";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/**
 * The line under a substituted slot, on the quest screen and mid-session alike. Two reasons, two
 * sentences: a rung not reached yet promises the written movement back, a set-aside one must not.
 */
export function substitutionCaption(
  t: TFunction,
  substitutedFor: NonNullable<QuestExercise["substitutedFor"]>,
  language: AppLanguage,
): string {
  const name = localizedName(substitutedFor, language);
  return substitutedFor.setAside
    ? t("setAside.instead_of", { name, defaultValue: `Instead of ${name}` })
    : t("quests.served_easier_rung", { name, defaultValue: `Working up to ${name}` });
}
