import { desc, gte } from "drizzle-orm";
import { db, schema } from "./client";

const { completedQuest } = schema;

export type RestSuggestion = {
  shouldRest: boolean;
  reason: "overtraining" | "consecutive_days" | "high_volume" | "none";
  daysInARow: number;
  recentSessionCount: number;
  message: string;
};

/**
 * Analyze recent workout patterns to detect overtraining and suggest rest days.
 *
 * Overtraining indicators:
 * - More than 5 consecutive training days without rest
 * - More than 10 sessions in the last 7 days (very high volume)
 * - More than 6 sessions in the last 7 days (high volume warning)
 */
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
      message: "",
    };
  }

  // Calculate unique training days in the last 7 days
  const trainingDays = new Set<string>();
  for (const session of recentSessions) {
    const dateStr = session.performedAt.toISOString().split("T")[0];
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
      message: "rest_suggestion_high_volume",
    };
  }

  // Consecutive days without rest (5+ days in a row)
  if (consecutiveDays >= 5) {
    return {
      shouldRest: true,
      reason: "consecutive_days",
      daysInARow: consecutiveDays,
      recentSessionCount: sessionCount,
      message: "rest_suggestion_consecutive",
    };
  }

  // High volume warning: 6+ sessions in 7 days
  if (sessionCount >= 6) {
    return {
      shouldRest: true,
      reason: "overtraining",
      daysInARow: consecutiveDays,
      recentSessionCount: sessionCount,
      message: "rest_suggestion_overtraining",
    };
  }

  // No rest needed
  return {
    shouldRest: false,
    reason: "none",
    daysInARow: consecutiveDays,
    recentSessionCount: sessionCount,
    message: "",
  };
}

/**
 * Check if the user has worked out recently and might benefit from rest
 * This is a simpler check for display purposes
 */
export async function getQuickRestCheck(): Promise<{
  workedOutToday: boolean;
  workedOutYesterday: boolean;
  weeklySessionCount: number;
}> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentSessions = await db
    .select({ performedAt: completedQuest.performedAt })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, sevenDaysAgo));

  let workedOutToday = false;
  let workedOutYesterday = false;

  for (const session of recentSessions) {
    const sessionDate = new Date(session.performedAt);
    sessionDate.setHours(0, 0, 0, 0);

    if (sessionDate.getTime() === today.getTime()) {
      workedOutToday = true;
    }
    if (sessionDate.getTime() === yesterday.getTime()) {
      workedOutYesterday = true;
    }
  }

  return {
    workedOutToday,
    workedOutYesterday,
    weeklySessionCount: recentSessions.length,
  };
}
