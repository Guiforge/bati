import type { TFunction } from "i18next";
import type { CrestShape } from "@/components/village/Crest";
import { PRACTICE_KEY, sentence } from "@/components/village/crestText";
import { ANIMAL_OF } from "@/db/crestRules";
import { MAX_TIER, TIER_LEVEL_FLOORS, TIER_NAMES, type VillageTier } from "@/db/village";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import type { Feast } from "./feasts";

/** "Brumeval becomes a Village.", or "Your village becomes a Village." before it has a name. */
export const tierSentence = (
  t: TFunction,
  tier: VillageTier,
  villageName: string,
  language: AppLanguage,
) =>
  t(`session.tonight_tier_${tier}`, {
    subject: villageName || t("session.tonight_tier_subject_unnamed"),
    tier: TIER_NAMES[tier][language],
  });

type Reveal = Extract<Feast, { kind: "reveal" }>;

/** "A bear watches over Brumeval." The place is the village's name, or "your village". */
export function revealTitle(t: TFunction, f: Reveal, villageName: string): string {
  return t("village.crest_line_one", {
    animal: sentence(t(`village.crest_${f.animal}`)),
    place: villageName || t("village.crest_place"),
  });
}

/**
 * What the sessions say, from the first 8 (the reveal's evidence). A hero who already had more
 * than 8 sessions at the update sees it once, later: the animal has watched since the 8th, so the
 * text says "your first 8" instead of claiming tonight is the 8th.
 */
export function revealBody(t: TFunction, f: Reveal): string {
  const suffix = f.late ? "_late" : "";
  if (f.animal === "boar") {
    const [first, second] = f.quarters ?? [];
    if (!first || !second) return "";
    return t(`session.feast_reveal_boar${suffix}`, {
      list: f.firstEight.map(([p, n]) => `${t(PRACTICE_KEY[p])} ${n}`).join(", "),
      first: t(PRACTICE_KEY[first]),
      second: t(PRACTICE_KEY[second]),
    });
  }
  const own = f.firstEight.find(([p]) => ANIMAL_OF[p] === f.animal);
  if (!own) return "";
  return t(`session.feast_reveal_body${suffix}`, {
    n: own[1],
    part: t(`session.feast_part_${own[0]}`),
  });
}

/** The level a tier is followed by, or null at the last one. */
export const nextTierLevel = (tier: VillageTier): number | null =>
  tier === MAX_TIER ? null : TIER_LEVEL_FLOORS[(tier + 1) as VillageTier];

/**
 * The crest the reveal draws: the hero's own as the Village shows it (flame, rings, their choice),
 * except the animal and the boar's quarters, which are what the sessions said when it was revealed.
 * Unreadable, it is the bare animal rather than a missing shield.
 */
export function revealShield(f: Reveal, crest: CrestShape | null): CrestShape {
  return {
    manual: false,
    second: null,
    longestFlame: 0,
    rings: 0,
    ...crest,
    animal: f.animal,
    quarters: f.quarters,
  };
}
