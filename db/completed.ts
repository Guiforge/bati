import { format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { desc, eq, gte } from "drizzle-orm";
import { db, schema } from "./client";
import type { Exercise } from "./exercises";
import { isMuscleCode } from "./muscles";
import type { DifficultyCode, FeedbackCode, QuestTargetType } from "./schema";

const { completedExercises, completedQuest, exerciseMuscles, exercises } = schema;

export type CompletedExerciseInput = {
  exerciseId: number;
  roundIndex?: number;
  sortOrder: number;

  result: { type: QuestTargetType; value: number };
  target?: { type: QuestTargetType; value: number };

  notes?: string;
  performedAt?: Date;
};

export type CompletedSessionInput = {
  questId?: number | null;
  userLevel?: DifficultyCode;
  durationSeconds?: number | null;
  xpEarned?: number;
  notes?: string;
  feedback?: FeedbackCode | null;
  performedAt?: Date;

  exercises: CompletedExerciseInput[];
};

export type CompletedExercise = {
  id: number;
  roundIndex: number;
  sortOrder: number;
  result: { type: QuestTargetType; value: number };
  target?: { type: QuestTargetType; value: number };
  notes: string;
  performedAt: Date;
  exercise: Exercise;
};

export type CompletedSession = {
  id: number;
  questId: number | null;
  userLevel: DifficultyCode;
  durationSeconds: number | null;
  xpEarned: number;
  notes: string;
  feedback: FeedbackCode | null;
  performedAt: Date;
  exercises: CompletedExercise[];
};

type TransactionCallback = Parameters<(typeof db)["transaction"]>[0];
type TransactionTx = Parameters<TransactionCallback>[0];

async function transactionOrFallback<T>(fn: (tx: TransactionTx) => Promise<T>): Promise<T> {
  try {
    // Expo SQLite supports async transaction callbacks.
    return await db.transaction(fn);
  } catch (e) {
    // better-sqlite3 (used in Node unit tests) only supports sync callbacks.
    if (
      e instanceof TypeError &&
      typeof e.message === "string" &&
      e.message.includes("Transaction function cannot return a promise")
    ) {
      return await fn(db as unknown as TransactionTx);
    }
    throw e;
  }
}

export async function createCompletedSession(input: CompletedSessionInput): Promise<number> {
  if (input.exercises.length === 0) throw new Error("A completed session must have exercises");

  return transactionOrFallback(async (tx) => {
    const inserted = await tx
      .insert(completedQuest)
      .values({
        questId: input.questId ?? null,
        userLevel: input.userLevel ?? "medium",
        durationSeconds: input.durationSeconds ?? null,
        xpEarned: Math.max(0, Math.round(input.xpEarned ?? 0)),
        notes: input.notes ?? "",
        feedback: input.feedback ?? null,
        performedAt: input.performedAt ?? new Date(),
      })
      .returning({ id: completedQuest.id });

    let sessionId = inserted[0]?.id;

    // Fallback if RETURNING isn't available on some SQLite builds.
    if (sessionId == null) {
      const last = await tx
        .select({ id: completedQuest.id })
        .from(completedQuest)
        .orderBy(desc(completedQuest.id))
        .limit(1);
      sessionId = last[0]?.id;
    }

    if (sessionId == null) throw new Error("Failed to create completed session");

    const rowsToInsert = input.exercises.map((ex) => {
      const roundIndexRaw = ex.roundIndex;
      const sortOrderRaw = ex.sortOrder;
      const resultValueRaw = ex.result.value;
      const targetValueRaw = ex.target?.value;

      // SQLite CHECK constraints (see drizzle/0006_add_completed_history.sql):
      // roundIndex >= 0, sortOrder >= 0, resultValue > 0, and (targetValue is null OR > 0).
      const roundIndex =
        typeof roundIndexRaw === "number" && Number.isFinite(roundIndexRaw)
          ? Math.max(0, Math.floor(roundIndexRaw))
          : 0;
      const sortOrder =
        typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw)
          ? Math.max(0, Math.floor(sortOrderRaw))
          : 0;
      const resultValue =
        typeof resultValueRaw === "number" && Number.isFinite(resultValueRaw)
          ? Math.max(1, Math.floor(resultValueRaw))
          : 1;
      const targetValue =
        targetValueRaw == null
          ? null
          : typeof targetValueRaw === "number" && Number.isFinite(targetValueRaw)
            ? Math.max(1, Math.floor(targetValueRaw))
            : null;

      return {
        sessionId,
        exerciseId: ex.exerciseId,
        roundIndex,
        sortOrder,
        resultType: ex.result.type,
        resultValue,
        targetType: ex.target?.type,
        targetValue,
        notes: ex.notes ?? "",
        performedAt: ex.performedAt ?? input.performedAt ?? new Date(),
      };
    });

    try {
      await tx.insert(completedExercises).values(rowsToInsert);
    } catch (e) {
      // Helpful when debugging SQLite CHECK constraint failures on-device.
      if (__DEV__) {
        const minRoundIndex = Math.min(...rowsToInsert.map((r) => r.roundIndex));
        const minSortOrder = Math.min(...rowsToInsert.map((r) => r.sortOrder));
        const minResultValue = Math.min(...rowsToInsert.map((r) => r.resultValue));

        console.error("Failed to insert completed_exercises", {
          sessionId,
          rows: rowsToInsert.length,
          minRoundIndex,
          minSortOrder,
          minResultValue,
          sample: rowsToInsert.slice(0, 5),
        });
      }
      throw e;
    }

    return sessionId;
  });
}

