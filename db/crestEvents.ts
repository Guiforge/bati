import type { Crest } from "./crest";
import { DELIVERED_COATS, hasRareCoat } from "./crestCoat";
import {
  ADULT_AT,
  type Animal,
  type CrestStage,
  LEGENDARY_AT,
  PRACTICES,
  type Practice,
  type PracticeAnimal,
  practiceOfAnimal,
  REVEAL_AT,
  VENERABLE_AT,
} from "./crestRules";

type Seen = Pick<
  Crest,
  "animal" | "stage" | "second" | "manual" | "quarters" | "evidence" | "longestFlame"
>;

/** The animal the sessions chose and, for the boar, its quarters. */
export type CrestReveal = {
  animal: Animal;
  quarters: [Practice, Practice] | null;
  /** The practices of the first 8 sessions, with their counts, the most done first. */
  firstEight: [Practice, number][];
  /**
   * More than 8 sessions had a practice when the phone first shows this: a hero who already had
   * them at the update, so the animal has watched since an earlier session than tonight's.
   */
  late: boolean;
};

export type CrestEvents = {
  /** A border appeared on the shield: `n` of the `total` sessions with a practice are its practice. */
  secondJoins: { animal: PracticeAnimal; first: Animal; n: number; total: number } | null;
  /**
   * An animal on the crest went up a stage. A stage rises exactly at its threshold, so `n` is
   * that threshold (40, 200, 500). `own` is whether it counts its own practice's sessions (false for
   * the boar and a hand-picked animal, which count every session).
   */
  stageUp: { animal: Animal; stage: Exclude<CrestStage, "young">; n: number; own: boolean }[];
};

export const NO_CREST_EVENTS: CrestEvents = { secondJoins: null, stageUp: [] };

const RANK: Record<CrestStage, number> = { young: 0, adult: 1, venerable: 2, legendary: 3 };

const STAGE_AT = { adult: ADULT_AT, venerable: VENERABLE_AT, legendary: LEGENDARY_AT } as const;

const sessionsWithPractice = (a: Seen) =>
  PRACTICES.reduce((sum, p) => sum + a.evidence.totals[p], 0);

/**
 * The reveal is a fact about the phone, not about one session: the crest exists after this
 * session and the phone has not shown the `reveal` feast yet (`bigFeastsShown`). So a hero who
 * already had 300 sessions at the update sees it on their first victory, and a retried save
 * sees it again. `shown` undefined means the key could not be read: say nothing. Pure.
 */
export function crestReveal(
  after: Seen | null | undefined,
  shown: string[] | undefined,
): CrestReveal | null {
  if (!after || !shown || shown.includes("reveal")) return null;
  const { first, firstEight, firstEightOrder } = after.evidence;
  return {
    animal: first,
    quarters: first === "boar" ? after.evidence.boarQuarters : null,
    firstEight: firstEightOrder.map((p): [Practice, number] => [p, firstEight[p]]),
    late: sessionsWithPractice(after) > REVEAL_AT,
  };
}

function secondJoinsOf(before: Seen | null, after: Seen): CrestEvents["secondJoins"] {
  // The card follows the shield on show: a border appearing, whatever the hero put at the centre.
  if (before === null || before.second !== null || after.second === null) return null;
  const { animal } = after.second;
  const p = practiceOfAnimal(animal);
  if (p === undefined) return null;
  return {
    animal,
    first: after.animal,
    n: after.evidence.totals[p],
    total: sessionsWithPractice(after),
  };
}

function stageUpOf(before: Seen | null, after: Seen): CrestEvents["stageUp"] {
  const up: CrestEvents["stageUp"] = [];
  const rose = (animal: Animal, was: CrestStage, now: CrestStage, own: boolean) => {
    if (now === "young" || RANK[now] <= RANK[was]) return;
    up.push({ animal, stage: now, n: STAGE_AT[now], own });
  };
  if (before === null) return up;
  if (before.animal === after.animal)
    rose(after.animal, before.stage, after.stage, !after.manual && after.animal !== "boar");
  if (before.second && after.second && before.second.animal === after.second.animal)
    rose(after.second.animal, before.second.stage, after.second.stage, true);
  return up;
}

/**
 * What one session changed on the crest, from two reads of the journal. Pure. The reveal is the
 * sessions' (`crestReveal`); a newcomer and a stage are read off the shield on show, so the card
 * never names an animal that does not appear.
 */
export function crestEvents(before: Seen | null, after: Seen | null): CrestEvents {
  if (after === null) return NO_CREST_EVENTS;
  return {
    secondJoins: secondJoinsOf(before, after),
    stageUp: stageUpOf(before, after),
  };
}

/** The key `bigFeastsShown` holds once the rare coat's card has been shown: local to the phone. */
export const COAT_RARE_KEY = "coat:rare";

/** The animal at the centre that wears the rare coat the card announces. */
export type RareCoatNews = { animal: Animal; stage: Exclude<CrestStage, "young"> };

/**
 * The rare coat's card, a fact about the phone like the reveal: the hero has won it (the longest
 * flame reached Eternal), the animal at the centre is an adult or more, its rare portrait ships,
 * and this phone has not shown the card yet. A hero who had won it before the update sees it once,
 * on their first session. `shown` undefined means the key could not be read: say nothing. Pure.
 */
export function rareCoatNews(
  after: Seen | null | undefined,
  shown: string[] | undefined,
  delivered: ReadonlySet<string> = DELIVERED_COATS,
): RareCoatNews | null {
  if (!after || !shown || shown.includes(COAT_RARE_KEY)) return null;
  const { animal, stage } = after;
  if (stage === "young" || !hasRareCoat(after.longestFlame)) return null;
  return delivered.has(`${animal}-${stage}-rare`) ? { animal, stage } : null;
}
