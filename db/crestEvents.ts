import type { Crest } from "./crest";
import {
  ADULT_AT,
  ANIMAL_OF,
  type Animal,
  type CrestStage,
  PRACTICES,
  type Practice,
  type PracticeAnimal,
  REVEAL_AT,
  VENERABLE_AT,
} from "./crestRules";

type Seen = Pick<Crest, "animal" | "stage" | "second" | "manual" | "quarters" | "evidence">;

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
   * that threshold (40, 200). `own` is whether it counts its own practice's sessions (false for
   * the boar and a hand-picked animal, which count every session).
   */
  stageUp: { animal: Animal; stage: Exclude<CrestStage, "young">; n: number; own: boolean }[];
};

export const NO_CREST_EVENTS: CrestEvents = { secondJoins: null, stageUp: [] };

const RANK: Record<CrestStage, number> = { young: 0, adult: 1, venerable: 2 };
const practiceOf = (a: Animal) => PRACTICES.find((p) => ANIMAL_OF[p] === a);

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
  const { first, firstEight } = after.evidence;
  return {
    animal: first,
    quarters: after.evidence.boarQuarters,
    firstEight: PRACTICES.flatMap((p): [Practice, number][] =>
      firstEight[p] > 0 ? [[p, firstEight[p]]] : [],
    ).sort((a, b) => b[1] - a[1]),
    late: sessionsWithPractice(after) > REVEAL_AT,
  };
}

function secondJoinsOf(before: Seen | null, after: Seen): CrestEvents["secondJoins"] {
  // The card follows the shield on show: a border appearing, whatever the hero put at the centre.
  if (before === null || before.second !== null || after.second === null) return null;
  const { animal } = after.second;
  const p = practiceOf(animal);
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
    up.push({ animal, stage: now, n: now === "adult" ? ADULT_AT : VENERABLE_AT, own });
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