export async function markSessionWithNewRecords(sessionId: number): Promise<void> {
  await db.update(completedQuest).set({ hasNewRecords: 1 }).where(eq(completedQuest.id, sessionId));
}

export type CompletedSessionListItem = Omit<CompletedSession, "exercises"> & {
  hasNewRecords: boolean;
};

export async function listCompletedSessions(limit = 20): Promise<CompletedSessionListItem[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      notes: completedQuest.notes,
      feedback: completedQuest.feedback,
      performedAt: completedQuest.performedAt,
      hasNewRecords: completedQuest.hasNewRecords,
    })
    .from(completedQuest)
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    xpEarned: r.xpEarned,
    notes: r.notes,
    feedback: (r.feedback as FeedbackCode | null) ?? null,
    performedAt: r.performedAt,
    hasNewRecords: r.hasNewRecords === 1,
  }));
}

export async function getCompletedSessionById(id: number): Promise<CompletedSession | null> {
  const rows = await db
    .select({
      sessionId: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      sessionNotes: completedQuest.notes,
      sessionFeedback: completedQuest.feedback,
      sessionPerformedAt: completedQuest.performedAt,

      cexId: completedExercises.id,
      roundIndex: completedExercises.roundIndex,
      sortOrder: completedExercises.sortOrder,
      resultType: completedExercises.resultType,
      resultValue: completedExercises.resultValue,
      targetType: completedExercises.targetType,
      targetValue: completedExercises.targetValue,
      cexNotes: completedExercises.notes,
      cexPerformedAt: completedExercises.performedAt,

      exId: exercises.id,
      exEnName: exercises.enName,
      exFrName: exercises.frName,
      exEnDescription: exercises.enDescription,
      exFrDescription: exercises.frDescription,
      exImagePath: exercises.imagePath,
      exCreator: exercises.creator,
      exDifficulty: exercises.difficulty,
      exEquipment: exercises.equipment,
      exSecondsPerRep: exercises.secondsPerRep,

      muscle: exerciseMuscles.muscle,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(completedQuest.id, id))
    .orderBy(completedExercises.roundIndex, completedExercises.sortOrder, completedExercises.id);

  if (rows.length === 0) return null;

  const first = rows[0];
  const session: CompletedSession = {
    id: first.sessionId,
    questId: first.questId ?? null,
    userLevel: first.userLevel,
    durationSeconds: first.durationSeconds ?? null,
    xpEarned: first.xpEarned,
    notes: first.sessionNotes,
    feedback: (first.sessionFeedback as FeedbackCode | null) ?? null,
    performedAt: first.sessionPerformedAt,
    exercises: [],
  };

  const byCompletedExercise = new Map<number, CompletedExercise>();

  for (const r of rows) {
    const existing = byCompletedExercise.get(r.cexId);
    const cex: CompletedExercise =
      existing ??
      ({
        id: r.cexId,
        roundIndex: r.roundIndex,
        sortOrder: r.sortOrder,
        result: { type: r.resultType, value: r.resultValue },
        target:
          r.targetType && r.targetValue != null
            ? { type: r.targetType, value: r.targetValue }
            : undefined,
        notes: r.cexNotes,
        performedAt: r.cexPerformedAt,
        exercise: {
          id: r.exId,
          enName: r.exEnName,
          frName: r.exFrName,
          enDescription: r.exEnDescription,
          frDescription: r.exFrDescription,
          imagePath: r.exImagePath,
          creator: r.exCreator,
          difficulty: r.exDifficulty,
          equipment: r.exEquipment,
          secondsPerRep: r.exSecondsPerRep,
          muscles: [],
        },
      } satisfies CompletedExercise);

    if (!existing) {
      byCompletedExercise.set(r.cexId, cex);
      session.exercises.push(cex);
    }

    if (isMuscleCode(r.muscle) && !cex.exercise.muscles.includes(r.muscle)) {
      cex.exercise.muscles.push(r.muscle);
    }
  }

  return session;
}

export type SessionSummary = {
  id: number;
  questId: number | null;
  userLevel: DifficultyCode;
  durationSeconds: number | null;
  performedAt: Date;
  feedback: FeedbackCode | null;
};

/**
 * Get session history for a specific quest, ordered by date ascending.
 * Useful for building progression charts.
 */
export async function getQuestSessionHistory(
  questId: number,
  limit = 30,
): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
      feedback: completedQuest.feedback,
    })
    .from(completedQuest)
    .where(eq(completedQuest.questId, questId))
    .orderBy(completedQuest.performedAt, completedQuest.id)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    performedAt: r.performedAt,
    feedback: r.feedback,
  }));
}

