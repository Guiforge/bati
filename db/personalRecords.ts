import { desc, eq, inArray, max, sql } from "drizzle-orm";
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

  const best = rows[0];
  if (best?.durationSeconds == null) {
    return null;
  }

  return {
    type: "longest_session",
    value: best.durationSeconds,
    achievedAt: best.performedAt,
    sessionId: best.id,
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

  const best = rows[0];
  if (best?.xpEarned == null) {
    return null;
  }

  return {
    type: "most_xp",
    value: best.xpEarned,
    achievedAt: best.performedAt,
    sessionId: best.id,
  };
}

/**
 * What the hero has already done on a movement, in that movement's own unit.
 *
 * `last` is the best set of the most recent session, not its last row: a 12/10/8 quest would
 * otherwise report 8 as the thing to beat — a floor the hero cleared twice on the way down. It is
 * the rule `checkForNewRecords` already applies below, so "what to beat" and "what the app
 * celebrates" name the same number.
 *
 * ponytail: the session's best set, not the same round's. Matching `roundIndex` would compare
 * round 3 against last time's round 3, which is truer and doubles the fold; do it if anyone
 * reports the round-1 number feeling unreachable.
 */
export type ExerciseGhost = { last: number; best: number };

/**
 * Reps and seconds share `resultValue` and nothing in the column says which one it holds, so a
 * 60 s hold pooled with rep sets reports itself as a rep record. The unit rides in the key —
 * same composite `checkForNewRecords` folds on.
 */
export function ghostKey(exerciseId: number, type: QuestTargetType): string {
  return `${exerciseId}:${type}`;
}

type SessionBest = ExerciseGhost & { at: number; sessionId: number };

/**
 * Two sessions finished in the same second share a timestamp, so the timestamp alone would leave
 * "last time" up to row order. The id breaks the tie.
 */
function isNewerSession(a: SessionBest, b: SessionBest): boolean {
  return a.at > b.at || (a.at === b.at && a.sessionId > b.sessionId);
}

/**
 * The journal's answer for a batch of movements, in one query.
 *
 * Opening a quest needs this for every exercise in it, and each read is a synchronous SQLite call
 * on the JS thread — duplicates are paid in dropped frames (same reasoning as `shortLivedQuery`).
 * Movements with nothing logged are simply absent from the map.
 *
 * Grouping by session first is what makes `last` mean "the best set of that evening": the two
 * aggregates are independent on purpose, `best` being the session's best value and `at` its last
 * set's time.
 */
export async function getExerciseHistory(
  exerciseIds: number[],
): Promise<Map<string, ExerciseGhost>> {
  if (exerciseIds.length === 0) return new Map();

  const rows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      resultType: completedExercises.resultType,
      sessionId: completedExercises.sessionId,
      best: max(completedExercises.resultValue),
      at: max(completedExercises.performedAt),
    })
    .from(completedExercises)
    .where(inArray(completedExercises.exerciseId, exerciseIds))
    .groupBy(
      completedExercises.exerciseId,
      completedExercises.resultType,
      completedExercises.sessionId,
    );

  const byKey = new Map<string, SessionBest>();

  for (const r of rows) {
    if (r.best == null || r.best <= 0) continue;

    // An aggregate does not go through the column's timestamp mapper on every driver, so accept
    // both shapes rather than trusting one.
    const at = r.at instanceof Date ? r.at.getTime() : Number(r.at ?? 0);
    const row: SessionBest = { last: r.best, best: r.best, at, sessionId: r.sessionId };
    const key = ghostKey(r.exerciseId, r.resultType);
    const entry = byKey.get(key);

    if (!entry) {
      byKey.set(key, row);
      continue;
    }

    entry.best = Math.max(entry.best, row.best);

    if (isNewerSession(row, entry)) {
      entry.last = row.last;
      entry.at = row.at;
      entry.sessionId = row.sessionId;
    }
  }

  return new Map([...byKey].map(([key, v]) => [key, { last: v.last, best: v.best }]));
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

  const session = sessionRows[0];
  if (!session) {
    return newRecords;
  }

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
