import type { DifficultyCode, QuestTargetType } from "./schema";

// A plain object rather than an `enum`: `erasableSyntaxOnly` keeps every TS construct strippable
// by tools that only erase types (Metro's Babel handles enums, oxc/Node type-stripping do not).
// The values are the very codes the schema stores, so `Difficulty` the type *is* `DifficultyCode`
// — no `toDifficultyEnum()` conversion at the DB boundary.
export const Difficulty = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard",
} as const satisfies Record<string, DifficultyCode>;
export type Difficulty = DifficultyCode;

export type UserLevel = Difficulty;

export type Target = {
  type: QuestTargetType;
  value: number;
};

/** What a slot starts at when nothing better is known — the quest editor's defaults too. */
export const DEFAULT_TARGET_VALUE: Record<QuestTargetType, number> = { reps: 10, time: 30 };

/**
 * What a target, a round count and a rest may be, and the clamp every writer runs them through.
 *
 * Here rather than in `questConfig`, which is where they used to live, because `db/quests` needs
 * them to write a quest and `questConfig` needs `db/quests` to read one: a cycle that fallow
 * names and that this repo has already been bitten by. `store-session.test.ts` failed to load
 * with "Cannot read properties of undefined (reading 'TARGET_RANGE')" - the two modules were
 * initialising each other, and whichever lost the race saw the other as `undefined`. Nothing in
 * this file imports anything that could close a loop; that is the point of it.
 */
/** What a rep target may be. Seconds have their own ceiling below. */
export const TARGET_RANGE = { min: 1, max: 999 };

export const ROUNDS_RANGE = { min: 1, max: 10 };
export const REST_RANGE = { min: 0, max: 300 };

/**
 * Exported because the ranges above were UI-only for a long time: the steppers refused to go past
 * them and every writer below `db/` took whatever it was handed. A quest saved by an editor that
 * skipped its own stepper — or by a future screen that forgets one — reached SQLite unbounded, and
 * the schema has no CHECK on any of these columns. Writers clamp with this now.
 */