/**
 * Get recent session history across all quests, ordered by date ascending.
 * Useful for overall progression charts.
 */
export async function getRecentSessionHistory(limit = 30): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
      feedback: completedQuest.feedback,
    })
    .from(completedQuest)
    .orderBy(completedQuest.performedAt, completedQuest.id)
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    performedAt: r.performedAt,
    feedback: r.feedback,
  }));
}

// ------------------------------------------------------------
// Historical Trends
// ------------------------------------------------------------

export type WeeklyTrend = {
  weekKey: string; // ISO week format "2026-W01"
  weekStart: Date;
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
};

export type MonthlyTrend = {
  monthKey: string; // Format "2026-01"
  monthStart: Date;
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
};

export type TrendAnalysis = {
  currentPeriod: number;
  previousPeriod: number;
  change: number; // percentage change
  trend: "up" | "down" | "stable";
};

/**
 * Get weekly trends for the past N weeks
 */
export async function getWeeklyTrends(weeks = 12): Promise<WeeklyTrend[]> {
  const cutoff = startOfWeek(subWeeks(new Date(), weeks - 1), {
    weekStartsOn: 1,
  });

  const rows = await db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, cutoff));

  // Group by ISO week
  const weekMap = new Map<string, WeeklyTrend>();

  for (const row of rows) {
    const date = row.performedAt;
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-'W'ww");

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        weekKey,
        weekStart,
        sessionCount: 0,
        totalMinutes: 0,
        totalXp: 0,
      });
    }

    const week = weekMap.get(weekKey);
    if (week) {
      week.sessionCount += 1;
      week.totalMinutes += Math.round((row.durationSeconds ?? 0) / 60);
      week.totalXp += row.xpEarned ?? 0;
    }
  }

  // Sort by week key and return
  return Array.from(weekMap.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

/**
 * Get monthly trends for the past N months
 */
export async function getMonthlyTrends(months = 6): Promise<MonthlyTrend[]> {
  const cutoff = startOfMonth(subMonths(new Date(), months - 1));

  const rows = await db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, cutoff));

  // Group by month
  const monthMap = new Map<string, MonthlyTrend>();

  for (const row of rows) {
    const date = row.performedAt;
    const monthStart = startOfMonth(date);
    const monthKey = format(monthStart, "yyyy-MM");

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        monthKey,
        monthStart,
        sessionCount: 0,
        totalMinutes: 0,
        totalXp: 0,
      });
    }

    const month = monthMap.get(monthKey);
    if (month) {
      month.sessionCount += 1;
      month.totalMinutes += Math.round((row.durationSeconds ?? 0) / 60);
      month.totalXp += row.xpEarned ?? 0;
    }
  }

  // Sort by month key and return
  return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/**
 * Analyze trend between current and previous period
 */
export function analyzeTrend(current: number, previous: number): TrendAnalysis {
  if (previous === 0) {
    return {
      currentPeriod: current,
      previousPeriod: previous,
      change: current > 0 ? 100 : 0,
      trend: current > 0 ? "up" : "stable",
    };
  }

  const change = Math.round(((current - previous) / previous) * 100);

  let trend: "up" | "down" | "stable" = "stable";
  if (change > 5) trend = "up";
  else if (change < -5) trend = "down";

  return {
    currentPeriod: current,
    previousPeriod: previous,
    change,
    trend,
  };
}

/**
 * Get comprehensive trend summary
 */
export async function getTrendSummary(): Promise<{
  weeklyTrends: WeeklyTrend[];
  monthlyTrends: MonthlyTrend[];
  sessionsAnalysis: TrendAnalysis;
  minutesAnalysis: TrendAnalysis;
  xpAnalysis: TrendAnalysis;
}> {
  const weeklyTrends = await getWeeklyTrends(8);
  const monthlyTrends = await getMonthlyTrends(6);

  // Calculate week-over-week analysis
  const thisWeek = weeklyTrends[weeklyTrends.length - 1];
  const lastWeek = weeklyTrends[weeklyTrends.length - 2];

  const sessionsAnalysis = analyzeTrend(thisWeek?.sessionCount ?? 0, lastWeek?.sessionCount ?? 0);

  const minutesAnalysis = analyzeTrend(thisWeek?.totalMinutes ?? 0, lastWeek?.totalMinutes ?? 0);

  const xpAnalysis = analyzeTrend(thisWeek?.totalXp ?? 0, lastWeek?.totalXp ?? 0);

  return {
    weeklyTrends,
    monthlyTrends,
    sessionsAnalysis,
    minutesAnalysis,
    xpAnalysis,
  };
}
