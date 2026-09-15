import { startOfDay } from "date-fns";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { countsAsSession } from "./completed";
import { dayKey } from "./dates";

const { completedQuest, userPreferences } = schema;

// Keys for streak cache in preferences
const STREAK_CURRENT_KEY = "streak_current";
const STREAK_BEST_KEY = "streak_best";
const STREAK_LAST_DATE_KEY = "streak_last_date";
const STREAK_CACHED_ON_KEY = "streak_cached_on";
const STREAK_QUOTA_KEY = "streak_quota";
/** Sessions in the trailing week, cached beside the flame it explains (added 2026-09-11). */
const STREAK_WINDOW_KEY = "streak_window";

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
  /**
   * Sessions in the trailing seven days, and the quota they are measured against.
   *
   * The number that decides whether the flame is lit tomorrow, which the journal's card could
   * not say: it printed "1092, best 1092", a number compared to itself, and never the bar. Both
   * are already in hand wherever the streak is computed.
   */
  inWindow: number;
  quota: number;
};

export type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Matches the flame table in docs/gameplay/progression.md. The unit is days the flame stayed
// lit (see the docstring above), not days trained in a row — rest days count. Lives here rather
// than in db/village.ts so the headless widget task doesn't drag that 600-line module in for a
// six-line pure function.
export function getFlameLevel(streakDays: number): FlameLevel {
  if (streakDays >= 100) return 5;
  if (streakDays >= 30) return 4;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  if (streakDays >= 3) return 1;
  return 0;
}

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

  const row = rows[0];
  if (!row) return DEFAULT_WEEKLY_QUOTA;

  try {
    const parsed: unknown = JSON.parse(row.value);
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

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far past today the flame is read, for "lit until". */
const LIT_FORECAST_DAYS = WINDOW_DAYS * 2;

/**
 * Every day from the first session to a fortnight past today, as a day index and a running total
 * of sessions, so any window is one subtraction.
 *
 * The flame used to walk a `Date` per day and count each window by stepping back seven more: at
 * five years of journal that was some fifty thousand `Date`s on the JS thread every time the
 * Journal opened (perf audit, 2026-09-15). Day indices are rounded, not floored, because a day
 * that crosses a clock change is 23 or 25 hours long.
 */
function flameTimeline(performedAt: Date[], quota: number, now: Date) {
  let first = Number.POSITIVE_INFINITY;
  for (const date of performedAt) first = Math.min(first, date.getTime());
  const firstDay = startOfDay(new Date(first)).getTime();
  const indexOf = (date: Date) => Math.round((startOfDay(date).getTime() - firstDay) / DAY_MS);

  const today = indexOf(now);
  const length = Math.max(today, 0) + LIT_FORECAST_DAYS + 1;
  const totals = new Int32Array(length + 1);
  for (const date of performedAt) {
    const day = indexOf(date);
    if (day < length) totals[day + 1] = (totals[day + 1] ?? 0) + 1;
  }
  for (let i = 1; i <= length; i++) totals[i] = (totals[i] ?? 0) + (totals[i - 1] ?? 0);

  /** Sessions in the seven days ending on `day`. */
  const inWindow = (day: number): number =>
    day < 0
      ? 0
      : (totals[Math.min(day, length - 1) + 1] ?? 0) -
        (totals[Math.max(0, day - WINDOW_DAYS + 1)] ?? 0);

  return {
    today,
    inWindow,
    /** Is the flame lit on this day? Either this week is over quota, or the week before it was. */
    isLit: (day: number) => inWindow(day) >= quota || inWindow(day - WINDOW_DAYS) >= quota,
    dateOf: (day: number) => shiftDays(new Date(firstDay), day),
  };
}

type FlameTimeline = ReturnType<typeof flameTimeline>;

/** One pass from the first session to today: the runs, and where the best one ended. */
function walkFlame(flame: FlameTimeline) {
  let run = 0;
  let best = 0;
  let bestEnd = -1;
  let litDays = 0;
  let litDaysLast30 = 0;
  for (let day = 0; day <= flame.today; day++) {
    if (!flame.isLit(day)) {
      run = 0;
      continue;
    }
    run++;
    litDays++;
    if (day > flame.today - 30) litDaysLast30++;
    // `>=` so a tie keeps the latest run: it is the one the hero remembers.
    if (run >= best) {
      best = run;
      bestEnd = day;
    }
  }
  // Nothing before the first session is lit, so the run still going today is the current one.
  const current = flame.isLit(flame.today) ? run : 0;
  return { current, best, bestEnd, litDays, litDaysLast30 };
}

export function calculateStreakFromSessions(
  performedAt: Date[],
  quota: number,
  now: Date = new Date(),
): { current: number; best: number; isActive: boolean; inWindow: number } {
  if (performedAt.length === 0) {
    return { current: 0, best: 0, isActive: false, inWindow: 0 };
  }

  const flame = flameTimeline(performedAt, quota, now);
  const { current, best } = walkFlame(flame);

  // What today's flame is standing on, and what tomorrow's will be judged by. `isLit` reads the
  // same window, so this is the count behind the answer rather than a second opinion about it.
  return { current, best, isActive: current > 0, inWindow: flame.inWindow(flame.today) };
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

  if (
    !cache[STREAK_CURRENT_KEY] ||
    !cache[STREAK_BEST_KEY] ||
    !cache[STREAK_CACHED_ON_KEY] ||
    // A cache written before the window key existed is a miss, not a partial hit. Serving it
    // with a missing figure meant the card stayed silent about the week until the hero logged
    // a session, which on a device with a same-day cache is the one thing they have not done.
    cache[STREAK_WINDOW_KEY] === undefined
  ) {
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
    inWindow: Number.parseInt(cache[STREAK_WINDOW_KEY], 10) || 0,
    // Guarded above: the cache is a miss unless this matches the quota in force right now.
    quota: Number.parseInt(cache[STREAK_QUOTA_KEY] ?? "", 10) || 0,
  };
}

async function saveStreakCache(
  current: number,
  best: number,
  lastDate: string | null,
  quota: number,
  inWindow: number,
): Promise<void> {
  await db
    .insert(userPreferences)
    .values([
      { key: STREAK_CURRENT_KEY, value: String(current) },
      { key: STREAK_BEST_KEY, value: String(best) },
      { key: STREAK_LAST_DATE_KEY, value: lastDate ?? "" },
      { key: STREAK_CACHED_ON_KEY, value: dayKey(new Date()) },
      { key: STREAK_QUOTA_KEY, value: String(quota) },
      { key: STREAK_WINDOW_KEY, value: String(inWindow) },
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
      // A walk holds the flame from ten minutes of moving. The flame is about showing up, and
      // going out is showing up; a walk to the letterbox is not.
      .where(countsAsSession())
      .orderBy(desc(completedQuest.performedAt)),
  ]);

  if (rows.length === 0) {
    return { current: 0, best: 0, isActive: false, lastWorkoutDate: null, inWindow: 0, quota };
  }

  const performedAt = rows.map((r) => r.performedAt);
  const result = calculateStreakFromSessions(performedAt, quota);
  const lastDate = dayKey(new Date(Math.max(...performedAt.map((d) => d.getTime()))));

  await saveStreakCache(result.current, result.best, lastDate, quota, result.inWindow);

  return { ...result, lastWorkoutDate: lastDate, quota };
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
 * Sessions in the flame's own trailing 7-day window, against the hero's quota — the weekly
 * widget's whole data source. Deliberately the same window `isLit` measures (not the calendar
 * week), so the two widgets can never disagree about what "this week" means.
 */
export async function getWeeklyProgress(): Promise<{ done: number; quota: number }> {
  const [quota, rows] = await Promise.all([
    getWeeklyQuota(),
    db
      .select({ performedAt: completedQuest.performedAt })
      .from(completedQuest)
      .where(countsAsSession()),
  ]);

  const byDay = groupByDay(rows.map((r) => r.performedAt));
  return { done: countInWindow(byDay, startOfDay(new Date()), WINDOW_DAYS), quota };
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

/** What the Journal says about the flame, beyond the three numbers the cache holds. */
export type FlameDetail = {
  current: number;
  best: number;
  /** The last lit day of the best run. Null with no run at all. */
  bestEndedOn: Date | null;
  /** True when the best run is the one still burning: "ended" would be a lie about it. */
  bestIsCurrent: boolean;
  inWindow: number;
  quota: number;
  /**
   * The last day the flame stays lit if nothing more is logged. Null when it is out today.
   * It is what a rest day is allowed to say: "the flame holds until Thursday".
   */
  litUntil: Date | null;
  /** Every lit day since the first session. */
  litDays: number;
  /** Lit days among the last thirty, today included. */
  litDaysLast30: number;
};

/**
 * The whole flame, walked once from the first session to today.
 *
 * Built on the same timeline and walk as `calculateStreakFromSessions`, so the two cannot disagree
 * about which day burned: this only reads further (when the best run ended, when the current one
 * will) where that one stops at three numbers.
 */
export function describeFlame(performedAt: Date[], quota: number, now = new Date()): FlameDetail {
  if (performedAt.length === 0) {
    return {
      current: 0,
      best: 0,
      inWindow: 0,
      quota,
      bestEndedOn: null,
      bestIsCurrent: false,
      litUntil: null,
      litDays: 0,
      litDaysLast30: 0,
    };
  }

  const flame = flameTimeline(performedAt, quota, now);
  const { current, best, bestEnd, litDays, litDaysLast30 } = walkFlame(flame);

  let litUntil: Date | null = null;
  if (current > 0) {
    // Future days hold no sessions, so this is the flame running on what is already banked.
    let last = flame.today;
    while (last < flame.today + LIT_FORECAST_DAYS && flame.isLit(last + 1)) last++;
    litUntil = flame.dateOf(last);
  }

  return {
    current,
    best,
    inWindow: flame.inWindow(flame.today),
    quota,
    bestEndedOn: bestEnd >= 0 ? flame.dateOf(bestEnd) : null,
    bestIsCurrent: current > 0 && bestEnd === flame.today,
    litUntil,
    litDays,
    litDaysLast30,
  };
}

/**
 * The Journal's flame, read fresh rather than from the day's cache: it is one screen, opened on
 * purpose, and the cache only knows three of the numbers it needs.
 */
export async function getFlameDetail(now = new Date()): Promise<FlameDetail> {
  const [quota, rows] = await Promise.all([
    getWeeklyQuota(),
    db
      .select({ performedAt: completedQuest.performedAt })
      .from(completedQuest)
      .where(countsAsSession()),
  ]);
  return describeFlame(
    rows.map((r) => r.performedAt),
    quota,
    now,
  );
}
