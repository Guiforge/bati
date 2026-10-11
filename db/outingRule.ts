/**
 * What a hero's outings say about the next one, with no database in it.
 *
 * Apart from `db/outingHabit.ts`, which reads the journal, so that every reader of the rule calls
 * the rule itself: the goal sheet, the slot resolver, and the tests of the screens around them,
 * which stand in for the journal read and have no business standing in for this.
 */

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
 *
 * `longestSeconds` is that same longest outing's month in moving time, for the duration a run is
 * proposed at. Both count only outings of at least ten minutes.
 */
export type OutingHabit = {
  usual: { metres: number; seconds: number } | null;
  longestM: number | null;
  longestSeconds: number | null;
};

/** The single-run ceiling, as a factor of the longest of the month. */
export const LONGEST_RUN_CEILING = 1.1;

/** What a hero with no recent run is offered: walk and run mixed, walking whenever talking stops. */
export const WALK_RUN_SECONDS = 20 * 60;

export const NO_HABIT: OutingHabit = { usual: null, longestM: null, longestSeconds: null };

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
  // `?? null`: a habit restored from a session saved before the field existed has none.
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
  longestSeconds: number | null,
): OutingHabit {
  return {
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
}
