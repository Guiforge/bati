import { desc, eq, max, sql } from "drizzle-orm";
import { db, schema } from "./client";

const { completedQuest, completedExercises, exercises } = schema;

/**
 * Personal Record types
 */
export type RecordType =
  | "longest_session" // Longest workout duration
  | "most_xp" // Most XP in a single session
  | "highest_streak" // Highest streak achieved
  | "exercise_max_reps" // Most reps for a specific exercise
  | "exercise_max_time"; // Longest hold/time for a specific exercise

export type PersonalRecord = {
  type: RecordType;
  value: number;
  achievedAt: Date;
  exerciseId?: number; // For exercise-specific records
  exerciseName?: { en: string; fr: string }; // For display
  sessionId?: number; // Reference to the session
};

export type NewRecordResult = {
  isNewRecord: boolean;
  recordType: RecordType;
  newValue: number;
  previousValue: number | null;
  exerciseId?: number;
  exerciseName?: { en: string; fr: string };
};

/**
 * Get the longest session ever completed
 */
export async function getLongestSession(): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .orderBy(desc(completedQuest.durationSeconds))
    .limit(1);

  if (rows.length === 0 || rows[0].durationSeconds == null) {
    return null;
  }

  return {
    type: "longest_session",
    value: rows[0].durationSeconds,
    achievedAt: rows[0].performedAt,
    sessionId: rows[0].id,
  };
}

/**
 * Get the session with most XP earned
 */
export async function getMostXpSession(): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      id: completedQuest.id,
      xpEarned: completedQuest.xpEarned,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .orderBy(desc(completedQuest.xpEarned))
    .limit(1);

  if (rows.length === 0 || rows[0].xpEarned == null) {
    return null;
  }

  return {
    type: "most_xp",
    value: rows[0].xpEarned,
    achievedAt: rows[0].performedAt,
    sessionId: rows[0].id,
  };
}

/**
 * Get the max reps achieved for a specific exercise
 */
export async function getExerciseMaxReps(exerciseId: number): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      sessionId: completedExercises.sessionId,
      resultValue: completedExercises.resultValue,
      performedAt: completedExercises.performedAt,
      enName: exercises.enName,
      frName: exercises.frName,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(eq(completedExercises.exerciseId, exerciseId))
    .orderBy(desc(completedExercises.resultValue))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return {
    type: "exercise_max_reps",
    value: rows[0].resultValue,
    achievedAt: rows[0].performedAt,
    exerciseId,
    exerciseName: { en: rows[0].enName, fr: rows[0].frName },
    sessionId: rows[0].sessionId,
  };
}

/**
 * Get all personal records summary
 */
export async function getPersonalRecordsSummary(): Promise<{
  longestSession: PersonalRecord | null;
  mostXp: PersonalRecord | null;
  totalSessions: number;
}> {
  const [longestSession, mostXp, countResult] = await Promise.all([
    getLongestSession(),
    getMostXpSession(),
    db.select({ count: sql<number>`COUNT(*)` }).from(completedQuest),
  ]);

  return {
    longestSession,
    mostXp,
    totalSessions: countResult[0]?.count ?? 0,
  };
}

/**
 * Check if a completed session set any new records.
 * Call this after saving a session to detect PRs.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PR detection requires comparing current performance against historical bests
export async function checkForNewRecords(sessionId: number): Promise<NewRecordResult[]> {
  const newRecords: NewRecordResult[] = [];

  // Get the session data
  const sessionRows = await db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
    })
    .from(completedQuest)
    .where(eq(completedQuest.id, sessionId))
    .limit(1);

  if (sessionRows.length === 0) {
    return newRecords;
  }

  const session = sessionRows[0];

  // Check longest session
  if (session.durationSeconds != null) {
    const previousLongest = await db
      .select({
        maxDuration: max(completedQuest.durationSeconds),
      })
      .from(completedQuest)
      .where(sql`${completedQuest.id} != ${sessionId}`);

    const prevMax = previousLongest[0]?.maxDuration ?? 0;
    if (session.durationSeconds > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "longest_session",
        newValue: session.durationSeconds,
        previousValue: prevMax > 0 ? prevMax : null,
      });
    }
  }

  // Check most XP
  if (session.xpEarned != null) {
    const previousMostXp = await db
      .select({
        maxXp: max(completedQuest.xpEarned),
      })
      .from(completedQuest)
      .where(sql`${completedQuest.id} != ${sessionId}`);

    const prevMax = previousMostXp[0]?.maxXp ?? 0;
    if (session.xpEarned > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "most_xp",
        newValue: session.xpEarned,
        previousValue: prevMax > 0 ? prevMax : null,
      });
    }
  }

  // Check exercise PRs
  const exerciseResults = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      resultValue: completedExercises.resultValue,
      enName: exercises.enName,
      frName: exercises.frName,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(eq(completedExercises.sessionId, sessionId));

  for (const result of exerciseResults) {
    // Get previous max for this exercise (excluding current session)
    const previousMax = await db
      .select({
        maxValue: max(completedExercises.resultValue),
      })
      .from(completedExercises)
      .where(
        sql`${completedExercises.exerciseId} = ${result.exerciseId} AND ${completedExercises.sessionId} != ${sessionId}`,
      );

    const prevMax = previousMax[0]?.maxValue ?? 0;
    if (result.resultValue > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "exercise_max_reps",
        newValue: result.resultValue,
        previousValue: prevMax > 0 ? prevMax : null,
        exerciseId: result.exerciseId,
        exerciseName: { en: result.enName, fr: result.frName },
      });
    }
  }

  return newRecords;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  if (secs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${secs}s`;
}
