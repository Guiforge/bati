import type { TFunction } from "i18next";
import { formatTargetValue } from "@/db/targets";
import type { RecordNames } from "@/db/villageYears";
import type { Fact } from "@/db/villageYearsRules";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/** What a stone or a banner says: the record broken ("Push-ups, from 10 to 14"), else the session count. */
export function factText(fact: Fact, names: RecordNames, t: TFunction, language: AppLanguage) {
  if (fact.kind === "sessions") return t("village.fact_sessions", { count: fact.count });
  const name = names.get(fact.exerciseId);
  // A movement deleted since is no reason to hide the record: the figures still stand.
  return t("village.fact_record", {
    movement: name ? localizedName(name, language) : "",
    from: formatTargetValue({ type: fact.unit, value: fact.prior }, language),
    to: formatTargetValue({ type: fact.unit, value: fact.value }, language),
  });
}
