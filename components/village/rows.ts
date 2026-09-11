import type { TFunction } from "i18next";

import { MUSCLE_LABELS } from "@/db/muscles";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import {
  BUILDING_LABELS,
  buildingCeiling,
  getBuildingProgress,
  isDayOne,
  type VillageBuilding,
} from "@/db/village";
import type { AppLanguage } from "@/stores/settings";

/**
 * What a building row says, in words, and which family it sits in.
 *
 * The rows, the "Next to rise" card, the return card and the detail sheet all describe the same
 * building, and each used to phrase it on its own. One module per sentence means a new driver is
 * one edit, and the four places cannot disagree about what a rung costs.
 */

type Lang = "en" | "fr";

const langOf = (language: AppLanguage): Lang => (language === "fr" ? "fr" : "en");

/** What a rep building counts, as a label that can open a line: "Chest", "Yoga". */
function repSubject(b: VillageBuilding, t: TFunction, lang: Lang): string {
  if (b.relatedMuscle) return MUSCLE_LABELS[b.relatedMuscle][lang];
  const style = buildingDefinitions[b.code].relatedStyle ?? "strength";
  const label = t(`village.style_${style}`);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function prereqName(b: VillageBuilding, lang: Lang): string {
  const code = buildingDefinitions[b.code].prerequisiteBuilding;
  return code ? BUILDING_LABELS[code][lang] : "";
}

/** The cost of the next rung, in the unit the building counts. "At its ceiling" once there is none. */
export function nextLine(b: VillageBuilding, t: TFunction, language: AppLanguage): string {
  const lang = langOf(language);
  if (b.nextTarget === null) return t("village.at_ceiling");
  const count = Math.max(0, b.nextTarget - b.metricValue);
  const level = b.level + 1;
  switch (b.driver) {
    case "tier":
      return t("village.next_tier", { target: b.nextTarget });
    case "prereq":
      return t(b.level === 0 ? "village.build_prereq" : "village.next_prereq", {
        building: prereqName(b, lang),
        target: b.nextTarget,
      });
    case "muscle":
    case "style": {
      const what = repSubject(b, t, lang);
      return b.level === 0
        ? t("village.build_reps", { what })
        : t("village.next_reps", { what, count, level });
    }
    case "leagues":
    case "bosses":
    case "adventures":
    case "boss_victories":
      return t(`village.next_${b.driver}`, { count, level });
  }
}

/** What raises the building, with no number in it: the family label says it for a group. */
export function feedsLine(b: VillageBuilding, t: TFunction, language: AppLanguage): string {
  const lang = langOf(language);
  switch (b.driver) {
    case "muscle":
      return t("village.feeds_muscle", { what: repSubject(b, t, lang).toLowerCase() });
    case "style":
      return t("village.feeds_style", { what: repSubject(b, t, lang).toLowerCase() });
    case "prereq":
      return t("village.feeds_prereq", { building: prereqName(b, lang) });
    default:
      return t(`village.feeds_${b.driver}`);
  }
}

/** "level 2 of 3", on the building's real ceiling. */
export function levelText(b: VillageBuilding, t: TFunction): string {
  return b.level > 0
    ? t("village.level_of", { level: b.level, max: buildingCeiling(b) })
    : t("village.not_built");
}

/**
 * The two ends of a bar, so a bar never arrives without its unit: "60 reps" and "level 2 at 100".
 * Null for the buildings whose driver is a level rather than a tally (starters, upgrades): their
 * next line already names the rung, and "8" at one end of a bar says nothing.
 */
export function barEnds(b: VillageBuilding, t: TFunction): { left: string; right: string } | null {
  if (b.nextTarget === null || b.driver === "tier" || b.driver === "prereq") return null;
  // "0 reps, level 1 at 1" under a building nobody has started says nothing either.
  if (getBuildingProgress(b) === null) return null;
  const unit = b.driver === "muscle" || b.driver === "style" ? "reps" : b.driver;
  return {
    left: t(`village.unit_${unit}`, { count: b.metricValue }),
    right: t("village.bar_target", { level: b.level + 1, target: b.nextTarget }),
  };
}

export type FamilyKey = "muscle" | "style" | "upgrade" | "deed" | "starter" | "unbuilt" | "rest";

export type Family = { key: FamilyKey; items: VillageBuilding[] };

function familyOf(b: VillageBuilding): FamilyKey {
  if (b.tier === 1) return "starter";
  if (b.tier === 3) return "upgrade";
  if (b.tier === 4) return "deed";
  return b.relatedMuscle ? "muscle" : "style";
}

const VISIT_ORDER: readonly FamilyKey[] = ["muscle", "style", "upgrade", "deed", "starter"];

/**
 * The list under the painting, grouped by what feeds each building rather than split into built
 * and not built: an unbuilt Armory belongs next to the Forge it waits on, not in a locked drawer.
 *
 * Two moments bend the rule. On day one there is nothing to group, so the starters stand alone and
 * everything else waits in one list. A finished village puts the deeds first, the only rungs left,
 * and folds the rest into one family that has nothing more to say.
 */
export function groupFamilies(buildings: VillageBuilding[], complete: boolean): Family[] {
  const byLevel = (a: VillageBuilding, b: VillageBuilding) => b.level - a.level;
  const families: Family[] = isDayOne(buildings)
    ? [
        { key: "starter", items: buildings.filter((b) => b.tier === 1) },
        { key: "unbuilt", items: buildings.filter((b) => b.tier !== 1) },
      ]
    : complete
      ? [
          { key: "deed", items: buildings.filter((b) => b.tier === 4) },
          { key: "rest", items: buildings.filter((b) => b.tier !== 4) },
        ]
      : VISIT_ORDER.map((key) => ({
          key,
          items: buildings.filter((b) => familyOf(b) === key),
        }));
  return families
    .map((f) => ({ ...f, items: [...f.items].sort(byLevel) }))
    .filter((f) => f.items.length > 0);
}

/** Where the "find a quest" links go: the muscle's own filter, the outings, or the whole list. */
export function questLink(b: VillageBuilding | null): {
  pathname: "/(tabs)/quests";
  params: Record<string, string>;
} {
  if (b?.relatedMuscle) return { pathname: "/(tabs)/quests", params: { muscle: b.relatedMuscle } };
  if (b?.driver === "leagues") return { pathname: "/(tabs)/quests", params: { outside: "1" } };
  return { pathname: "/(tabs)/quests", params: {} };
}

/** The building's name in the app's language. */
export function nameOf(b: { code: BuildingCode }, language: AppLanguage): string {
  return BUILDING_LABELS[b.code][langOf(language)];
}
