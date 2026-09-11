import type { TFunction } from "i18next";
import type { VillageBuilding } from "@/db/village";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";

/**
 * The one line about the High Road, in the two shapes the road can be in.
 *
 * A road still climbing reads as a fraction of its next floor. A maxed one has no floor left,
 * and `nextTarget` is null there — printing "42/null leagues" is the bug this exists to avoid,
 * so the maxed road borrows the village sheet's own sentence for the same driver rather than
 * inventing a fifteenth way to say "leagues covered".
 */
export function roadLine(road: VillageBuilding, language: AppLanguage, t: TFunction): string {
  const building = localizedName(road, language);
  if (road.nextTarget === null) {
    return `${building} · ${t("village.detail_leagues_driver", { count: road.metricValue })}`;
  }
  return t("session.expedition_road", {
    building,
    value: road.metricValue,
    target: road.nextTarget,
  });
}
