import { desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import type { Exercise } from "./exercises";
import { isMuscleCode } from "./muscles";
import type { DifficultyCode, QuestTargetType } from "./schema";

const { completedExercises, completedQuest, exerciseMuscles, exercises } =
  schema;

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
  notes?: string;
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
  notes: string;
  performedAt: Date;
  exercises: CompletedExercise[];
};

type TransactionCallback = Parameters<(typeof db)["transaction"]>[0];
type TransactionTx = Parameters<TransactionCallback>[0];

async function transactionOrFallback<T>(
  fn: (tx: TransactionTx) => Promise<T>,
): Promise<T> {
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

export async function createCompletedSession(
  input: CompletedSessionInput,
): Promise<number> {
  if (input.exercises.length === 0)
    throw new Error("A completed session must have exercises");

  return transactionOrFallback(async (tx) => {
    const inserted = await tx
      .insert(completedQuest)
      .values({
        questId: input.questId ?? null,
        userLevel: input.userLevel ?? "medium",
        durationSeconds: input.durationSeconds ?? null,
        notes: input.notes ?? "",
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

    if (sessionId == null)
      throw new Error("Failed to create completed session");

    await tx.insert(completedExercises).values(
      input.exercises.map((ex) => ({
        sessionId,
        exerciseId: ex.exerciseId,
        roundIndex: ex.roundIndex ?? 0,
        sortOrder: ex.sortOrder,
        resultType: ex.result.type,
        resultValue: ex.result.value,
        targetType: ex.target?.type,
        targetValue: ex.target?.value,
        notes: ex.notes ?? "",
        performedAt: ex.performedAt ?? input.performedAt ?? new Date(),
      })),
    );

    return sessionId;
  });
}

export async function listCompletedSessions(
  limit = 20,
): Promise<Omit<CompletedSession, "exercises">[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      notes: completedQuest.notes,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    notes: r.notes,
    performedAt: r.performedAt,
  }));
}

export async function getCompletedSessionById(
  id: number,
): Promise<CompletedSession | null> {
  const rows = await db
    .select({
      sessionId: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      sessionNotes: completedQuest.notes,
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
    .innerJoin(
      completedExercises,
      eq(completedExercises.sessionId, completedQuest.id),
    )
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(completedQuest.id, id))
    .orderBy(
      completedExercises.roundIndex,
      completedExercises.sortOrder,
      completedExercises.id,
    );

  if (rows.length === 0) return null;

  const first = rows[0];
  const session: CompletedSession = {
    id: first.sessionId,
    questId: first.questId ?? null,
    userLevel: first.userLevel,
    durationSeconds: first.durationSeconds ?? null,
    notes: first.sessionNotes,
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
  }));
}

/**
 * Get recent session history across all quests, ordered by date ascending.
 * Useful for overall progression charts.
 */
export async function getRecentSessionHistory(
  limit = 30,
): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
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
  }));
}
