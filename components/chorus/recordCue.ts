import type { NewRecordResult } from "@/db/personalRecords";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

/**
 * Which villager line a finished session has earned, and what it is allowed to say.
 *
 * Pure, and its own module, because the choice is the interesting part and it should be readable
 * without a victory screen around it. The research behind the split: generic encouragement stops
 * working within a couple of months, while a line tied to something concrete keeps landing — so
 * when the app *can* say "ten more than last time", it should, and when it cannot it must not
 * reach for a comparison to nothing.
 *
 */
export type RecordCue =
  | { moment: "personal_record_beat"; delta: number; unit: "reps" | "seconds"; exercise: string }
  | { moment: "personal_record" }
  | null;

/**
 * What a difference in this kind of record would be measured in, or `null` if quoting one would
 * be measuring the wrong thing. "Longest session" and "most XP" beat a previous value too, but a
 * villager saying "four minutes longer" is talking about something the hero never aimed at.
 */
function comparableUnit(type: NewRecordResult["recordType"]): "reps" | "seconds" | null {
  if (type === "exercise_max_reps") return "reps";
  if (type === "exercise_max_time") return "seconds";
  return null;
}

export function recordCue(records: NewRecordResult[], language: AppLanguage): RecordCue {
  if (records.length === 0) return null;

  for (const record of records) {
    const unit = comparableUnit(record.recordType);
    if (!unit) continue;

    // A first-ever record has no previous value, and a delta of zero is not a beat — both fall
    // through to the plain pool rather than announcing "0 more than last time".
    const previous = record.previousValue;
    const exercise = language === "fr" ? record.exerciseName?.fr : record.exerciseName?.en;
    if (previous == null || !exercise) continue;

    const delta = Math.round(record.newValue - previous);
    if (delta <= 0) continue;

    return { moment: "personal_record_beat", delta, unit, exercise };
  }

  return { moment: "personal_record" };
}
