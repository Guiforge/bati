import { startOfDay } from "date-fns";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { dayKey } from "./dates";

const { completedQuest, userPreferences } = schema;

// Keys for streak cache in preferences
const STREAK_CURRENT_KEY = "streak_current";
const STREAK_BEST_KEY = "streak_best";
const STREAK_LAST_DATE_KEY = "streak_last_date";
const STREAK_CACHED_ON_KEY = "streak_cached_on";
const STREAK_QUOTA_KEY = "streak_quota";

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
 * flame, two consecutive blank weeks do.
 *
 * The quota is the hero's own promise. Swearing a `weekly_sessions` oath raises the bar the
 * flame is measured against; without one it sits at the WHO baseline of two sessions a week, so
 * someone who has sworn nothing still has a flame worth keeping.
 */
export const DEFAULT_WEEKLY_QUOTA = 2;

const WINDOW_DAYS = 7;

export type StreakInfo = {
  current: number;
  best: number;
  isActive: boolean;
  lastWorkoutDate: string | null;
};

function shiftDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * The flame's bar, read straight from the stored oath rather than through `db/oaths.ts`: oaths
 * already import this module for the `streak` metric, and a cycle between the two is not worth
 * the tidiness. Any oath shape other than `weekly_sessions` leaves the baseline alone.
 */
async function getWeeklyQuota(): Promise<number> {
  const rows = await db
    .select({ value: userPreferences.value })
    .from(userPreferences)
    .where(sql`${userPreferences.key} = 'oath'`)
    .limit(1);

  if (rows.length === 0) return DEFAULT_WEEKLY_QUOTA;

  try {
    const parsed: unknown = JSON.parse(rows[0].value);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_WEEKLY_QUOTA;

    const { metric, weeklyTarget } = parsed as { metric?: string; weeklyTarget?: number };
    if (metric !== "weekly_sessions" || typeof weeklyTarget !== "number") {
      return DEFAULT_WEEKLY_QUOTA;
    }

    return Math.max(1, Math.floor(weeklyTarget));
  } catch {
    return DEFAULT_WEEKLY_QUOTA;
  }
}

