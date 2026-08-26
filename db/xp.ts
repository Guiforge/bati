import { estimateExerciseSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import type { DifficultyCode } from "./schema";
import type { Target } from "./targets";
import { SECONDS_PER_REP_EQUIVALENT } from "./workUnits";

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
 * flat, so fifty jumping jacks and fifty pull-ups weigh the same. Kept narrow on purpose — a hero
 * can mark their own movement `hard` (`db/exercises.ts`, `createUserExercise`), and a 1.25×
 * self-grant is not worth defending against.
 */
const DIFFICULTY_WEIGHT: Record<DifficultyCode, number> = {
  easy: 0.85,
  medium: 1.0,
  hard: 1.25,
};

/** The hero's chosen level. Distinct from `USER_LEVEL_MULTIPLIER`, which scales targets. */
const LEVEL_MULTIPLIER: Record<DifficultyCode, number> = {
  easy: 0.9,
  medium: 1.0,
  hard: 1.2,
};

/** One set as XP reads it: what was asked, what was done, and by whom. */
export type XpSet = {
  exercise: Pick<Exercise, "secondsPerRep" | "difficulty">;
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

/** Weighted seconds of effort credited for one set. */
function setEffortSeconds({ exercise, target, result }: XpSet): number {
  const done = Math.max(0, estimateExerciseSeconds(exercise, result));
  const allowed = Math.max(0, estimateExerciseSeconds(exercise, target)) * OVERSHOOT_ALLOWANCE;

  // A hold's result *is* a clock: `ActiveExerciseView` records the elapsed seconds and overtime
  // is unbounded, so a phone left face-up on a 30s plank declares two hours without anyone
  // lying. Reps are typed by a hero who is present, so their overshoot earns the decaying tail;
  // a hold's does not. The `longest_hold` record still keeps the true value — XP pays for the
  // work prescribed, the record celebrates the feat.
  const credited =
    result.type === "time"
      ? Math.min(done, allowed)
      : Math.min(done, allowed) + Math.max(0, done - allowed) * OVERSHOOT_DECAY;

  return credited * DIFFICULTY_WEIGHT[exercise.difficulty];
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
  const claimed = sets.reduce((sum, set) => sum + setEffortSeconds(set), 0);
  const ceiling = Math.max(0, effortCeilingSeconds) * SPEED_ALLOWANCE;

  return effortToXp(Math.min(claimed, ceiling), userLevel);
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
      setEffortSeconds({
        exercise: qex.exercise,
        target: qex.target,
        result: { type: qex.target.type, value: qex.target.value * OVERSHOOT_ALLOWANCE },
      }),
    0,
  );

  return effortToXp(rounds * perRound, userLevel);
}
