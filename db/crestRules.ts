import type { ExerciseStyle, Locomotion } from "./schema";

/** In the fixed order that settles every tie. `run` is the Stag's: cardio, or a walk or a run. */
export const PRACTICES = ["strength", "calisthenics", "yoga", "run", "ride"] as const;
export type Practice = (typeof PRACTICES)[number];

export const ANIMAL_OF = {
  strength: "bear",
  calisthenics: "ermine",
  yoga: "salmon",
  run: "stag",
  ride: "horse",
} as const satisfies Record<Practice, string>;

export type Animal = (typeof ANIMAL_OF)[Practice] | "boar";
/** An animal a practice earns: every one but the boar, which no practice owns. */
export type PracticeAnimal = (typeof ANIMAL_OF)[Practice];
export const ANIMALS: readonly Animal[] = [...Object.values(ANIMAL_OF), "boar"];

export type CrestStage = "young" | "adult" | "venerable" | "legendary";

/** One session that counts, with the exercises it got done, by style (see `db/crest.ts`). */
export type CrestSession = {
  uuid: string;
  outing: Locomotion | null;
  // `expedition` is left out on purpose: it counts for no practice.
} & Record<Exclude<ExerciseStyle, "expedition">, number>;

type Tally = Record<Practice, number>;

export type CrestAnimals = {
  animal: Animal;
  stage: CrestStage;
  /** Chosen by the hero: the ink diamond. */
  manual: boolean;
  /** What is stored, as written: `manual` is false when the pick equals the sessions' animal, this is not. */
  picked: Animal | "auto";
  /** Never the boar: it fills the field, so it has no border to stand in. */
  second: { animal: PracticeAnimal; stage: CrestStage } | null;
  /** The boar's two quarters, the practices in the lead over every session; null for the others. */
  quarters: [Practice, Practice] | null;
  /**
   * The stage the picker shows beside each animal: the one the sessions' own animal has (its
   * practice's count), and the one any animal the hero chose has (every session that counts).
   */
  optionStages: { sessions: CrestStage; chosen: CrestStage };
  /** Where in `sessions` the 8th session that has a practice sits: the one that revealed it. */
  revealedIndex: number;
  /** What "Why the Bear?" reads: counts per practice, over the first 8 and over all. */
  evidence: {
    firstEight: Tally;
    /** The practices of `firstEight`, in the order the quarters use: count, then recency. */
    firstEightOrder: Practice[];
    totals: Tally;
    first: Animal;
    secondFromSessions: PracticeAnimal | null;
    /** The quarters the sessions give a boar, whichever animal is on show; null only with no practice, [p, p] with a single one. */
    boarQuarters: [Practice, Practice] | null;
  };
};

export const REVEAL_AT = 8;
const FIRST_SHARE = 40;
const SECOND_SHARE = 30;
const SECOND_MIN = 20;
export const ADULT_AT = 40;
export const VENERABLE_AT = 200;
export const LEGENDARY_AT = 500;

/** The practice an animal belongs to; the boar has none. */
export const practiceOfAnimal = (a: Animal): Practice | undefined =>
  PRACTICES.find((p) => ANIMAL_OF[p] === a);

const tally = (): Tally => ({ strength: 0, calisthenics: 0, yoga: 0, run: 0, ride: 0 });

/**
 * The practice of one session, or null. A workout with no exercise done that counts has none and
 * is ignored by everything below (and still holds the flame and starts the rings).
 */
function practiceOf(s: CrestSession): Practice | null {
  if (s.outing !== null) return s.outing === "ride" ? "ride" : "run";
  const counts: Tally = {
    strength: s.strength,
    calisthenics: s.calisthenics,
    yoga: s.yoga,
    run: s.cardio,
    ride: 0,
  };
  let best: Practice | null = null;
  for (const p of PRACTICES)
    if (counts[p] > 0 && (best === null || counts[p] > counts[best])) best = p;
  return best;
}

/** The practices in journal order, and where in `sessions` the 8th of them sits (-1 before it). */
function practised(sessions: CrestSession[]) {
  const list: Practice[] = [];
  let revealedIndex = -1;
  for (const [i, s] of sessions.entries()) {
    const p = practiceOf(s);
    if (p === null) continue;
    list.push(p);
    if (list.length === REVEAL_AT) revealedIndex = i;
  }
  return { list, revealedIndex };
}

const stageOf = (n: number): CrestStage =>
  n >= LEGENDARY_AT
    ? "legendary"
    : n >= VENERABLE_AT
      ? "venerable"
      : n >= ADULT_AT
        ? "adult"
        : "young";

