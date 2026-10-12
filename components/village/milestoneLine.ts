import type { TFunction } from "i18next";
import { MUSCLE_LABELS } from "@/db/labels";
import {
  MILESTONE_QUIET_AFTER,
  type Milestone,
  nextMilestone,
  pickSessionMilestone,
  type RecentFeeds,
  type SessionFed,
} from "@/db/milestone";
import type { BuildingCode } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import { inSentence } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/** What the sessions are of, named the way the Village already names it: the muscle, the style. */
function subjectName(m: Milestone, t: TFunction, language: AppLanguage): string {
  const { subject } = m;
  if (subject === null) return "";
  if ("muscle" in subject) {
    const label = inSentence(MUSCLE_LABELS[subject.muscle][language], language);
    // English labels are plural ("Arms") and "arms sessions" is wrong: strip the s, except "abs",
    // which is the singular attributive too ("abs session"), hence three letters before it.
    // ponytail: one regex for every English label. It is right for the six muscles; a label that
    // ends in a single "s" without being a plural ("Calves" would become "Calve") breaks it, and
    // the day a muscle or style like that is added, replace the regex with a singular table.
    return language === "en" ? label.replace(/(?<=\w{3})s$/, "") : label;
  }
  return t(`village.style_${subject.style}`);
}

// French writes "d'abdos", "d'épaules": a vowel opens the other sentence. Silent in the languages
// that have no such key, since i18next falls back to the plain one.
const OPENS_ON_VOWEL = /^[aeiouàâéèêëîïôöûùœ]/i;

/**
 * When the building next rises, as a whole sentence: "Rank 2 in about 3 chest sessions." Never a
 * number of reps to do: the estimate is in sessions or outings, which is what a hero can plan.
 * `named` is the long form the victory screen uses: "The Forge, rank 4 in about 2 chest sessions."
 */
export function milestoneLine(
  m: Milestone,
  building: BuildingCode,
  t: TFunction,
  language: AppLanguage,
  named = false,
): string {
  const what = subjectName(m, t, language);
  const prefix = named ? "village.milestone_named_" : "village.milestone_";
  return t(`${prefix}${m.unit}`, {
    level: m.rank,
    count: m.count,
    what,
    building: named ? t(`village.building_the_${building}`) : "",
    context: OPENS_ON_VOWEL.test(what) ? "vowel" : undefined,
  });
}

/**
 * The line for a building, or null where there is nothing honest to say: the top rank, a building
 * nothing has fed, or feeds not read yet (nothing is asserted before they are).
 */
export function buildingMilestoneLine(
  b: VillageBuilding,
  feeds: RecentFeeds | null,
  t: TFunction,
  language: AppLanguage,
  named = false,
): string | null {
  const m = feeds === null ? null : nextMilestone(b, feeds);
  return m === null ? null : milestoneLine(m, b.code, t, language, named);
}

/** `buildingMilestoneLine`, but silent past `MILESTONE_QUIET_AFTER`: a chore is not a goal. */
export function quietMilestoneLine(
  b: VillageBuilding,
  feeds: RecentFeeds | null,
  t: TFunction,
  language: AppLanguage,
  named = false,
): string | null {
  const m = feeds === null ? null : nextMilestone(b, feeds);
  if (m === null || m.count > MILESTONE_QUIET_AFTER) return null;
  return milestoneLine(m, b.code, t, language, named);
}

/**
 * The victory screen's line: the building this session fed that rises soonest; when it fed none
 * with an estimate, `fallback` (the Village's own "Next to rise", `pickNextToRise`, which is the soonest of all). Null where
 * neither has anything to say.
 */
export function victoryMilestoneLine(
  buildings: VillageBuilding[],
  feeds: RecentFeeds,
  fed: SessionFed,
  fallback: VillageBuilding | null,
  t: TFunction,
  language: AppLanguage,
): string | null {
  const picked = pickSessionMilestone(buildings, feeds, fed);
  if (picked) return milestoneLine(picked.milestone, picked.building.code, t, language, true);
  return fallback ? quietMilestoneLine(fallback, feeds, t, language, true) : null;
}
