import type { Crest } from "./crest";
import {
  ANIMAL_OF,
  type Animal,
  type CrestStage,
  PRACTICES,
  type Practice,
  type PracticeAnimal,
} from "./crestRules";

type Seen = Pick<Crest, "animal" | "stage" | "second" | "manual" | "quarters" | "evidence">;

export type CrestEvents = {
  /** No crest before, one after: the animal the sessions chose and, for the boar, its quarters. */
  reveal: { animal: Animal; quarters: [Practice, Practice] | null } | null;
  /** The second animal entered: `n` of the `total` sessions with a practice are its practice. */
  secondJoins: { animal: PracticeAnimal; first: Animal; n: number; total: number } | null;
  /** An animal on the crest went up a stage. `n` is its practice's sessions, null when the stage counts every session (the boar, a hand-picked animal). */
  stageUp: { animal: Animal; stage: Exclude<CrestStage, "young">; n: number | null }[];
};

export const NO_CREST_EVENTS: CrestEvents = { reveal: null, secondJoins: null, stageUp: [] };

const RANK: Record<CrestStage, number> = { young: 0, adult: 1, venerable: 2 };
const practiceOf = (a: Animal) => PRACTICES.find((p) => ANIMAL_OF[p] === a);

const sessionsWithPractice = (a: Seen) =>
  PRACTICES.reduce((sum, p) => sum + a.evidence.totals[p], 0);

function revealOf(before: Seen | null, after: Seen): CrestEvents["reveal"] {
  if (before !== null) return null;
  const { first } = after.evidence;
  return { animal: first, quarters: first === "boar" ? after.quarters : null };
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
  const rose = (a: Animal, was: CrestStage, now: CrestStage, own: boolean) => {
    if (now === "young" || RANK[now] <= RANK[was]) return;
    const p = practiceOf(a);
    up.push({ animal: a, stage: now, n: own && p !== undefined ? after.evidence.totals[p] : null });
  };
  if (before === null) return up;
  if (before.animal === after.animal) rose(after.animal, before.stage, after.stage, !after.manual);
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
    reveal: revealOf(before, after),
    secondJoins: secondJoinsOf(before, after),
    stageUp: stageUpOf(before, after),
  };
}
