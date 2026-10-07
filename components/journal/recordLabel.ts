import type { TFunction } from "i18next";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDuration } from "@/db";
import type { FallenRecord } from "@/db/journal";
import { formatTargetValue, perSideLabel } from "@/db/targets";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

/** What a fallen record is called: the movement's name, or the record's own word. */
export function recordName(t: TFunction, language: AppLanguage, record: FallenRecord): string {
  if (record.name) return record.name[language] || record.name.en;
  return t(`journal.record_${record.kind}`, { defaultValue: "" });
}

export function recordValue(
  record: FallenRecord,
  distanceUnit: "metric" | "imperial",
  language: AppLanguage,
): string {
  if (record.kind === "longest_outing") return formatDistance(record.value, distanceUnit, language);
  if (record.kind === "longest_session") return formatDuration(record.value, language);
  return perSideLabel(formatTargetValue(record, language), record.perSide, language);
}
