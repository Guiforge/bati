import type { Crest } from "./crest";
import {
  ADULT_AT,
  ANIMAL_OF,
  type Animal,
  type CrestStage,
  PRACTICES,
  type Practice,
  type PracticeAnimal,
  VENERABLE_AT,
} from "./crestRules";

type Seen = Pick<Crest, "animal" | "stage" | "second" | "manual" | "quarters" | "evidence">;

/** The animal the sessions chose and, for the boar, its quarters. */
export type CrestReveal = { animal: Animal; quarters: [Practice, Practice] | null };

export type CrestEvents = {
  /** The second animal entered: `n` of the `total` sessions with a practice are its practice. */
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
  const { first } = after.evidence;
  return { animal: first, quarters: after.evidence.boarQuarters };
}

function secondJoinsOf(before: Seen | null, after: Seen): CrestEvents["secondJoins"] {
  const joined = after.evidence.secondFromSessions;
  if (before === null || before.evidence.secondFromSessions !== null) return null;
  if (joined === null || joined === "boar") return null;
  const p = practiceOf(joined);
  if (p === undefined) return null;
  return {
    animal: joined,
    first: after.evidence.first,
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
 * What one session changed on the crest, from two reads of the journal. Pure. It compares the
 * animals the *sessions* chose (`evidence`), never the one on show: a hero's own pick is a
 * display and must not announce a reveal or a newcomer that the journal did not make.
 */
export function crestEvents(before: Seen | null, after: Seen | null): CrestEvents {
  if (after === null) return NO_CREST_EVENTS;
  return {
    secondJoins: secondJoinsOf(before, after),
    stageUp: stageUpOf(before, after),
  };
}
