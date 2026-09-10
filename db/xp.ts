import { estimateExerciseSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import { cheapestLocomotion } from "./expeditions";
import type { DifficultyCode, Locomotion } from "./schema";
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

/**
 * What a minute in motion is worth, in minutes of effort.
 *
 * Decided, not derived. The ordering follows the Compendium of Physical Activities (walking 3.8
 * MET, cycling 6.8, running 8.5, a bodyweight circuit 6.0), but the values are three times below
 * what MET ÷ 6 gives and no rounding of that division reaches them, so anyone citing the
 * division to justify a fourth entry will be citing arithmetic that was never done. What the
 * numbers actually encode is that Bati is a strengthening game and a walk does none of it, plus
 * how much of each the phone can witness.
 *
 * `ride` is not above `walk` even though the effort is, and that is the deliberate part. The
 * mounted speed cap is 25 m/s (`stores/expedition.ts`), which is 90 km/h, so an hour on a
 * motorway credits an hour of moving time. At ⅓ that paid 400 XP against 300 for an hour of
 * genuine walking, which inverts the one thing the phone does know. Lowering the speed cap is
 * the better fix and it belongs to the GPS reducer, not here.
 *
 * A hero's own expedition is written `walk` and cannot be anything else: see `UserExerciseDraft`
 * in `db/exercises.ts` for why a picker here would be a free doubling.
 *
 * ponytail: the ¼ on `walk` is the one value here nobody has measured against real use. It was
 *           chosen so an hour on foot is 300 XP, which is two and a half of the catalogue's
 *           median quests, and the tester who reported the six-hour hike has not walked a month
 *           under it yet. If a regular walker still outpaces someone who trains, ⅕ puts the hour
 *           at 240 - two median quests exactly - and nothing else has to move. Do that on a
 *           month of real journals, not on an argument.
 */
const LOCOMOTION_RATE: Record<Locomotion, number> = {
  walk: 1 / 4,
  ride: 1 / 4,
  run: 1 / 2,
};

/** The band the full rate is paid over, and the width of every band after it. */
const OUTING_BAND_SECONDS = 3600;

/**
 * The first hour outside pays in full, the second at half, everything after at a quarter. Never
 * zero: a walk that goes on is worth less per minute and never worth nothing, the same shape
 * `OVERSHOOT_DECAY` gives a rep past its target.
 *
 * Read over the **day**, not the session, which is the whole reason `computeSessionXp` takes
 * what the day already credited. Per session it is dodged by stopping and starting: six hours
 * cut into six paid 1800 against 750 in one piece, no cheating required, and that is the same
 * class of discoverable hole as the rest slider `0037` closed.
 */
function creditedOutingSeconds(seconds: number): number {
  const total = Math.max(0, seconds);
  const first = Math.min(total, OUTING_BAND_SECONDS);
  const second = Math.min(Math.max(0, total - OUTING_BAND_SECONDS), OUTING_BAND_SECONDS);
  const rest = Math.max(0, total - 2 * OUTING_BAND_SECONDS);

  return first + second * 0.5 + rest * 0.25;
}

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

/**
 * The ground this session covered, priced once for the whole session.
 *
 * Once, not per slot: a quest with six outdoor slots, or six rounds, priced each leg against a
 * fresh day and paid 1800 for the six hours that are worth 750. `seconds` is therefore the
 * session's, already bounded by its witness before it gets here — see `outingSeconds` in
 * `stores/session.ts`, which is the only place that knows both the results and the trace.
 */
export type OutingLeg = { seconds: number; locomotion: Locomotion };

export type ComputeSessionXpInput = {
  /**
   * The sets that were counted or held. Locomotion slots are not among them: they are not
   * priced a set at a time, and `toXpSets` drops them.
   */
  sets: XpSet[];
  /**
   * The session's elapsed time minus explicit pauses **and minus the rest actually taken** — the
   * window in which effort could physically have happened.
   *
   * Rest has to come out, or camping the rest screen would inflate the very ceiling that
   * fabricated results then fill. Rest *taken*, not rest *prescribed*: subtracting the prescription
   * would push an honest hero who skips their rests below their own effort and floor them.
   *
   * It bounds the sets above and nothing else. The ground has its own witness.
   */
  effortCeilingSeconds: number;
  /** What this session covered on foot or on a mount, or null when it never left the walls. */
  outing?: OutingLeg | null;
  /**
   * What the day's earlier outings already credited, in the same seconds `outing.seconds` is in.
   *
   * This is what makes the decay a property of the day rather than of the session, and it is
   * the difference between a rule and a suggestion: without it, stopping and starting pays 2.4×
   * for the same walk. Zero on the first outing of the day, and zero for every workout.
   */
  priorOutingSecondsToday?: number;
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
  return result.type === "time"
    ? Math.min(done, allowed)
    : Math.min(done, allowed) + Math.max(0, done - allowed) * OVERSHOOT_DECAY;
}

/** What that set is worth, once the movement it trained is taken into account. */
function setWeightedSeconds(set: XpSet): number {
  return setEffortSeconds(set) * DIFFICULTY_WEIGHT[set.exercise.difficulty];
}

/**
 * What a session's ground is worth, in the same effort seconds a rep is measured in.
 *
 * The marginal band, not the whole: the day's earlier outings already spent the cheap hours, so
 * this session is paid for the part of the curve it actually sits on. Six one-hour walks and one
 * six-hour walk therefore come to the same total, to within one rounding each.
 *
 * No level multiplier. A walk is neither easy nor hard, it is a walk, and the rate is the whole
 * judgement — the same reason the quest screen shows an outing no level line.
 */
export function outingEffortSeconds(outing: OutingLeg, priorSeconds: number): number {
  const prior = Math.max(0, priorSeconds);
  const credited =
    creditedOutingSeconds(prior + Math.max(0, outing.seconds)) - creditedOutingSeconds(prior);

  return credited * LOCOMOTION_RATE[outing.locomotion];
}

/**
 * Effort seconds → XP, and the two bounds every entry point shares.
 *
 * The floor is "no session is wasted", and it stops applying to an outing once the day has
 * already paid for one. It has to: at 1.25 XP a minute a one-minute walk floors to 10, an
 * eightfold uplift, and 120 of them paid 1200 XP against 450 for the same two hours in one
 * piece. The day decay above is only a rule while the floor cannot be used to walk around it.
 * A workout still floors, whatever the hero did outside first.
 */
function boundXp(xp: number, floored: boolean): number {
  const rounded = Math.round(Math.max(0, xp));
  return Math.min(MAX_SESSION_XP, floored ? Math.max(XP_FLOOR, rounded) : rounded);
}

/** Weighted rep-effort seconds → XP, at the hero's chosen level. */
function repXp(effortSeconds: number, userLevel: DifficultyCode): number {
  return (Math.max(0, effortSeconds) / SECONDS_PER_REP_EQUIVALENT) * LEVEL_MULTIPLIER[userLevel];
}

export function computeSessionXp({
  sets,
  effortCeilingSeconds,
  outing = null,
  priorOutingSecondsToday = 0,
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

  // Two legs, two units of judgement, one total. The sets are worth what the movement was worth
  // per second; the ground is worth what the way out is worth per second. Neither converts into
  // the other, and a mixed quest is simply a session that has both.
  const outingSeconds = outing === null ? 0 : outingEffortSeconds(outing, priorOutingSecondsToday);

  return boundXp(
    repXp(credited, userLevel) + outingSeconds / SECONDS_PER_REP_EQUIVALENT,
    outing === null || priorOutingSecondsToday <= 0,
  );
}

export type EstimateQuestXpInput = {
  rounds: number;
  exercises: Array<{
    exercise: XpSet["exercise"] & Pick<Exercise, "locomotion">;
    target: Target;
  }>;
};

/**
 * What a quest is worth before it is run — the number the gallery and the quest screen advertise.
 *
 * Two sentences, because a quest is two kinds of thing. For sets it is "up to": a hero who beats
 * every target by the full allowance, which is the ceiling the tag quotes. For ground there is
 * no ceiling to quote, so it is what the suggested duration pays and walking further pays more,
 * which is why the outing tag says `+N XP` and not `up to +N XP`.
 *
 * It reads targets only, so it no longer moves when the rest slider does. That tag was how the
 * rest exploit was found in the first place: dragging rest to 300s advertised +2940 XP, and the
 * screen was telling the truth about a formula that should never have paid for waiting.
 *
 * No effort ceiling and no prior day — an estimate has no clock yet and no history, so it quotes
 * the first hour's rate. A hero who has already walked today earns less than the tag says, which
 * is the one direction an estimate is allowed to be wrong in.
 */
export function estimateQuestXp(quest: EstimateQuestXpInput, userLevel: DifficultyCode): number {
  const rounds = Math.max(1, Math.round(quest.rounds));
  const sets = quest.exercises.filter((qex) => qex.exercise.style !== NON_REP_STYLE);
  const ground = quest.exercises.filter((qex) => qex.exercise.style === NON_REP_STYLE);

  const perRound = sets.reduce(
    (sum, qex) =>
      sum +
      setWeightedSeconds({
        exercise: qex.exercise,
        target: qex.target,
        // The allowance is what "up to" means: a hero who beats the target by a quarter is paid
        // in full, and that is the ceiling this number quotes.
        result: { type: qex.target.type, value: qex.target.value * OVERSHOOT_ALLOWANCE },
      }),
    0,
  );

  const locomotion = cheapestLocomotion(ground.map((qex) => qex.exercise));
  const outing: OutingLeg | null =
    locomotion === null
      ? null
      : {
          seconds: rounds * ground.reduce((sum, qex) => sum + estimateSlotSeconds(qex), 0),
          locomotion,
        };

  return boundXp(
    repXp(rounds * perRound, userLevel) +
      (outing === null ? 0 : outingEffortSeconds(outing, 0) / SECONDS_PER_REP_EQUIVALENT),
    true,
  );
}

/**
 * A locomotion slot's suggested seconds. A time target says them outright; a rep target on a
 * movement that covers ground is a shape nothing seeds and the editor cannot make, so it falls
 * back to the catalogue's tempo the way every other estimate does.
 */
function estimateSlotSeconds(qex: { exercise: XpSet["exercise"]; target: Target }): number {
  return Math.max(0, estimateExerciseSeconds(qex.exercise, qex.target));
}

/**
 * What a minute of this way out is worth, in XP, before the day's decay — the tariff an outing
 * shows where a quest shows "up to +N XP".
 *
 * A quest can quote a maximum because its targets bound it. An outing has none: it is paid for
 * the ground actually covered, so what there is to advertise is a price per minute, and walking
 * further is worth more. The first hour's price, which is the one a hero who has not been out
 * today will get.
 */
export function outingXpPerMinute(locomotion: Locomotion): number {
  return (60 * LOCOMOTION_RATE[locomotion]) / SECONDS_PER_REP_EQUIVALENT;
}
