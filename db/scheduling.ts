/**
 * Scheduled Sessions - Query functions for planning workouts
 * Part of Phase 3: Coach & Planning
 */

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "./client";
import type { Quest } from "./quests";
import { getQuestById } from "./quests";
import { Difficulty, type UserLevel } from "./targets";

const { scheduledSessions, quests } = schema;

// Default user level for fetching quest details in scheduling
const DEFAULT_USER_LEVEL: UserLevel = Difficulty.Medium;

export type ScheduledSessionStatus =
  | "pending"
  | "completed"
  | "skipped"
  | "missed";

export interface ScheduledSession {
  id: number;
  questId: number;
  goalId: number | null;
  scheduledDate: Date;
  preferredHour: number | null;
  status: ScheduledSessionStatus;
  completedSessionId: number | null;
  note: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ScheduledSessionWithQuest extends ScheduledSession {
  quest: Quest;
}

export interface CreateScheduledSessionInput {
  questId: number;
  scheduledDate: Date;
  goalId?: number;
  preferredHour?: number;
  note?: string;
}

/**
 * Create a new scheduled session
 */
export async function createScheduledSession(
  input: CreateScheduledSessionInput
): Promise<ScheduledSession> {
  const [result] = await db
    .insert(scheduledSessions)
    .values({
      questId: input.questId,
      scheduledDate: input.scheduledDate,
      goalId: input.goalId ?? null,
      preferredHour: input.preferredHour ?? null,
      note: input.note ?? null,
    })
    .returning();

  return result as ScheduledSession;
}

/**
 * Get scheduled sessions for a date range
 */
export async function getScheduledSessionsInRange(
  startDate: Date,
  endDate: Date
): Promise<ScheduledSessionWithQuest[]> {
  const rows = await db
    .select()
    .from(scheduledSessions)
    .where(
      and(
        gte(scheduledSessions.scheduledDate, startDate),
        lte(scheduledSessions.scheduledDate, endDate)
      )
    )
    .orderBy(
      asc(scheduledSessions.scheduledDate),
      asc(scheduledSessions.preferredHour)
    );

  const sessionsWithQuests: ScheduledSessionWithQuest[] = [];

  for (const row of rows) {
    const quest = await getQuestById(row.questId, DEFAULT_USER_LEVEL);
    if (quest) {
      sessionsWithQuests.push({
        ...(row as ScheduledSession),
        quest,
      });
    }
  }

  return sessionsWithQuests;
}

/**
 * Get scheduled sessions for a specific week (Monday to Sunday)
 */
export async function getScheduledSessionsForWeek(
  weekStartDate: Date
): Promise<ScheduledSessionWithQuest[]> {
  // Calculate end of week (Sunday)
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  return getScheduledSessionsInRange(weekStartDate, weekEndDate);
}

/**
 * Get pending scheduled sessions (future or today)
 */
export async function getPendingScheduledSessions(): Promise<
  ScheduledSessionWithQuest[]
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(scheduledSessions)
    .where(
      and(
        eq(scheduledSessions.status, "pending"),
        gte(scheduledSessions.scheduledDate, today)
      )
    )
    .orderBy(asc(scheduledSessions.scheduledDate));

  const sessionsWithQuests: ScheduledSessionWithQuest[] = [];

  for (const row of rows) {
    const quest = await getQuestById(row.questId, DEFAULT_USER_LEVEL);
    if (quest) {
      sessionsWithQuests.push({
        ...(row as ScheduledSession),
        quest,
      });
    }
  }

  return sessionsWithQuests;
}

/**
 * Get today's scheduled sessions
 */
export async function getTodaysScheduledSessions(): Promise<
  ScheduledSessionWithQuest[]
> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getScheduledSessionsInRange(today, tomorrow);
}

/**
 * Update scheduled session status
 */
export async function updateScheduledSessionStatus(
  id: number,
  status: ScheduledSessionStatus,
  completedSessionId?: number
): Promise<void> {
  await db
    .update(scheduledSessions)
    .set({
      status,
      completedSessionId: completedSessionId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(scheduledSessions.id, id));
}

/**
 * Mark scheduled session as completed
 */
export async function markScheduledSessionCompleted(
  id: number,
  completedSessionId: number
): Promise<void> {
  await updateScheduledSessionStatus(id, "completed", completedSessionId);
}

/**
 * Skip a scheduled session
 */
export async function skipScheduledSession(id: number): Promise<void> {
  await updateScheduledSessionStatus(id, "skipped");
}

/**
 * Reschedule a session to a new date
 */
export async function rescheduleSession(
  id: number,
  newDate: Date,
  newPreferredHour?: number
): Promise<void> {
  await db
    .update(scheduledSessions)
    .set({
      scheduledDate: newDate,
      preferredHour: newPreferredHour ?? null,
      updatedAt: new Date(),
    })
    .where(eq(scheduledSessions.id, id));
}

/**
 * Delete a scheduled session
 */
export async function deleteScheduledSession(id: number): Promise<void> {
  await db.delete(scheduledSessions).where(eq(scheduledSessions.id, id));
}

/**
 * Mark past pending sessions as missed
 * Should be called periodically (e.g., on app start)
 */
export async function markMissedSessions(): Promise<number> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(23, 59, 59, 999);

  const result = await db
    .update(scheduledSessions)
    .set({
      status: "missed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(scheduledSessions.status, "pending"),
        lte(scheduledSessions.scheduledDate, yesterday)
      )
    );

  // Return count of updated rows (SQLite doesn't provide this directly)
  return 0; // Placeholder
}

/**
 * Get the start of the current ISO week (Monday)
 */
export function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Schedule multiple sessions for a week based on goal
 * Used when auto-generating a training plan
 */
export async function scheduleWeekFromGoal(
  goalId: number,
  weekStartDate: Date,
  questIds: number[],
  daysOfWeek: number[] // 0 = Sunday, 1 = Monday, etc.
): Promise<ScheduledSession[]> {
  const sessions: ScheduledSession[] = [];

  for (let i = 0; i < daysOfWeek.length && i < questIds.length; i++) {
    const dayOffset = daysOfWeek[i] === 0 ? 6 : daysOfWeek[i] - 1; // Convert to Monday-based
    const sessionDate = new Date(weekStartDate);
    sessionDate.setDate(sessionDate.getDate() + dayOffset);

    const session = await createScheduledSession({
      questId: questIds[i],
      scheduledDate: sessionDate,
      goalId,
    });

    sessions.push(session);
  }

  return sessions;
}