/** The most recently trained of `among`, then the fixed order. */
function mostRecent(among: Practice[], last: Tally): Practice | undefined {
  return [...among].sort(
    (a, b) => last[b] - last[a] || PRACTICES.indexOf(a) - PRACTICES.indexOf(b),
  )[0];
}

/**
 * Replays from the 9th session; the first practice to cross stays for good, even if it falls back.
 * Only the practice just trained can cross, and none can before 20 sessions: no tie to break.
 */
function secondOf(list: Practice[], first: Practice, firstEight: Tally) {
  const n = { ...firstEight };
  for (let i = REVEAL_AT; i < list.length; i++) {
    const p = list[i] as Practice;
    n[p]++;
    if (p !== first && n[p] >= SECOND_MIN && n[p] * 100 >= SECOND_SHARE * (i + 1)) return p;
  }
  return undefined;
}

/** The practices done, the most often first, a tie going to the most recent: one order for every line that lists them. */
function ranked(counts: Tally, last: Tally): Practice[] {
  return PRACTICES.filter((p) => counts[p] > 0).sort(
    (a, b) =>
      counts[b] - counts[a] || last[b] - last[a] || PRACTICES.indexOf(a) - PRACTICES.indexOf(b),
  );
}

/** The boar's quarters: practices actually done, the leaders first; with a single one, both are it. */
function quartersOf(totals: Tally, last: Tally): [Practice, Practice] | null {
  const [q1, q2] = ranked(totals, last);
  return q1 === undefined ? null : [q1, q2 ?? q1];
}

/**
 * Everything the animal says, replayed from the journal in order (`performedAt`, then `uuid`: the
 * caller sorts). Nothing is stored, so a merge or a deletion that changes the history changes the
 * answer. Thresholds are integers: `n * 100 >= 40 * total`, never a float.
 *
 * `picked` is the hero's pick (`auto` or an animal). Before the reveal there is no crest at all.
 */
export function crestAnimals(
  sessions: CrestSession[],
  picked: Animal | "auto",
): CrestAnimals | null {
  const { list, revealedIndex } = practised(sessions);
  if (list.length < REVEAL_AT) return null;

  // Recency is the position of a practice's last session, so a tie on counts reads the journal.
  const count = (from: Practice[]) => {
    const n = tally();
    const last: Tally = { strength: -1, calisthenics: -1, yoga: -1, run: -1, ride: -1 };
    from.forEach((p, i) => {
      n[p]++;
      last[p] = i;
    });
    return { n, last };
  };
  const { n: totals, last } = count(list);
  const { n: firstEight, last: eightLast } = count(list.slice(0, REVEAL_AT));

  const firstPractice = mostRecent(
    PRACTICES.filter((p) => firstEight[p] * 100 >= FIRST_SHARE * REVEAL_AT),
    eightLast,
  );

  const secondPractice =
    firstPractice === undefined ? undefined : secondOf(list, firstPractice, firstEight);

  const firstOfPractice = firstPractice === undefined ? null : ANIMAL_OF[firstPractice];
  const first: Animal = firstOfPractice ?? "boar";
  const secondFromSessions = secondPractice === undefined ? null : ANIMAL_OF[secondPractice];

  // A pick equal to the sessions' own animal is the sessions' animal: not manual, no diamond.
  const choice = picked === first ? "auto" : picked;
  let center = first;
  let border: PracticeAnimal | null = secondFromSessions;
  if (choice !== "auto") {
    center = choice;
    // The first animal steps out to the border only when the hero picked the second one.
    border =
      choice === secondFromSessions
        ? firstOfPractice
        : choice === "boar"
          ? null
          : secondFromSessions;
  }
  const manual = choice !== "auto";

  const stageFor = (a: Animal, own: boolean) => {
    const p = practiceOfAnimal(a);
    return stageOf(own && p !== undefined ? totals[p] : sessions.length);
  };

  const quarters = center === "boar" ? quartersOf(totals, last) : null;

  return {
    animal: center,
    stage: stageFor(center, !manual),
    manual,
    picked,
    second: border === null ? null : { animal: border, stage: stageFor(border, true) },
    quarters,
    revealedIndex,
    optionStages: { sessions: stageFor(first, true), chosen: stageFor(first, false) },
    evidence: {
      firstEight,
      firstEightOrder: ranked(firstEight, eightLast),
      totals,
      first,
      secondFromSessions,
      boarQuarters: quartersOf(totals, last),
    },
  };
}
