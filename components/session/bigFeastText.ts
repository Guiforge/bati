import type { TFunction } from "i18next";
import type { CrestShape } from "@/components/village/Crest";
import { PRACTICE_KEY, sentence } from "@/components/village/crestText";
import type { Crest } from "@/db/crest";
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
    });
  }
  const own = f.firstEight.find(([p]) => ANIMAL_OF[p] === f.animal);
  if (!own) return "";
  return t(`session.feast_reveal_body${suffix}`, {
    n: own[1],
    part: t(`session.feast_part_${own[0]}`),
  });
}

/** The boar's colors, apart from the count: the fact is one line, what the shield shows another. */
export function revealColors(t: TFunction, f: Reveal): string {
  const [first, second] = f.animal === "boar" ? (f.quarters ?? []) : [];
  if (!first || !second) return "";
  return t("session.feast_reveal_boar_colors", {
    first: t(PRACTICE_KEY[first]),
    second: t(PRACTICE_KEY[second]),
  });
}

/** The level a tier is followed by, or null at the last one. */
export const nextTierLevel = (tier: VillageTier): number | null =>
  tier === MAX_TIER ? null : TIER_LEVEL_FLOORS[(tier + 1) as VillageTier];

/**
 * The crest the reveal draws: the sessions' own shield, whatever the hero has picked since (a hero
 * with 8+ sessions at the update may choose before seeing this): the animal that was revealed, no
 * diamond, the sessions' second animal as the border (`evidence`, so never a boar's), and the
 * hero's flame and rings. Unreadable, it is the bare animal rather than a missing shield.
 */
export function revealShield(f: Reveal, crest: Crest | null): CrestShape {
  const second = (f.animal !== "boar" && crest?.evidence.secondFromSessions) || null;
  return {
    manual: false,
    longestFlame: crest?.longestFlame ?? 0,
    rings: crest?.rings ?? 0,
    animal: f.animal,
    quarters: f.quarters,
    second: second && second !== "boar" ? { animal: second } : null,
  };
}
