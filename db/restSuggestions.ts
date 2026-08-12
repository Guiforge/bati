import { desc, gte } from "drizzle-orm";
import { db, schema } from "./client";
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

/**
 * Consecutive heavy weeks ending today.
 *
 * The other rules in this file are acute — days in a row, sessions this week. None of them can
 * see fatigue accumulating across a month, which is the window the deload guidance is about
 * (docs/raw/bodyweight-app-research.md §2). This is the smallest thing that can: count back in
 * 7-day buckets and stop at the first week that was not heavy.
 */
async function countHeavyWeeks(now: Date): Promise<number> {
  const horizonWeeks = HEAVY_WEEKS_BEFORE_DELOAD + 1;
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() - horizonWeeks * 7);

  const rows = await db
    .select({ performedAt: completedQuest.performedAt })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, horizon));

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const perWeek = new Map<number, number>();
  for (const row of rows) {
    const weeksAgo = Math.floor((now.getTime() - row.performedAt.getTime()) / msPerWeek);
    perWeek.set(weeksAgo, (perWeek.get(weeksAgo) ?? 0) + 1);
  }

  let heavy = 0;
  for (let weeksAgo = 0; weeksAgo < horizonWeeks; weeksAgo++) {
    if ((perWeek.get(weeksAgo) ?? 0) < HEAVY_WEEK_SESSIONS) break;
    heavy++;
  }

  return heavy;
}

/**
 * Analyze recent workout patterns to detect overtraining and suggest rest days.
 *
 * Overtraining indicators:
 * - More than 5 consecutive training days without rest
 * - More than 10 sessions in the last 7 days (very high volume)
 * - More than 6 sessions in the last 7 days (high volume warning)
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Rest suggestion requires analyzing multiple time-based metrics
export async function getRestSuggestion(): Promise<RestSuggestion> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get sessions from the last 7 days
  const recentSessions = await db
    .select({
      id: completedQuest.id,
      performedAt: completedQuest.performedAt,
      durationSeconds: completedQuest.durationSeconds,
    })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, sevenDaysAgo))
    .orderBy(desc(completedQuest.performedAt));

  if (recentSessions.length === 0) {
    return {
      shouldRest: false,
      reason: "none",
      daysInARow: 0,
      recentSessionCount: 0,
    };
  }

  // Calculate unique training days in the last 7 days
  const trainingDays = new Set<string>();
  for (const session of recentSessions) {
    const dateStr = dayKey(session.performedAt);
    trainingDays.add(dateStr);
  }

  // Calculate consecutive training days ending today or yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDays = Array.from(trainingDays).sort().reverse();
  let consecutiveDays = 0;

  if (sortedDays.length > 0) {
    const lastWorkout = new Date(sortedDays[0]);
    lastWorkout.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Only count consecutive days if last workout was today or yesterday
    if (
      lastWorkout.getTime() === today.getTime() ||
      lastWorkout.getTime() === yesterday.getTime()
    ) {
      const checkDate = new Date(lastWorkout);

      for (const dayStr of sortedDays) {
        const day = new Date(dayStr);
        day.setHours(0, 0, 0, 0);

        if (day.getTime() === checkDate.getTime()) {
          consecutiveDays++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (day.getTime() < checkDate.getTime()) {
          break;
        }
      }
    }
  }

  // Check for overtraining patterns
  const sessionCount = recentSessions.length;

  // Very high volume: 10+ sessions in 7 days
  if (sessionCount >= 10) {
    return {
      shouldRest: true,
      reason: "high_volume",
      daysInARow: consecutiveDays,
      recentSessionCount: sessionCount,
    };
  }

  // Consecutive days without rest (5+ days in a row)
  if (consecutiveDays >= 5) {
    return {
      shouldRest: true,
      reason: "consecutive_days",
      daysInARow: consecutiveDays,
      recentSessionCount: sessionCount,
    };
  }

  // High volume warning: 6+ sessions in 7 days
  if (sessionCount >= 6) {
    return {
      shouldRest: true,
      reason: "overtraining",
      daysInARow: consecutiveDays,
      recentSessionCount: sessionCount,
    };
  }

  // Nothing acute — but fatigue may still be piling up across weeks.
  const heavyWeeks = await countHeavyWeeks(now);
  if (heavyWeeks >= HEAVY_WEEKS_BEFORE_DELOAD) {
    return {
      shouldRest: true,
      reason: "deload",
      daysInARow: consecutiveDays,
      recentSessionCount: sessionCount,
      heavyWeeks,
    };
  }

  // No rest needed
  return {
    shouldRest: false,
    reason: "none",
    daysInARow: consecutiveDays,
    recentSessionCount: sessionCount,
  };
}
