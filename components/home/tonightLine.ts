import type { Quest } from "@/db/quests";
import { formatTargetValue, perSideLabel } from "@/db/targets";
import { NON_REP_STYLE } from "@/db/workUnits";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";

/**
 * "Ce soir : Pompes, au moins 14". The first movement of the quest that is counted in reps and
 * has been done before (a ghost exists from its second session), with the session's own number:
 * the target the set will be asked, the big one on the screen. "À battre" stays on the wall and
 * the ghost line, where a record is the subject (PARK-1).
 *
 * Reps only for now; a hold's objective would read fine, but nobody asked. Null when there is
 * nothing to say.
 */
export function tonightLine(
  quest: Pick<Quest, "exercises">,
  language: AppLanguage,
): { name: string; value: number; label: string } | null {
  const slot = quest.exercises.find(
    (s) => s.ghost !== undefined && s.exercise.style !== NON_REP_STYLE && s.target.type === "reps",
  );
  if (!slot?.ghost) return null;
  const { value } = slot.target;
  return {
    name: localizedName(slot.exercise, language),
    value,
    label: perSideLabel(
      formatTargetValue({ type: "reps", value }, language),
      slot.exercise.perSide,
      language,
    ),
  };
}
