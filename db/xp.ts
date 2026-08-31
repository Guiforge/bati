import { estimateExerciseSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import type { DifficultyCode } from "./schema";
import type { Target } from "./targets";
import { NON_REP_STYLE, SECONDS_PER_REP_EQUIVALENT } from "./workUnits";

/**
 * XP measures the effort a session contained, not the time it spanned.
 *
 * It used to be `durationSeconds / 5` — wall-clock, nothing else. Rest counted, standing still
 * counted, a backgrounded app counted, and a hero who set the rest slider to its 300s maximum
 * out-earned one who trained: sitting paid exactly what working paid, for no effort. That is the
 * bug this file exists to close, and `docs/gameplay/progression.md` already promised the fix —
 * "XP, the village and the flame all measure how much and how often". Only the code disagreed.
 *
 * Effort is counted in seconds, at the catalogue's own tempo (`secondsPerRep`), which makes
 * `estimateExerciseSeconds` the whole conversion: the function that estimates a quest's length
 * from its targets estimates a set's effort from its result. Rate is one XP per
 * `SECONDS_PER_REP_EQUIVALENT` — so 1 XP per rep at the default 3s tempo, and a minute of holds
 * is worth a minute of reps.
 *
 * Deliberately *not* `toRepEquivalent`: that function's flat 3s conversion is what six seeded
 * boss HP pools were tuned against (`drizzle/0026_boss_pacing.sql`, held by
 * `__tests__/content-invariants.test.ts`). XP and damage answer different questions — effort
 * spent versus blows landed, the latter with weakness, resistance and crits — so they keep
 * different units and the bosses need no re-tune.
 */

/** Beating a target pays in full up to +25%. Past that, `OVERSHOOT_DECAY`. */
export const OVERSHOOT_ALLOWANCE = 1.25;

/**
 * What effort past the allowance is worth — less, never nothing.
 *
 * A hard wall would tell the hero who did 15 pull-ups on a target of 10 that their last two were
 * worth zero, which is the exact moment an app discourages its best user. The brake belongs at
 * the session level (`MAX_SESSION_XP`), where it protects, not at the set level, where it punishes.
 */
export const OVERSHOOT_DECAY = 0.25;

/**
 * How much faster than the catalogue's tempo a hero is allowed to be before the clock stops
 * believing them.
 *
 * Nobody can have exercised for more seconds than the session's effort window lasted, so this
 * bound is physical rather than tuned — 1.2 is the slack for a hero who genuinely moves faster
 * than `secondsPerRep` says. It is what makes tapping fifty sets through in twenty seconds worth
 * twenty seconds, and it is a *ceiling* on effort, never a floor: waiting still earns nothing.
 */
export const SPEED_ALLOWANCE = 1.2;

/**
 * The one bound no hero input can raise.
 *
 * Rounds, targets, tempo, difficulty, declared results and elapsed time are all typed in by the
 * hero, so any cap derived from them caps nothing — a quest of 10 rounds × 5 exercises × 999 reps
 * has a "nominal" of fifty thousand. Sized at the honest ceiling instead: a hard 60-minute session
 * with ~45 minutes of effort pays ~900, ×1.2 difficulty ×1.5 daily plus the two flat bonuses lands
 * just under 2000. Unreachable by training, and the roof on everything else.
 */
export const MAX_SESSION_XP = 2000;

/** No session is wasted — see `docs/gameplay/session-flow.md`. */
const XP_FLOOR = 10;

/**
 * What a movement is worth per second of effort.
 *
 * Without it the optimal strategy is the easiest exercise in the catalogue: `toRepEquivalent` is
 * flat, so fifty jumping jacks and fifty pull-ups weigh the same.
 *
 * The spread is wide because a narrow one was measured against the seeded catalogue and found to
 * punish the two archetypes it should reward. `skill` and `strength` quests are 80-87% rest *by
 * protocol* — ten seconds of front lever, two minutes of recovery — so any volume metric
 * undervalues them: at 0.85/1.0/1.25 they paid 0.31× and 0.51× of what the old clock paid, while
 * `mobility` kept 0.97×. A hard rep being worth roughly three easy ones is also just true; one
 * pull-up is not one jumping jack.
 *
 * A hero can mark their own movement `hard` (`createUserExercise`), which is now a 2.5× self-grant
 * rather than 1.25×. It is bounded by the effort ceiling and `MAX_SESSION_XP` like everything
 * else, and lying about a movement's difficulty is a different act from dragging a slider.
 */
const DIFFICULTY_WEIGHT: Record<DifficultyCode, number> = {
  easy: 0.8,
  medium: 1.0,
  hard: 2.5,
};

/** The hero's chosen level. Distinct from `USER_LEVEL_MULTIPLIER`, which scales targets. */
const LEVEL_MULTIPLIER: Record<DifficultyCode, number> = {
  easy: 0.9,
  medium: 1.0,
  hard: 1.2,
};

/** One set as XP reads it: what was asked, what was done, and by whom. */
export type XpSet = {
  exercise: Pick<Exercise, "secondsPerRep" | "difficulty" | "style">;
  target: Target;
  result: Target;
};

export type ComputeSessionXpInput = {
  sets: XpSet[];
  /**
   * The session's elapsed time minus explicit pauses **and minus the rest actually taken** — the
   * window in which effort could physically have happened.
   *
   * Rest has to come out, or camping the rest screen would inflate the very ceiling that
   * fabricated results then fill. Rest *taken*, not rest *prescribed*: subtracting the prescription
   * would push an honest hero who skips their rests below their own effort and floor them.
   */
  effortCeilingSeconds: number;
  userLevel: DifficultyCode;
};

/**
 * Seconds of effort credited for one set, before the movement's weight.
 *
 * Raw and weighted are tracked apart on purpose: the effort ceiling is a bound on *physical*
 * seconds — nobody trained longer than the session lasted — while the difficulty weight is a
 * judgement about what a second was worth. Weighting first and clipping after would measure a
 * value against a clock, and at `DIFFICULTY_WEIGHT.hard = 2.5` that clips every honest strength
 * session, which is the opposite of why the weight is wide.
 */
function setEffortSeconds({ exercise, target, result }: XpSet): number {
  const done = Math.max(0, estimateExerciseSeconds(exercise, result));
  const allowed = Math.max(0, estimateExerciseSeconds(exercise, target)) * OVERSHOOT_ALLOWANCE;

  // A hold's result *is* a clock: `ActiveExerciseView` records the elapsed seconds and overtime
  // is unbounded, so a phone left face-up on a 30s plank declares two hours without anyone
  // lying. Reps are typed by a hero who is present, so their overshoot earns the decaying tail;
  // a hold's does not. The `longest_hold` record still keeps the true value — XP pays for the
  // work prescribed, the record celebrates the feat.
  //
  // An outing is the exception, and it is the reason this branch reads the style at all. Its
  // clock has a witness: the caller passes the reducer's *moving* seconds as the effort ceiling,
  // and a phone that sits on a windowsill accrues none of them. So the argument for clamping a
  // hold does not hold here, and clamping anyway is what made every walk past nineteen minutes
  // worth exactly the same as the nineteenth — three short walks beating one long one at the one
  // thing the feature is named after.
  const clocked = result.type === "time" && exercise.style !== NON_REP_STYLE;
  const credited = clocked
    ? Math.min(done, allowed)
    : Math.min(done, allowed) + Math.max(0, done - allowed) * OVERSHOOT_DECAY;

  return credited;
}

/** What that set is worth, once the movement it trained is taken into account. */
function setWeightedSeconds(set: XpSet): number {
  return setEffortSeconds(set) * DIFFICULTY_WEIGHT[set.exercise.difficulty];
}

/** Weighted effort seconds → XP. The tail every entry point shares. */
function effortToXp(effortSeconds: number, userLevel: DifficultyCode): number {
  const xp =
    (Math.max(0, effortSeconds) / SECONDS_PER_REP_EQUIVALENT) * LEVEL_MULTIPLIER[userLevel];

  return Math.min(MAX_SESSION_XP, Math.max(XP_FLOOR, Math.round(xp)));
}

export function computeSessionXp({
  sets,
  effortCeilingSeconds,
  userLevel,
}: ComputeSessionXpInput): number {
  const rawSeconds = sets.reduce((sum, set) => sum + setEffortSeconds(set), 0);
  const weightedSeconds = sets.reduce((sum, set) => sum + setWeightedSeconds(set), 0);

  // The clock bounds the physical claim; whatever fraction of it survives, the weighted value
  // keeps. Scaling rather than clipping is what lets a session of hard movements be worth more
  // than its own duration without letting it claim more seconds than it lasted.
  const ceiling = Math.max(0, effortCeilingSeconds) * SPEED_ALLOWANCE;
  const credited =
    rawSeconds > ceiling && rawSeconds > 0
      ? weightedSeconds * (ceiling / rawSeconds)
      : weightedSeconds;

  return effortToXp(credited, userLevel);
}

export type EstimateQuestXpInput = {
  rounds: number;
  exercises: Array<{ exercise: XpSet["exercise"]; target: Target }>;
};

/**
 * What a quest is worth to a hero who beats every target by the full allowance — the "up to +N XP"
 * the gallery and the quest screen advertise.
 *
 * It reads targets only, so it no longer moves when the rest slider does. That tag was how the
 * rest exploit was found in the first place: dragging rest to 300s advertised +2940 XP, and the
 * screen was telling the truth about a formula that should never have paid for waiting.
 *
 * No effort ceiling — an estimate has no clock yet, and this is an upper bound by construction.
 */
export function estimateQuestXp(quest: EstimateQuestXpInput, userLevel: DifficultyCode): number {
  const rounds = Math.max(1, Math.round(quest.rounds));
  const perRound = quest.exercises.reduce(
    (sum, qex) =>
      sum +
      setWeightedSeconds({
        exercise: qex.exercise,
        target: qex.target,
        result: { type: qex.target.type, value: qex.target.value * OVERSHOOT_ALLOWANCE },
      }),
    0,
  );

  return effortToXp(rounds * perRound, userLevel);
}
