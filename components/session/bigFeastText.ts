import type { TFunction } from "i18next";
import type { CrestShape } from "@/components/village/Crest";
import { PRACTICE_KEY, sentence } from "@/components/village/crestText";
import type { Crest } from "@/db/crest";
import { ANIMAL_OF } from "@/db/crestRules";
import { formatTargetValue } from "@/db/targets";
import { MAX_TIER, TIER_LEVEL_FLOORS, TIER_NAMES, type VillageTier } from "@/db/village";
import { FEW_SESSIONS } from "@/db/villageNewsRules";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";
import type { Feast } from "./feasts";

/**
 * "Brumeval becomes a Village.", or "New tier: Flourishing City" before it has a name. An unnamed
 * village has no subject to put a verb on: "Your village becomes a Hamlet" read as a demotion at
 * tiers 1 and 2 and "it is now a Village" as a tautology at 3, so every tier takes the label form,
 * which also needs no article. The full screen already carries a "New tier" kicker above its
 * title, so it passes `underKicker` and gets the bare tier name instead of a repeat.
 */
export const tierSentence = (
  t: TFunction,
  tier: VillageTier,
  villageName: string,
  language: AppLanguage,
  underKicker = false,
) => {
  const name = TIER_NAMES[tier][language];
  if (villageName) return t(`session.tonight_tier_${tier}`, { subject: villageName, tier: name });
  return underKicker ? name : t("session.tonight_tier_unnamed", { tier: name });
};

type Reveal = Extract<Feast, { kind: "reveal" }>;

/** "A bear watches over Brumeval." The place is the village's name, or "your village". */
export function revealTitle(t: TFunction, f: Reveal, villageName: string): string {
  return t("village.crest_line_one", {
    animal: sentence(t(`village.crest_${f.animal}`)),
    place: villageName
      ? t("village.crest_place_named", { name: villageName })
      : t("village.crest_place"),
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

/** A stage rises exactly at its threshold, so the body is that many sessions of its own practice. */
export function stageBody(t: TFunction, f: Extract<Feast, { kind: "stageUp" | "legendary" }>) {
  return t(
    f.practice
      ? `session.tonight_stage_body_${ANIMAL_OF[f.practice]}`
      : "session.tonight_stage_body_any",
    { n: f.n },
  );
}

type Legendary = Extract<Feast, { kind: "legendary" }>;

/** "Your bear passes into legend." The animal is the hero's, so no village name stands in the title. */
export function legendaryTitle(t: TFunction, f: Legendary): string {
  return t(`session.feast_legendary_title_${f.animal}`);
}

/**
 * "Tonight: your 500th strength session." The fact is the hero's: the session that crossed
 * 500. A hero who was already past it at the update gets "500 strength sessions and counting", the
 * only thing that is true of them. ponytail: `n` is always `LEGENDARY_AT` (`STAGE_AT.legendary`),
 * the copy never says another number.
 */
export function legendaryBody(t: TFunction, f: Legendary): string {
  const kind = f.practice ? ANIMAL_OF[f.practice] : "any";
  return t(`session.feast_legendary_${f.late ? "late" : "body"}_${kind}`, { n: f.n });
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
  // A boar has no `secondFromSessions` (null by construction, R25b), so no guard here.
  const second = crest?.evidence.secondFromSessions ?? null;
  return {
    manual: false,
    longestFlame: crest?.longestFlame ?? 0,
    rings: crest?.rings ?? 0,
    animal: f.animal,
    quarters: f.quarters,
    second: second ? { animal: second } : null,
  };
}

/** One beat is 550 ms: the whole storyboard is about 1.6 s, played once and never looped. */
export const BEAT = 550;
/** The words fade in over this long: the "Why" link waits the same, so it is never touchable while faint. */
export const TEXT_FADE = 500;

/**
 * Title and body as one sentence run. Parts are joined with a full stop, except after one that
 * already ends on a final mark (. ! ? … :), which gets a space. Only the very last full stop goes. A card with nothing to say is an empty string.
 */
export const spoken = (card: { title: string; body?: string[] }) => {
  const parts = [card.title, ...(card.body ?? [])].filter(Boolean);
  const last = parts.length - 1;
  return parts
    .map((p, i) => (i === last ? p.replace(/\.$/, "") : p))
    .reduce((run, p) => (run ? `${run}${/[.!?…:]$/.test(run) ? " " : ". "}${p}` : p), "");
};

type Age = Extract<Feast, { kind: "age" }>;

/**
 * An Age has no sentence of its own ("The Age of the ...": an article and a gender in four
 * languages): the kicker says it, the title is the movement it is named after, else the practice
 * in the lead, else the level.
 */
export function ageTitle(
  t: TFunction,
  f: Pick<Age, "level" | "movement" | "practice">,
  language: AppLanguage,
): string {
  if (f.movement) return localizedName(f.movement, language);
  if (f.practice) return sentence(t(PRACTICE_KEY[f.practice]));
  return t("session.feast_age_level", { level: f.level });
}

/** "New age: Diamond push-up", the label form a tier takes in "Tonight" too. */
export const ageLine = (t: TFunction, f: Age, language: AppLanguage) =>
  t("session.tonight_age", { title: ageTitle(t, f, language) });

/** What the Age says of its name: first done at level 47, the highest held, the practice, or just ten levels. */
export function ageBody(t: TFunction, f: Age): string {
  const level = f.level;
  if (f.movement && f.reachedAtLevel !== null && f.source !== "practice" && f.source !== "none")
    return t(`session.feast_age_body_${f.source}`, { level, at: f.reachedAtLevel });
  return f.practice
    ? t("session.feast_age_body_practice", { level })
    : t("session.feast_age_body_none");
}

/**
 * The year the village has had: how many sessions, or, under `FEW_SESSIONS`, the best record
 * instead of a small count. Empty when a quiet year broke none.
 */
export function anniversaryBody(
  t: TFunction,
  f: Extract<Feast, { kind: "anniversary" }>,
  language: AppLanguage,
): string {
  if (f.sessions >= FEW_SESSIONS) return t("session.feast_anniversary_body", { n: f.sessions });
  if (!f.best?.movement) return "";
  return t("session.feast_anniversary_record", {
    movement: localizedName(f.best.movement, language),
    from: formatTargetValue({ type: f.best.unit, value: f.best.prior }, language),
    to: formatTargetValue({ type: f.best.unit, value: f.best.value }, language),
  });
}