/** Sessions per day, keyed by local midnight — the unit every window below counts in. */
function groupByDay(performedAt: Date[]): Map<number, number> {
  const byDay = new Map<number, number>();

  for (const date of performedAt) {
    const key = startOfDay(date).getTime();
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return byDay;
}

function countInWindow(byDay: Map<number, number>, endDay: Date, lengthDays: number): number {
  let total = 0;
  let cursor = endDay;

  for (let i = 0; i < lengthDays; i++) {
    total += byDay.get(cursor.getTime()) ?? 0;
    cursor = shiftDays(cursor, -1);
  }

  return total;
}

/** Is the flame lit on this day? Either this week is over quota, or the week before it was. */
function isLit(byDay: Map<number, number>, day: Date, quota: number): boolean {
  if (countInWindow(byDay, day, WINDOW_DAYS) >= quota) return true;
  return countInWindow(byDay, shiftDays(day, -WINDOW_DAYS), WINDOW_DAYS) >= quota;
}

export function calculateStreakFromSessions(
  performedAt: Date[],
  quota: number,
  now: Date = new Date(),
): { current: number; best: number; isActive: boolean } {
  if (performedAt.length === 0) {
    return { current: 0, best: 0, isActive: false };
  }

  const byDay = groupByDay(performedAt);
  const today = startOfDay(now);
  const firstDay = startOfDay(new Date(Math.min(...performedAt.map((d) => d.getTime()))));

  // Current: walk back from today for as long as the flame stayed lit.
  let current = 0;
  for (let day = today; isLit(byDay, day, quota); day = shiftDays(day, -1)) {
    current++;
    // Nothing before the first session can be lit, so the walk always terminates.
    if (day.getTime() <= firstDay.getTime()) break;
  }

  // Best: one pass over every day since the hero's first session.
  let best = 0;
  let run = 0;
  for (let day = firstDay; day.getTime() <= today.getTime(); day = shiftDays(day, 1)) {
    run = isLit(byDay, day, quota) ? run + 1 : 0;
    best = Math.max(best, run);
  }

  return { current, best, isActive: current > 0 };
}

/**
 * Get cached streak info from preferences. The cache is only trusted for the day it was written
 * and the quota it was written under: the flame now moves on days with no session at all, and
 * swearing an oath changes the bar it is measured against.
 */
export async function getCachedStreak(): Promise<StreakInfo | null> {
  const rows = await db.select().from(userPreferences);

  const cache: Record<string, string> = {};
  for (const row of rows) {
    cache[row.key] = row.value;
  }

  if (!cache[STREAK_CURRENT_KEY] || !cache[STREAK_BEST_KEY] || !cache[STREAK_CACHED_ON_KEY]) {
    return null;
  }
  if (cache[STREAK_CACHED_ON_KEY] !== dayKey(new Date())) return null;
  if (cache[STREAK_QUOTA_KEY] !== String(await getWeeklyQuota())) return null;

  const current = Number.parseInt(cache[STREAK_CURRENT_KEY], 10) || 0;

  return {
    current,
    best: Number.parseInt(cache[STREAK_BEST_KEY], 10) || 0,
    isActive: current > 0,
    lastWorkoutDate: cache[STREAK_LAST_DATE_KEY] || null,
  };
}

async function saveStreakCache(
  current: number,
  best: number,
  lastDate: string | null,
  quota: number,
): Promise<void> {
  await db
    .insert(userPreferences)
    .values([
      { key: STREAK_CURRENT_KEY, value: String(current) },
      { key: STREAK_BEST_KEY, value: String(best) },
      { key: STREAK_LAST_DATE_KEY, value: lastDate ?? "" },
      { key: STREAK_CACHED_ON_KEY, value: dayKey(new Date()) },
      { key: STREAK_QUOTA_KEY, value: String(quota) },
    ])
    .onConflictDoUpdate({
      target: userPreferences.key,
      set: { value: sql`excluded.value` },
    });
}

/**
 * Calculate streak from database and update cache
 */
export async function calculateAndCacheStreak(): Promise<StreakInfo> {
  const [quota, rows] = await Promise.all([
    getWeeklyQuota(),
    db
      .select({ performedAt: completedQuest.performedAt })
      .from(completedQuest)
      .orderBy(desc(completedQuest.performedAt)),
  ]);

  if (rows.length === 0) {
    return { current: 0, best: 0, isActive: false, lastWorkoutDate: null };
  }

  const performedAt = rows.map((r) => r.performedAt);
  const result = calculateStreakFromSessions(performedAt, quota);
  const lastDate = dayKey(new Date(Math.max(...performedAt.map((d) => d.getTime()))));

  await saveStreakCache(result.current, result.best, lastDate, quota);

  return { ...result, lastWorkoutDate: lastDate };
}

// In-process memo: one journal open used to run this pipeline (prefs full scan + quota
// query, or the whole per-day walk) 3-4 times, once per stats card. Keyed on the day so
// it can't serve yesterday's flame after midnight.
let streakMemo: { day: string; promise: Promise<StreakInfo> } | null = null;

/** Drop the in-process memo — after a session write or an oath change. */
export function invalidateStreakInfo(): void {
  streakMemo = null;
}

/**
 * Get streak info - use cache if valid, otherwise recalculate
 */
export function getStreakInfo(): Promise<StreakInfo> {
  const today = dayKey(new Date());
  if (!streakMemo || streakMemo.day !== today) {
    const promise = (async () => (await getCachedStreak()) ?? (await calculateAndCacheStreak()))();
    promise.catch(() => {
      // don't cache a failure - let the next caller retry
      if (streakMemo?.promise === promise) streakMemo = null;
    });
    streakMemo = { day: today, promise };
  }
  return streakMemo.promise;
}

/**
 * Update streak after completing a session
 * Call this after saving a session to update the cache
 */
export function updateStreakAfterSession(): Promise<StreakInfo> {
  const promise = calculateAndCacheStreak();
  streakMemo = { day: dayKey(new Date()), promise };
  promise.catch(() => {
    if (streakMemo?.promise === promise) streakMemo = null;
  });
  return promise;
}
