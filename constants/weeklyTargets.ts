/**
 * The weekly quota and the oath's offered targets. In `constants/` so `app/oath.tsx` can read
 * them without `db/streaks.ts` pulling `db/client.ts` (SQLite) into the screen; `db/` importing
 * `constants/` is the direction that stays acyclic (see `constants/buildingLevels.ts`).
 */

/**
 * The flame is a consistency streak, not an attendance streak.
 *
 * It used to count consecutive training days, which put the app at war with itself: the coach
 * nudges a rest day after 5 days in a row (db/restSuggestions.ts) while an achievement asked for
 * 100 days in a row, and the research is explicit that breaking a strict streak pushes people to
 * quit rather than restart. A day now keeps the flame lit if the hero has trained enough
 * *recently* — rest days cost nothing, and the flame measures the habit instead of the grind.
 *
 * A day is lit when the trailing 7-day window holds at least `quota` sessions, **or** when the
 * week before it did. That second clause is the forgiveness: one blank week never breaks a
 * flame, two consecutive blank weeks put it out.
 *
 * Out is not gone. An unlit day no longer resets the count: it sleeps ("en veille", `dormant` in
 * `db/streaks.ts`) while the hero comes back at all, and only `FLAME_DORMANT_DAYS` out in a row
 * with no session wipe it. Any session that counts restarts that clock, lit or not, and the days
 * of the gap are never counted, so 100 days of flame stay 100 lit days.
 *
 * The quota is the hero's own promise. Swearing a `weekly_sessions` oath raises the bar the
 * flame is measured against; without one it sits at the WHO baseline of two sessions a week, so
 * someone who has sworn nothing still has a flame worth keeping.
 */
export const DEFAULT_WEEKLY_QUOTA = 2;

/**
 * Sessions per week the oath form offers. None may sit under `DEFAULT_WEEKLY_QUOTA`: the crest
 * (db/crest.ts) measures its longest flame at that quota, so a lower oath would read "flame 0"
 * for a hero whose flame burned. Two is a real answer, not a lesser one.
 */
export const WEEKLY_TARGETS = [2, 3, 4] as const;

/**
 * How many sessions make a week count, when an oath of the `weekly_sessions` metric names no
 * target. It must be one of `WEEKLY_TARGETS`, or the oath screen opens with no chip selected.
 */
export const DEFAULT_WEEKLY_TARGET = 3;

/**
 * The hero's flame quota, from the stored oath (the `oath` preference, or nothing): the bar the
 * flame is measured against and the goal a challenge freezes when it starts. Sessions per week,
 * never reps: the two heroes of a challenge are held to their own promise, not to each other's
 * volume. Any oath shape but `weekly_sessions` leaves the baseline, a mangled one too.
 */
export function weeklyGoal(oathJson: string | null | undefined): number {
  if (!oathJson) return DEFAULT_WEEKLY_QUOTA;
  try {
    const parsed: unknown = JSON.parse(oathJson);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_WEEKLY_QUOTA;
    const { metric, weeklyTarget } = parsed as { metric?: string; weeklyTarget?: number };
    if (metric !== "weekly_sessions" || typeof weeklyTarget !== "number") {
      return DEFAULT_WEEKLY_QUOTA;
    }
    return Math.max(1, Math.floor(weeklyTarget));
  } catch {
    // Not reported: the flame has always read a mangled oath as no oath, and has an answer for it.
    return DEFAULT_WEEKLY_QUOTA;
  }
}
