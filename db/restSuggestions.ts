import { startOfDay, subDays } from "date-fns";
import { and, gte } from "drizzle-orm";
import { db, schema } from "./client";
import { isWorkout } from "./completed";
import { dayKey } from "./dates";

const { completedQuest } = schema;

export type RestSuggestion = {
  shouldRest: boolean;
  reason: "overtraining" | "consecutive_days" | "high_volume" | "deload" | "none";
  daysInARow: number;
  recentSessionCount: number;
  /** Only set by the `deload` reason: how many heavy weeks are behind this suggestion. */
  heavyWeeks?: number;
};

/** A week with this many sessions counts as heavy for the deload rule. */
const HEAVY_WEEK_SESSIONS = 4;

/** Consecutive heavy weeks before an easier one is suggested. */
const HEAVY_WEEKS_BEFORE_DELOAD = 4;

/** How far back the advice looks: the deload rule's five weeks, which cover the acute week too. */
export const REST_LOOKBACK_DAYS = (HEAVY_WEEKS_BEFORE_DELOAD + 1) * 7;

/**
 * Consecutive heavy weeks ending at `now`.
 *
 * The other rules in this file are acute — days in a row, sessions this week. None of them can
 * see fatigue accumulating across a month, which is the window the deload guidance is about
 * (docs/raw/bodyweight-app-research.md §2). This is the smallest thing that can: count back in
 * 7-day buckets and stop at the first week that was not heavy.
 */
function countHeavyWeeks(performedAt: readonly Date[], now: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const perWeek = new Map<number, number>();
  for (const at of performedAt) {
    const weeksAgo = Math.floor((now.getTime() - at.getTime()) / msPerWeek);
    perWeek.set(weeksAgo, (perWeek.get(weeksAgo) ?? 0) + 1);
  }

  let heavy = 0;
  for (let weeksAgo = 0; weeksAgo <= HEAVY_WEEKS_BEFORE_DELOAD; weeksAgo++) {
    if ((perWeek.get(weeksAgo) ?? 0) < HEAVY_WEEK_SESSIONS) break;
    heavy++;
  }

  return heavy;
}

/** Training days in a row, ending on `now`'s day or the one before, from a set of day keys. */
function daysInARow(days: ReadonlySet<string>, now: Date): number {
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = subDays(cursor, 1);

  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = subDays(cursor, 1);
  }
  return count;
}

/**
 * The rest advice for the moment `now`, from the workouts (`isWorkout`, never a walk) logged in the
 * `REST_LOOKBACK_DAYS` before it. Pure, so the reminders can ask it about every day of their
 * horizon, and so there is one rule whoever asks.
 *
 * Overtraining indicators:
 * - 10 or more sessions in the last 7 days (very high volume)
 * - 5 or more consecutive training days, ending today or yesterday
 * - 6 or more sessions in the last 7 days (high volume warning)
 *
 * Days are counted with `dayKey` on both sides, never by parsing a `yyyy-MM-dd` back: JavaScript
 * reads that as UTC midnight, which west of Greenwich is the evening before, and a run of five days
 * ending yesterday counted as none there.
 */
export function restSuggestionAt(performedAt: readonly Date[], now: Date): RestSuggestion {
  const past = performedAt.filter((at) => at.getTime() <= now.getTime());
  const weekAgo = subDays(now, 7);
  const recent = past.filter((at) => at.getTime() >= weekAgo.getTime());

  if (recent.length === 0) {
    return { shouldRest: false, reason: "none", daysInARow: 0, recentSessionCount: 0 };
  }

  const consecutive = daysInARow(new Set(recent.map(dayKey)), now);
  const counts = { daysInARow: consecutive, recentSessionCount: recent.length };

  if (recent.length >= 10) return { shouldRest: true, reason: "high_volume", ...counts };
  if (consecutive >= 5) return { shouldRest: true, reason: "consecutive_days", ...counts };
  if (recent.length >= 6) return { shouldRest: true, reason: "overtraining", ...counts };

  // Nothing acute — but fatigue may still be piling up across weeks.
  const heavyWeeks = countHeavyWeeks(past, now);
  if (heavyWeeks >= HEAVY_WEEKS_BEFORE_DELOAD) {
    return { shouldRest: true, reason: "deload", ...counts, heavyWeeks };
  }

  return { shouldRest: false, reason: "none", ...counts };
}

/** Today's rest advice, read from the journal. */
export async function getRestSuggestion(): Promise<RestSuggestion> {
  const now = new Date();
  const rows = await db
    .select({ performedAt: completedQuest.performedAt })
    .from(completedQuest)
    // Training only. This counts days in a row and sessions per week to decide the hero is
    // overreaching, and a daily walk is the opposite of that: it read as seven hard days.
    .where(and(gte(completedQuest.performedAt, subDays(now, REST_LOOKBACK_DAYS)), isWorkout()));

  return restSuggestionAt(
    rows.map((r) => r.performedAt),
    now,
  );
}