export function clampToRange(value: number, range: { min: number; max: number }): number {
  if (!Number.isFinite(value)) return range.min;
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/**
 * A time target's ceiling, and it is not `TARGET_RANGE.max`.
 *
 * 999 is a generous rep count and sixteen minutes thirty-nine. Every seeded expedition targets
 * more than that at hard (`drizzle/0042_three_doors_out.sql` reaches 1200 s), so the shared range
 * silently shortened the quest on the way into SQLite, and the stepper could not be pushed back
 * up: an hour-long walk was one edit away and the edit did not exist.
 *
 * It is no longer what a *set* may record. `clampResultValue` in `stores/session.ts` bounds an
 * expedition by `OUTING_RESULT_MAX_SECONDS` instead, because an hour is a hold's ceiling and a
 * two-hour ride was being written down as one. This stays the ceiling of a target a hero can
 * *set*, which is a different question and still answered here.
 */
export const TIME_TARGET_MAX = 3600;

/**
 * A distance goal, in metres. Not a `QuestTargetType`: `0000_schema.sql` holds `targetType` and
 * `resultType` to `('reps','time')` with a CHECK, and a walk's distance is already written once,
 * on `completed_sessions.leaguesM`. So the goal lives in the hero's quest config and the session
 * still records seconds. See docs/designs/expeditions.md, "After the audit".
 *
 * ponytail: a seeded quest cannot ship a distance goal; if content ever needs one, that is the
 * table rebuild, not a fourth target type bolted on here.
 */
export const DISTANCE_GOAL_RANGE = { min: 500, max: 200_000 };
// The step and the default that used to sit here belonged to a stepper: 500 m at a time, starting
// at 3 km, which is how 21.1 km came to be off the grid entirely. The goal sheet offers the
// distances people actually name and a keyboard for the rest, so neither has a reader left.

/** What a target may be, by what it counts. Reps and seconds are not the same magnitude. */
export function targetRangeFor(type: QuestTargetType): { min: number; max: number } {
  return type === "time" ? { min: TARGET_RANGE.min, max: TIME_TARGET_MAX } : TARGET_RANGE;
}

/**
 * The target a movement actually runs in when it lands in a slot written for another one.
 *
 * Every substitution — a hero swap, or the easier rung `getQuestById` serves — keeps the slot's
 * target and replaces the movement. Fine within a unit; across one it produced "22 reps of
 * Superman", and every consumer of the row written from that slot (records, volume, XP, ladder
 * progression) trusted it. So the movement's own `measure` outranks the slot: a unit flip lands
 * on that unit's default at the hero's level. `null` — a hero movement that never said — trusts
 * the slot, as before.
 *
 * ponytail: a flipped unit gets the level-scaled default, not the movement's seeded band — add
 * baseMin/baseMax on `exercises` if 30 s of Wall Sit for a Squat slot turns out to be wrong.
 */
export function retargetForMovement(
  target: Target,
  movement: { measure: QuestTargetType | null },
  userLevel: UserLevel,
): Target {
  if (movement.measure === null || movement.measure === target.type) return target;
  const value = DEFAULT_TARGET_VALUE[movement.measure];
  return generateTarget({ type: movement.measure, min: value, max: value }, userLevel);
}

/**
 * A target as the hero reads it. Lives here rather than on the quest screen because the session
 * shows the same numbers — a ghost line saying "18" has to use the same words as the target above
 * it, and two copies of this drift (see `localizedTitle()` in AGENTS.md, "one source per value").
 *
 * "reps" reads fine in French too — see the `reps`/`config_reps` locale keys, which are the same
 * word in both languages — so there is no per-language branch here.
 */
export function formatTarget(target: Target): string {
  if (target.type === "time") return `${target.value}s`;
  return `${target.value} reps`;
}

/**
 * How much of a quest's prescribed range the hero actually gets. Also what a boss's HP pool is
 * scaled by — damage *is* the work you did, so a pool tuned at one level is unreachable at
 * another. One multiplier, both sides. See `db/bossFights.ts`.
 */
export const USER_LEVEL_MULTIPLIER: Record<DifficultyCode, number> = {
  easy: 0.75,
  medium: 1.0,
  hard: 1.25,
};

/**
 * Where a hold is prescribed from, when the hero has a record for it.
 *
 * Isometrics are the one place the research gives a formula instead of a range: find the max
 * hold, then work at 60-75% of it. Holding to failure every set is named as *the* classic
 * mistake — it buries the hero in fatigue and breaks the exact position the hold trains. See
 * `docs/content/workout-best-practices.md`, "Holds are prescribed submaximally".
 *
 * 0.67 is the middle of that window, not a tuned constant.
 */
const HOLD_FRACTION_OF_MAX = 0.67;

/**
 * @param personalBestSeconds The hero's longest logged hold for this exercise, when one exists.
 *   Ignored for rep targets — reps have no equivalent rule, and 67% of a rep PR is just a
 *   smaller set. The function stays pure and synchronous: the caller reads the journal.
 */
export function generateTarget(
  base: { type: QuestTargetType; min: number; max: number },
  userLevel: UserLevel,
  personalBestSeconds?: number | null,
): Target {
  const min = Math.min(base.min, base.max);
  const max = Math.max(base.min, base.max);
  const m = USER_LEVEL_MULTIPLIER[userLevel];

  const scaledMin = Math.max(1, Math.round(min * m));
  const scaledMax = Math.max(1, Math.round(max * m));

  // Time targets land on the same five-second grid the stepper moves in. Without it the
  // generator produced values the hero could not have chosen and could not return to - a
  // 13-minute outing was prescribed as 781 s, shown as "13 min 1s", and one tap on the stepper
  // moved it to 786. Reps are already whole and are left alone.
  const grid = (value: number) =>
    base.type === "time" ? Math.max(1, Math.round(value / 5) * 5) : value;

  if (base.type === "time" && personalBestSeconds != null && personalBestSeconds > 0) {
    // Clamped to the quest's own window on both ends. Down, because `resultValue` records what
    // the hero *did*, which is usually the target they were given rather than their ceiling —
    // an unclamped 67% would ratchet the prescription down a little every session. Up, because
    // one heroic hold should not turn a warm quest into a ladder nobody finishes.
    const fromRecord = Math.round(personalBestSeconds * HOLD_FRACTION_OF_MAX);
    const value = Math.min(scaledMax, Math.max(scaledMin, fromRecord));
    return { type: base.type, value: grid(value) };
  }

  const value = Math.max(1, Math.round((scaledMin + scaledMax) / 2));
  return { type: base.type, value: grid(value) };
}
