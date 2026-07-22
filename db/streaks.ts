import { desc, sql } from "drizzle-orm";
import { db, schema } from "./client";

const { completedQuest, userPreferences } = schema;

// Keys for streak cache in preferences
const STREAK_CURRENT_KEY = "streak_current";
const STREAK_BEST_KEY = "streak_best";
const STREAK_LAST_DATE_KEY = "streak_last_date";

export type StreakInfo = {
  current: number;
  best: number;
  isActive: boolean;
  lastWorkoutDate: string | null;
};

/**
 * Calculate streak from session dates
 */
function calculateStreakFromDates(uniqueDays: string[]): {
  current: number;
  best: number;
  isActive: boolean;
} {
  if (uniqueDays.length === 0) {
    return { current: 0, best: 0, isActive: false };
  }

  // Sort days (newest first for current streak)
  const sortedDaysDesc = [...uniqueDays].sort().reverse();

  // Check if streak is active (worked out today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWorkoutDate = new Date(sortedDaysDesc[0]);
  lastWorkoutDate.setHours(0, 0, 0, 0);

  const isActive =
    lastWorkoutDate.getTime() === today.getTime() ||
    lastWorkoutDate.getTime() === yesterday.getTime();

  // Calculate current streak
  let current = 0;
  if (isActive) {
    const checkDate = new Date(lastWorkoutDate);
    for (const dayStr of sortedDaysDesc) {
      const day = new Date(dayStr);
      day.setHours(0, 0, 0, 0);

      if (day.getTime() === checkDate.getTime()) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (day.getTime() < checkDate.getTime()) {
        break;
      }
    }
  }

  // Calculate best streak (sorted ascending)
  const sortedDaysAsc = [...uniqueDays].sort();
  let best = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDaysAsc.length; i++) {
    const prev = new Date(sortedDaysAsc[i - 1]);
    const curr = new Date(sortedDaysAsc[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      best = Math.max(best, tempStreak);
      tempStreak = 1;
    }
  }
  best = Math.max(best, tempStreak);

  return { current, best, isActive };
}

/**
 * Get cached streak info from preferences
 */
export async function getCachedStreak(): Promise<StreakInfo | null> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(
      sql`${userPreferences.key} IN (${STREAK_CURRENT_KEY}, ${STREAK_BEST_KEY}, ${STREAK_LAST_DATE_KEY})`,
    );

  if (rows.length < 3) return null;

  const cache: Record<string, string> = {};
  for (const row of rows) {
    cache[row.key] = row.value;
  }

  if (!cache[STREAK_CURRENT_KEY] || !cache[STREAK_BEST_KEY] || !cache[STREAK_LAST_DATE_KEY]) {
    return null;
  }

  const lastDate = cache[STREAK_LAST_DATE_KEY];

  // Check if cache is still valid (last workout was today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWorkoutDate = new Date(lastDate);
  lastWorkoutDate.setHours(0, 0, 0, 0);

  const isActive =
    lastWorkoutDate.getTime() === today.getTime() ||
    lastWorkoutDate.getTime() === yesterday.getTime();

  return {
    current: Number.parseInt(cache[STREAK_CURRENT_KEY], 10) || 0,
    best: Number.parseInt(cache[STREAK_BEST_KEY], 10) || 0,
    isActive,
    lastWorkoutDate: lastDate,
  };
}

/**
 * Save streak info to preferences cache
 */
async function saveStreakCache(current: number, best: number, lastDate: string): Promise<void> {
  await db
    .insert(userPreferences)
    .values([
      { key: STREAK_CURRENT_KEY, value: String(current) },
      { key: STREAK_BEST_KEY, value: String(best) },
      { key: STREAK_LAST_DATE_KEY, value: lastDate },
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
  // Get all session dates
  const rows = await db
    .select({ performedAt: completedQuest.performedAt })
    .from(completedQuest)
    .orderBy(desc(completedQuest.performedAt));

  if (rows.length === 0) {
    return { current: 0, best: 0, isActive: false, lastWorkoutDate: null };
  }

  // Get unique days
  const uniqueDays = new Set<string>();
  for (const row of rows) {
    const date = row.performedAt;
    uniqueDays.add(date.toISOString().split("T")[0]);
  }

  const daysArray = Array.from(uniqueDays);
  const result = calculateStreakFromDates(daysArray);

  // Get last workout date
  const lastDate = daysArray.sort().reverse()[0];

  // Save to cache
  await saveStreakCache(result.current, result.best, lastDate);

  return {
    ...result,
    lastWorkoutDate: lastDate,
  };
}

/**
 * Get streak info - use cache if valid, otherwise recalculate
 */
export async function getStreakInfo(): Promise<StreakInfo> {
  // Try cache first
  const cached = await getCachedStreak();

  // If we have a cached value with valid last date, use it
  // But we need to verify it's still accurate for "isActive"
  if (cached) {
    // Check if the cached streak is still accurate
    // If the last workout was yesterday and current streak > 0, it's still valid
    // If the last workout was before yesterday, streak may have broken
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);

    const lastWorkoutDate = cached.lastWorkoutDate ? new Date(cached.lastWorkoutDate) : null;

    if (lastWorkoutDate) {
      lastWorkoutDate.setHours(0, 0, 0, 0);

      // If last workout was more than 2 days ago, streak is broken
      if (lastWorkoutDate.getTime() < dayBeforeYesterday.getTime()) {
        // Recalculate to confirm
        return calculateAndCacheStreak();
      }

      // Cache is still valid
      return cached;
    }
  }

  // No cache or invalid, calculate fresh
  return calculateAndCacheStreak();
}

/**
 * Update streak after completing a session
 * Call this after saving a session to update the cache
 */
export function updateStreakAfterSession(): Promise<StreakInfo> {
  return calculateAndCacheStreak();
}
