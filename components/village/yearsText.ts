import type { TFunction } from "i18next";
import { formatTargetValue } from "@/db/targets";
import type { MovementNamesById } from "@/db/villageYears";
import type { Fact } from "@/db/villageYearsRules";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/** What a stone or a banner says: the record broken ("Push-ups, from 10 to 14"), else the session count. `sessions` is the count the place holds (season or level), said when the movement is gone. */
export function factText(
  fact: Fact,
  sessions: number,
  names: MovementNamesById,
  t: TFunction,
  language: AppLanguage,
) {
  if (fact.kind === "sessions") return t("village.fact_sessions", { count: fact.count });
  const name = names.get(fact.exerciseId);
  // A movement deleted since leaves figures with no subject: say the session count instead.
  if (!name) return t("village.fact_sessions", { count: sessions });
  return t("village.fact_record", {
    movement: localizedName(name, language),
    from: formatTargetValue({ type: fact.unit, value: fact.prior }, language),
    to: formatTargetValue({ type: fact.unit, value: fact.value }, language),
  });
}
