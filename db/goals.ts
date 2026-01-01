/**
 * Goals & Planning System
 *
 * Handles user fitness goals and weekly progress tracking.
 */

import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import type { GoalStatusCode, GoalTypeCode } from "./schema";

const { goals, goalProgress } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type Goal = {
  id: number;
  goalType: GoalTypeCode;
  daysPerWeek: number;
  sessionMinutes: number;
  status: GoalStatusCode;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type GoalProgress = {
  id: number;
  goalId: number;
  weekKey: string;
  targetSessions: number;
  completedSessions: number;
  totalMinutes: number;
  totalXp: number;
  updatedAt: Date | null;
};

export type CreateGoalInput = {
  goalType: GoalTypeCode;
  daysPerWeek: number;
  sessionMinutes: number;
  endDate?: Date;
};

// ------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------

/**
 * Get ISO week key for a date (YYYY-WW format)
 */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Thursday of current week determines the year/week
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

/**
 * Goal type display info
 */
export const goalTypeInfo: Record<
  GoalTypeCode,
  { en: string; fr: string; emoji: string; description: { en: string; fr: string } }
> = {
  strength: {
    en: "Strength",
    fr: "Force",
    emoji: "💪",
    description: {
      en: "Build muscle and power",
      fr: "Développer muscles et puissance",
    },
  },
  endurance: {
    en: "Endurance",
    fr: "Endurance",
    emoji: "🏃",
    description: {
      en: "Improve stamina and cardio",
      fr: "Améliorer l'endurance et le cardio",
    },
  },
  flexibility: {
    en: "Flexibility",
    fr: "Souplesse",
    emoji: "🧘",
    description: {
      en: "Increase mobility and stretch",
      fr: "Augmenter la mobilité et l'étirement",
    },
  },
  balanced: {
    en: "Balanced",
    fr: "Équilibré",
    emoji: "⚖️",
    description: {
      en: "Mix of all fitness aspects",
      fr: "Mélange de tous les aspects fitness",
    },
  },
};

// ------------------------------------------------------------
// Query Functions
// ------------------------------------------------------------

/**
 * Get the active goal (only one active goal allowed at a time)
 */
export async function getActiveGoal(): Promise<Goal | null> {
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.status, "active"))
    .orderBy(desc(goals.createdAt))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    goalType: row.goalType as GoalTypeCode,
    daysPerWeek: row.daysPerWeek,
    sessionMinutes: row.sessionMinutes,
    status: row.status as GoalStatusCode,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

/**
 * Get goal by ID
 */
export async function getGoalById(id: number): Promise<Goal | null> {
  const rows = await db.select().from(goals).where(eq(goals.id, id)).limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    goalType: row.goalType as GoalTypeCode,
    daysPerWeek: row.daysPerWeek,
    sessionMinutes: row.sessionMinutes,
    status: row.status as GoalStatusCode,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

/**
 * Get all goals (for history)
 */
export async function getAllGoals(): Promise<Goal[]> {
  const rows = await db.select().from(goals).orderBy(desc(goals.createdAt));

  return rows.map((row) => ({
    id: row.id,
    goalType: row.goalType as GoalTypeCode,
    daysPerWeek: row.daysPerWeek,
    sessionMinutes: row.sessionMinutes,
    status: row.status as GoalStatusCode,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
  }));
}

/**
 * Create a new goal (deactivates any existing active goal)
 */
export async function createGoal(input: CreateGoalInput): Promise<number> {
  // Deactivate any existing active goals
  await db
    .update(goals)
    .set({ status: "paused", updatedAt: new Date() })
    .where(eq(goals.status, "active"));

  // Create new goal
  const inserted = await db
    .insert(goals)
    .values({
      goalType: input.goalType,
      daysPerWeek: input.daysPerWeek,
      sessionMinutes: input.sessionMinutes,
      status: "active",
      startDate: new Date(),
      endDate: input.endDate ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: goals.id });

  const goalId = inserted[0]?.id;
  if (goalId == null) {
    // Fallback for SQLite builds without RETURNING
    const last = await db.select({ id: goals.id }).from(goals).orderBy(desc(goals.id)).limit(1);
    return last[0]?.id ?? 0;
  }

  return goalId;
}

/**
 * Update goal status
 */
export async function updateGoalStatus(id: number, status: GoalStatusCode): Promise<void> {
  await db.update(goals).set({ status, updatedAt: new Date() }).where(eq(goals.id, id));
}

/**
 * Update goal settings
 */
export async function updateGoal(
  id: number,
  updates: Partial<Pick<CreateGoalInput, "daysPerWeek" | "sessionMinutes">>,
): Promise<void> {
  await db
    .update(goals)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(goals.id, id));
}

