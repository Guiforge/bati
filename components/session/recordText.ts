import type { TFunction } from "i18next";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDuration } from "@/db/estimate";
import type { NewRecordResult } from "@/db/personalRecords";
import type { DistanceUnit } from "@/db/preferences";
import { formatCount, formatTarget, perSideLabel } from "@/db/targets";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

/** What a record is called: the movement for an exercise record, else the kind of mark. */
export function recordTitle(t: TFunction, record: NewRecordResult, language: AppLanguage): string {
  switch (record.recordType) {
    case "longest_session":
      return t("session.pr_longest_session");
    case "most_xp":
      return t("session.pr_most_xp");
    case "longest_outing":
      return t("journal.pr_longest_outing");
    case "exercise_max_reps":
    case "exercise_max_time": {
      const name = record.exerciseName?.[language];
      return t("session.pr_exercise", { exercise: name });
    }
    default:
      return t("session.pr_new_record");
  }
}

/**
 * The figure beside each record, in the unit the rest of the app already shows it in — never a
 * bare number, which for `longest_outing` said the same 603 whether the hero reads metres or
 * feet, and for `longest_session` printed raw seconds (283 for 4 min 43 s).
 */ export function formatRecordValue(
  record: NewRecordResult,
  unit: DistanceUnit,
  language: AppLanguage,
): string {
  switch (record.recordType) {
    // A hold reads the way every hold does (`formatTarget`), not in `formatDuration`'s
    // "4 min 43s" shape, which is a session's.
    case "exercise_max_time":
      return perSideLabel(
        formatTarget({ type: "time", value: record.newValue }, language),
        record.perSide,
        language,
      );
    case "longest_session":
      return formatDuration(record.newValue, language);
    case "longest_outing":
      return formatDistance(record.newValue, unit, language);
    case "exercise_max_reps":
      return perSideLabel(formatCount(language, record.newValue), record.perSide, language);
    default:
      return formatCount(language, record.newValue);
  }
}
