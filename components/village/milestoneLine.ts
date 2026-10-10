import type { TFunction } from "i18next";
import { type Milestone, nextMilestone, type RecentFeeds } from "@/db/milestone";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { BuildingCode } from "@/db/schema";
import type { VillageBuilding } from "@/db/village";
import { inSentence } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/** What the sessions are of, named the way the Village already names it: the muscle, the style. */
function subjectName(m: Milestone, t: TFunction, language: AppLanguage): string {
  const { subject } = m;
  if (subject === null) return "";
  if ("muscle" in subject) return inSentence(MUSCLE_LABELS[subject.muscle][language], language);
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