// ------------------------------------------------------------
// Progress Tracking
// ------------------------------------------------------------

/**
 * Get or create progress for current week
 */
export async function getOrCreateWeekProgress(goalId: number): Promise<GoalProgress> {
  const weekKey = getWeekKey();

  // Try to get existing progress
  const existing = await db
    .select()
    .from(goalProgress)
    .where(and(eq(goalProgress.goalId, goalId), eq(goalProgress.weekKey, weekKey)))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    return {
      id: row.id,
      goalId: row.goalId,
      weekKey: row.weekKey,
      targetSessions: row.targetSessions,
      completedSessions: row.completedSessions,
      totalMinutes: row.totalMinutes,
      totalXp: row.totalXp,
      updatedAt: row.updatedAt ?? null,
    };
  }

  // Get goal to determine target
  const goal = await getGoalById(goalId);
  if (!goal) throw new Error("Goal not found");

  // Create new progress entry
  const inserted = await db
    .insert(goalProgress)
    .values({
      goalId,
      weekKey,
      targetSessions: goal.daysPerWeek,
      completedSessions: 0,
      totalMinutes: 0,
      totalXp: 0,
      updatedAt: new Date(),
    })
    .returning({ id: goalProgress.id });

  let progressId = inserted[0]?.id;
  if (progressId == null) {
    // Fallback for SQLite builds without RETURNING
    const last = await db
      .select({ id: goalProgress.id })
      .from(goalProgress)
      .orderBy(desc(goalProgress.id))
      .limit(1);
    progressId = last[0]?.id ?? 0;
  }

  return {
    id: progressId,
    goalId,
    weekKey,
    targetSessions: goal.daysPerWeek,
    completedSessions: 0,
    totalMinutes: 0,
    totalXp: 0,
    updatedAt: new Date(),
  };
}

/**
 * Record a completed session against the active goal
 */
export async function recordSessionForGoal(sessionData: {
  durationMinutes: number;
  xpEarned: number;
}): Promise<void> {
  const goal = await getActiveGoal();
  if (!goal) return; // No active goal, nothing to track

  const progress = await getOrCreateWeekProgress(goal.id);

  await db
    .update(goalProgress)
    .set({
      completedSessions: progress.completedSessions + 1,
      totalMinutes: progress.totalMinutes + sessionData.durationMinutes,
      totalXp: progress.totalXp + sessionData.xpEarned,
      updatedAt: new Date(),
    })
    .where(eq(goalProgress.id, progress.id));
}

/**
 * Get progress history for a goal (recent weeks)
 */
export async function getGoalProgressHistory(goalId: number, limit = 8): Promise<GoalProgress[]> {
  const rows = await db
    .select()
    .from(goalProgress)
    .where(eq(goalProgress.goalId, goalId))
    .orderBy(desc(goalProgress.weekKey))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    goalId: row.goalId,
    weekKey: row.weekKey,
    targetSessions: row.targetSessions,
    completedSessions: row.completedSessions,
    totalMinutes: row.totalMinutes,
    totalXp: row.totalXp,
    updatedAt: row.updatedAt ?? null,
  }));
}

/**
 * Calculate goal completion percentage for current week
 */
export async function getCurrentWeekCompletion(): Promise<{
  goal: Goal | null;
  progress: GoalProgress | null;
  percentage: number;
  isComplete: boolean;
}> {
  const goal = await getActiveGoal();
  if (!goal) {
    return { goal: null, progress: null, percentage: 0, isComplete: false };
  }

  const progress = await getOrCreateWeekProgress(goal.id);
  const percentage = Math.min(100, (progress.completedSessions / progress.targetSessions) * 100);
  const isComplete = progress.completedSessions >= progress.targetSessions;

  return { goal, progress, percentage, isComplete };
}
