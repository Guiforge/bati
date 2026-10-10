import type { TFunction } from "i18next";

import { repsScale, type Scale } from "@/components/village/barScale";
import { MUSCLE_LABELS } from "@/db/muscles";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import {
  BUILDING_LABELS,
  buildingCeiling,
  getBuildingProgress,
  isDayOne,
  repsRungStart,
  type VillageBuilding,
} from "@/db/village";
import { inSentence } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/**
 * What a building row says, in words, and which family it sits in.
 *
 * The rows, the "Next to rise" card, the return card and the detail sheet all describe the same
 * building, and each used to phrase it on its own. One module per sentence means a new driver is
 * one edit, and the four places cannot disagree about what a rung costs.
 */

/** What a rep building counts, as a label that can open a line: "Chest", "Yoga". */
function repSubject(b: VillageBuilding, t: TFunction, lang: AppLanguage): string {
  if (b.relatedMuscle) return MUSCLE_LABELS[b.relatedMuscle][lang];
  const style = buildingDefinitions[b.code].relatedStyle ?? "strength";
  const label = t(`village.style_${style}`);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function prereqName(b: VillageBuilding, lang: AppLanguage): string {
  const code = buildingDefinitions[b.code].prerequisiteBuilding;
  return code ? BUILDING_LABELS[code][lang] : "";
}

/**
 * What a row says under a building: what raises it, never a number of reps or sessions to do (the
 * sentence for when it next rises is `milestoneLine`). The ones that wait on a level, another
 * building or a first deed say what builds them, and "At its ceiling" is once there is no rung.
 */
export function nextLine(b: VillageBuilding, t: TFunction, language: AppLanguage): string {
  if (b.nextTarget === null) return t("village.at_ceiling");
  switch (b.driver) {
    case "tier":
      return t("village.next_tier", { target: b.nextTarget });
    case "prereq":
      return t(b.level === 0 ? "village.build_prereq" : "village.next_prereq", {
        building: prereqName(b, language),
        target: b.nextTarget,
      });
    case "leagues":
    case "bosses":
    case "rematches":
    case "routes":
      // Unbuilt says what builds it: "1 more boss to level 1" was the count pretending to be a rung.
      if (b.level === 0) return t(`village.build_${b.driver}`);
  }
  return feedsLine(b, t, language);
}

/** "Next to rise" cannot head a building nothing has built yet. */
export function nextTitle(b: VillageBuilding | null, t: TFunction): string {
  return b?.level === 0 ? t("village.build_title") : t("village.next_title");
}

/** The link under a building, named after what actually raises it. */
export function ctaLabel(b: VillageBuilding | null, t: TFunction): string {
  switch (b?.driver) {
    case undefined:
      return t("village.cta_first");
    case "leagues":
      return t("village.cta_outing");
    case "bosses":
      return t("village.cta_boss");
    case "rematches":
      return t("village.cta_rematch");
    case "routes":
      return t("village.cta_route");
    case "muscle":
      return t("village.cta_feeds");
    default:
      return t("village.cta_quest");
  }
}

/** What raises the building, with no number in it: the family label says it for a group. */
export function feedsLine(b: VillageBuilding, t: TFunction, language: AppLanguage): string {
  const lang = language;
  switch (b.driver) {
    case "muscle":
      return t("village.feeds_muscle", { what: inSentence(repSubject(b, t, lang), lang) });
    case "style":
      return t("village.feeds_style", { what: inSentence(repSubject(b, t, lang), lang) });
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
 * A building's bar: what is done and the two ends, each with its unit. Null for the buildings whose
 * driver is a level rather than a tally (starters, upgrades), and for one nothing has started.
 * Reps start from the rung the building stands on; the deeds count from zero.
 */
export function buildingScale(
  b: VillageBuilding,
  t: TFunction,
  language: AppLanguage,
): Scale | null {
  const progress = getBuildingProgress(b);
  if (b.nextTarget === null || progress === null) return null;
  switch (b.driver) {
    case "tier":
    case "prereq":
      return null;
    case "muscle":
    case "style":
      return repsScale(t, language, {
        value: b.metricValue,
        from: repsRungStart(b.level),
        to: b.nextTarget,
      });
    default: {
      const unit = (n: number) => t(`village.unit_${b.driver}`, { count: n });
      return {
        progress,
        caption: t(`village.detail_${b.driver}_driver`, { count: b.metricValue }),
        ends: { left: { value: unit(0) }, right: { value: unit(b.nextTarget) } },
      };
    }
  }
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

/**
 * Where the link goes: the muscle's own quest filter, the outings, the adventures for a deed a
 * campaign raises, or the whole quest list.
 */
export function questLink(b: VillageBuilding | null): {
  pathname: "/(tabs)/quests" | "/(tabs)/adventures";
  params: Record<string, string>;
} {
  if (b?.relatedMuscle) return { pathname: "/(tabs)/quests", params: { muscle: b.relatedMuscle } };
  if (b?.driver === "leagues") return { pathname: "/(tabs)/quests", params: { outside: "1" } };
  if (b?.driver === "bosses" || b?.driver === "rematches" || b?.driver === "routes") {
    return { pathname: "/(tabs)/adventures", params: {} };
  }
  return { pathname: "/(tabs)/quests", params: {} };
}

/** The building's name in the app's language. */
export function nameOf(b: { code: BuildingCode }, language: AppLanguage): string {
  return BUILDING_LABELS[b.code][language];
}
