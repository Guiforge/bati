import { beatInputOf, toBeat } from "@/db/progress";
import type { Quest } from "@/db/quests";
import { formatTargetValue, perSideLabel } from "@/db/targets";
import { NON_REP_STYLE } from "@/db/workUnits";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";

/**
 * "Ce soir : Pompes, au moins 13". The first movement of the quest that is counted in reps and
 * has been done before (a ghost exists from its second session), with the very number the set
 * shows as "à battre" and the wall as its target: `toBeat`, through `beatInputOf`.
 *
 * Reps only: a hold's "to beat" is a record attempt, while a hold is coached at three quarters of
 * its record, and "Plank, at least 0:46" over a session asking 0:30 would contradict the coach.
 * A quest of holds has no line. Null when there is nothing to say.
 */
export function tonightLine(
  quest: Pick<Quest, "exercises">,
  now: Date,
  language: AppLanguage,
): { name: string; value: number; label: string } | null {
  const slot = quest.exercises.find(
    (s) => s.ghost !== undefined && s.exercise.style !== NON_REP_STYLE && s.target.type === "reps",
  );
  if (!slot?.ghost) return null;
  const value = toBeat(beatInputOf(slot.ghost), now);
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
