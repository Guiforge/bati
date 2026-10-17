import type { TFunction } from "i18next";
import { MUSCLE_LABELS } from "@/db/labels";
import type { TrainingFocus } from "@/db/quests";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

/** "Force · Bras · Dos": what an adventure trains. One reading for the gallery and the editor. */
export function focusLabel(focus: TrainingFocus, language: AppLanguage, t: TFunction): string {
  return [
    focus.archetype ? t(`quests.archetype_${focus.archetype}`) : null,
    ...focus.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
  ]
    .filter(Boolean)
    .join(" · ");
}
