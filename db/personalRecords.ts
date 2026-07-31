import { and, desc, eq, inArray, max, sql } from "drizzle-orm";
import { db, schema } from "./client";
import type { QuestTargetType } from "./schema";

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
 * Best single result for an exercise, in one unit.
 *
 * The unit is not optional: reps and seconds share the `resultValue` column, so pooling them
 * makes a 60 s hold outrank every rep set the hero has ever done on the same movement.
 */
/** @legacy Meilleur résultat sur un exercice ; l'écran exercice calcule le sien. */
export async function getExerciseMax(
  exerciseId: number,
  resultType: QuestTargetType = "reps",
): Promise<PersonalRecord | null> {
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
    .where(
      and(
        eq(completedExercises.exerciseId, exerciseId),
        eq(completedExercises.resultType, resultType),
      ),
    )
    .orderBy(desc(completedExercises.resultValue))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return {
    type: resultType === "time" ? "exercise_max_time" : "exercise_max_reps",
    value: rows[0].resultValue,
    achievedAt: rows[0].performedAt,
    exerciseId,
    exerciseName: { en: rows[0].enName, fr: rows[0].frName },
    sessionId: rows[0].sessionId,
  };
}

/**
 * Longest logged hold per exercise, for a batch of exercises, in one query.
 *
 * `getExerciseMax` above answers for one exercise and joins the name and session for display.
 * Opening a quest needs neither, and needs the answer for every hold in it — one grouped read
 * instead of three round trips, because each is a synchronous SQLite call on the JS thread and
 * duplicates are paid in dropped frames (same reasoning as `shortLivedQuery`).
 *
 * Exercises with no logged hold are simply absent from the map.
 */
export async function getMaxHoldSeconds(exerciseIds: number[]): Promise<Map<number, number>> {
  if (exerciseIds.length === 0) return new Map();

  const rows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      best: max(completedExercises.resultValue),
    })
    .from(completedExercises)
    .where(
      and(
        inArray(completedExercises.exerciseId, exerciseIds),
        eq(completedExercises.resultType, "time"),
      ),
    )
    .groupBy(completedExercises.exerciseId);

  const byExercise = new Map<number, number>();
  for (const r of rows) {
    if (r.best != null && r.best > 0) byExercise.set(r.exerciseId, r.best);
  }
  return byExercise;
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

  // Check exercise PRs. A quest round is per-exercise-per-round, so a multi-round quest
  // has one row per round for the same exercise — keep only the best round here, or the
  // same exercise would be flagged as a new record once per round.
  //
  // Reps and seconds are separate records for the same exercise, never one pooled max: a
  // 60 s hold is not "60 reps", and an exercise trained both ways would have had its rep PR
  // permanently buried under its own hold times.
  const exerciseResultRows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      resultType: completedExercises.resultType,
      resultValue: completedExercises.resultValue,
      enName: exercises.enName,
      frName: exercises.frName,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(eq(completedExercises.sessionId, sessionId));

  const bestByExercise = new Map<string, (typeof exerciseResultRows)[number]>();
  for (const row of exerciseResultRows) {
    const key = `${row.exerciseId}:${row.resultType}`;
    const best = bestByExercise.get(key);
    if (!best || row.resultValue > best.resultValue) {
      bestByExercise.set(key, row);
    }
  }

  for (const result of bestByExercise.values()) {
    // Get previous max for this exercise, in this unit, excluding the current session.
    const previousMax = await db
      .select({
        maxValue: max(completedExercises.resultValue),
      })
      .from(completedExercises)
      .where(
        sql`${completedExercises.exerciseId} = ${result.exerciseId} AND ${completedExercises.resultType} = ${result.resultType} AND ${completedExercises.sessionId} != ${sessionId}`,
      );

    const prevMax = previousMax[0]?.maxValue ?? 0;
    if (result.resultValue > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: result.resultType === "time" ? "exercise_max_time" : "exercise_max_reps",
        newValue: result.resultValue,
        previousValue: prevMax > 0 ? prevMax : null,
        exerciseId: result.exerciseId,
        exerciseName: { en: result.enName, fr: result.frName },
      });
    }
  }

  return newRecords;
}
