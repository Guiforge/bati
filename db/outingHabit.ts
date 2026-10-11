import { and, desc, eq, gte, isNotNull, max } from "drizzle-orm";
import { db, schema } from "./client";
import { OUTING_COUNTS_AFTER_SECONDS } from "./completed";
import type { Locomotion } from "./schema";

const { completedQuest } = schema;

/** How far back "the longest run of the month" looks. */
const LONGEST_WINDOW_DAYS = 30;

/**
 * What the goal sheet proposes before the presets: the hero's own habit, and the line not to jump.
 *
 * `usual` is the median of the last three outings of this kind, distance and moving time taken
 * separately. A median, so one lost-in-the-woods afternoon does not become next week's goal. It
 * stays `null` under three outings: two is not a habit, and day one gets the presets alone.
 *
 * `longestM` is the longest of the last thirty days. Frandsen, Nielsen et al. (BJSM 2025, 5205
 * Garmin runners over 18 months) found overuse injuries climb once a single run exceeds that by
 * more than 10%, whatever the weekly total did. So the 10% is shown as a ceiling, never proposed
 * as a target: proposed every time, it doubles a distance in seven outings. See
 * docs/designs/outing-doors.md § Objectifs par type de sortie.
 */
export type OutingHabit = {
  usual: { metres: number; seconds: number } | null;
  longestM: number | null;
  /**
   * The longest of the same thirty days in moving time, for the duration a run is proposed at.
   * Optional so a caller that only reads distances need not name it; absent reads as "no run".
   */
  longestSeconds?: number | null;
  /**
   * What a run is proposed at from this habit (`proposedRunSeconds`), computed with it so every
   * reader of the habit reads the rule's own answer instead of deriving it again. Optional for
   * the same reason as `longestSeconds`.
   */
  proposal?: { seconds: number; walkRun: boolean };
};

export const NO_HABIT: OutingHabit = {
  usual: null,
  longestM: null,
  longestSeconds: null,
  proposal: { seconds: 20 * 60, walkRun: true },
};

/** The single-run ceiling, as a factor of the longest of the month. */
export const LONGEST_RUN_CEILING = 1.1;

/** What a hero with no recent run is offered: walk and run mixed, walking whenever talking stops. */
export const WALK_RUN_SECONDS = 20 * 60;

/**
 * How long a run is proposed at, from the hero's own month. A written rule, in the order it is
 * read:
 * - no run in the last thirty days: the walk-run. The seeded band proposed thirty minutes of
 *   running to someone who had never run, which is week eight of a couch-to-5K on day one;
 * - a habit (three runs): the usual one, capped at 110 % of the longest of the month;
 * - one or two runs: the longest of the month as it is, with no increase;
 * - and whatever comes out under twenty minutes is the walk-run instead, never a short run
 *   stretched to twenty.
 *
 * The ceiling is a bound on the usual, never the proposal itself (see `OutingHabit`). It bounds
 * what the app proposes and nothing else: the stepper stays free and a saved goal wins.
 */
export function proposedRunSeconds(habit: OutingHabit): { seconds: number; walkRun: boolean } {
  const longest = habit.longestSeconds ?? null;
  const running =
    longest === null
      ? 0
      : habit.usual === null
        ? longest
        : Math.min(habit.usual.seconds, longest * LONGEST_RUN_CEILING);
  // Whole minutes, rounded down: a duration is read as "27 min", and up would cross the ceiling.
  const seconds = Math.floor(running / 60) * 60;
  return seconds < WALK_RUN_SECONDS
    ? { seconds: WALK_RUN_SECONDS, walkRun: true }
    : { seconds, walkRun: false };
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

export function habitOf(
  lastThree: { metres: number; seconds: number }[],
  longestM: number | null,
  longestSeconds: number | null = null,
): OutingHabit {
  const habit = {
    usual:
      lastThree.length < 3
        ? null
        : {
            metres: median(lastThree.map((o) => o.metres)),
            seconds: median(lastThree.map((o) => o.seconds)),
          },
    longestM: longestM !== null && longestM > 0 ? longestM : null,
    longestSeconds: longestSeconds !== null && longestSeconds > 0 ? longestSeconds : null,
  };
  return { ...habit, proposal: proposedRunSeconds(habit) };
}

export async function getOutingHabit(
  locomotion: Locomotion,
  now = new Date(),
): Promise<OutingHabit> {
  const since = new Date(now.getTime() - LONGEST_WINDOW_DAYS * 86_400_000);
  const ofKind = and(
    eq(completedQuest.outing, locomotion),
    isNotNull(completedQuest.leaguesM),
    isNotNull(completedQuest.movingSeconds),
  );
  const [recent, [longest]] = await Promise.all([
    db
      .select({ metres: completedQuest.leaguesM, seconds: completedQuest.movingSeconds })
      .from(completedQuest)
      // Ten minutes, the same floor as a walk that counts: a two-minute test is not a habit.
      .where(and(ofKind, gte(completedQuest.movingSeconds, OUTING_COUNTS_AFTER_SECONDS)))
      .orderBy(desc(completedQuest.performedAt))
      .limit(3),
    db
      .select({
        metres: max(completedQuest.leaguesM),
        seconds: max(completedQuest.movingSeconds),
      })
      .from(completedQuest)
      // The same ten-minute floor as the habit: an outing given up after three minutes is not
      // "the longest of the month", and read as one it capped the next proposal at 3 min 18.
      .where(
        and(
          ofKind,
          gte(completedQuest.performedAt, since),
          gte(completedQuest.movingSeconds, OUTING_COUNTS_AFTER_SECONDS),
        ),
      ),
  ]);
  return habitOf(
    recent.map((r) => ({ metres: r.metres ?? 0, seconds: r.seconds ?? 0 })),
    longest?.metres ?? null,
    longest?.seconds ?? null,
  );
}
