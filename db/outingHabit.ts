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
};

export const NO_HABIT: OutingHabit = { usual: null, longestM: null };

/** The single-run ceiling, as a factor of the longest of the month. */
export const LONGEST_RUN_CEILING = 1.1;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

export function habitOf(
  lastThree: { metres: number; seconds: number }[],
  longestM: number | null,
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
  };
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
      .select({ metres: max(completedQuest.leaguesM) })
      .from(completedQuest)
      .where(and(ofKind, gte(completedQuest.performedAt, since))),
  ]);
  return habitOf(
    recent.map((r) => ({ metres: r.metres ?? 0, seconds: r.seconds ?? 0 })),
    longest?.metres ?? null,
  );
}
