import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import type { Exercise } from "./exercises";
import { isMuscleCode } from "./muscles";
import type { QuestTargetType } from "./schema";
import { Difficulty, generateTarget, type Target, type UserLevel } from "./targets";

const { exercises, exerciseMuscles, questExercises, quests } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export { Difficulty, generateTarget };
export type { Target, UserLevel };

export interface QuestExercise {
  /** Reference to the base exercise definition */
  exercise: Exercise;

  /** Optional quest-specific images */
  images: string[];

  /** Target for this quest – either repetitions or seconds */
  target: Target;
}

export type QuestTemplateExercise = {
  exerciseId: number;
  images: string[];
  baseTarget: {
    type: QuestTargetType;
    min: number;
    max: number;
  };
};

export type QuestTemplate = {
  id: number;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  author: string;
  rounds: number;
  restSeconds: number;
  exercises: QuestTemplateExercise[];
};

export type Quest = {
  id: number;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  author: string;
  rounds: number;
  restSeconds: number;
  exercises: QuestExercise[];
};

// ------------------------------------------------------------
// Target generation
// ------------------------------------------------------------

// generateTarget moved to `db/targets.ts` for testability

function safeParseImages(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// DB helpers
// ------------------------------------------------------------

export type CreateQuestTemplateInput = Omit<QuestTemplate, "id" | "author"> & {
  author?: string;
};

export async function createQuestTemplate(input: CreateQuestTemplateInput): Promise<number> {
  await db.insert(quests).values({
    enTitle: input.enTitle,
    frTitle: input.frTitle,
    enDescription: input.enDescription,
    frDescription: input.frDescription,
    author: input.author ?? "Admin",
    rounds: input.rounds,
    restSeconds: input.restSeconds,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const row = await db
    .select({ id: quests.id })
    .from(quests)
    .where(eq(quests.enTitle, input.enTitle))
    .orderBy(desc(quests.id))
    .limit(1);

  const questId = row[0]?.id;
  if (questId == null) throw new Error("Failed to create quest");

  if (input.exercises.length > 0) {
    await db.insert(questExercises).values(
      input.exercises.map((qex, i) => ({
        questId,
        exerciseId: qex.exerciseId,
        sortOrder: i,
        targetType: qex.baseTarget.type,
        targetMin: qex.baseTarget.min,
        targetMax: qex.baseTarget.max,
        imagesJson: JSON.stringify(qex.images ?? []),
      }))
    );
  }

  return questId;
}

export async function listQuestTemplates(): Promise<QuestTemplate[]> {
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      author: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,

      questExerciseId: questExercises.id,
      sortOrder: questExercises.sortOrder,
      exerciseId: questExercises.exerciseId,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,
    })
    .from(quests)
    .leftJoin(questExercises, eq(questExercises.questId, quests.id))
    .orderBy(quests.id, questExercises.sortOrder);

  const byId = new Map<number, QuestTemplate>();

  for (const r of rows) {
    if (!byId.has(r.questId)) {
      byId.set(r.questId, {
        id: r.questId,
        enTitle: r.enTitle,
        frTitle: r.frTitle,
        enDescription: r.enDescription,
        frDescription: r.frDescription,
        author: r.author,
        rounds: r.rounds,
        restSeconds: r.restSeconds,
        exercises: [],
      });
    }

    if (
      r.questExerciseId == null ||
      r.exerciseId == null ||
      r.targetType == null ||
      r.targetMin == null ||
      r.targetMax == null ||
      r.imagesJson == null
    ) {
      continue;
    }

    byId.get(r.questId)?.exercises.push({
      exerciseId: r.exerciseId,
      images: safeParseImages(r.imagesJson),
      baseTarget: {
        type: r.targetType,
        min: r.targetMin,
        max: r.targetMax,
      },
    });
  }

  return [...byId.values()];
}

export async function getQuestTemplateById(id: number): Promise<QuestTemplate | null> {
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      author: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,

      questExerciseId: questExercises.id,
      sortOrder: questExercises.sortOrder,
      exerciseId: questExercises.exerciseId,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,
    })
    .from(quests)
    .leftJoin(questExercises, eq(questExercises.questId, quests.id))
    .where(eq(quests.id, id))
    .orderBy(questExercises.sortOrder);

  if (rows.length === 0) return null;

  const first = rows[0];
  const quest: QuestTemplate = {
    id: first.questId,
    enTitle: first.enTitle,
    frTitle: first.frTitle,
    enDescription: first.enDescription,
    frDescription: first.frDescription,
    author: first.author,
    rounds: first.rounds,
    restSeconds: first.restSeconds,
    exercises: [],
  };

  for (const r of rows) {
    if (
      r.questExerciseId == null ||
      r.exerciseId == null ||
      r.targetType == null ||
      r.targetMin == null ||
      r.targetMax == null ||
      r.imagesJson == null
    ) {
      continue;
    }

    quest.exercises.push({
      exerciseId: r.exerciseId,
      images: safeParseImages(r.imagesJson),
      baseTarget: {
        type: r.targetType,
        min: r.targetMin,
        max: r.targetMax,
      },
    });
  }

  return quest;
}

export async function getQuestById(id: number, userLevel: UserLevel): Promise<Quest | null> {
  // Join quests -> quest_exercises -> exercises -> exercise_muscles and aggregate.
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      author: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,

      qexId: questExercises.id,
      sortOrder: questExercises.sortOrder,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,

      exId: exercises.id,
      exEnName: exercises.enName,
      exFrName: exercises.frName,
      exEnDescription: exercises.enDescription,
      exFrDescription: exercises.frDescription,
      exImagePath: exercises.imagePath,
      exCreator: exercises.creator,
      exDifficulty: exercises.difficulty,
      exEquipment: exercises.equipment,
      exStyle: exercises.style,
      exSecondsPerRep: exercises.secondsPerRep,

      muscle: exerciseMuscles.muscle,
    })
    .from(quests)
    .innerJoin(questExercises, eq(questExercises.questId, quests.id))
    .innerJoin(exercises, eq(exercises.id, questExercises.exerciseId))
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(quests.id, id))
    .orderBy(questExercises.sortOrder);

  if (rows.length === 0) return null;

  const first = rows[0];
  const quest: Quest = {
    id: first.questId,
    enTitle: first.enTitle,
    frTitle: first.frTitle,
    enDescription: first.enDescription,
    frDescription: first.frDescription,
    author: first.author,
    rounds: first.rounds,
    restSeconds: first.restSeconds,
    exercises: [],
  };

  const byQuestExercise = new Map<number, QuestExercise>();

  for (const r of rows) {
    const base = {
      type: r.targetType,
      min: r.targetMin,
      max: r.targetMax,
    };

    let qex = byQuestExercise.get(r.qexId);
    if (!qex) {
      qex = {
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
          style: r.exStyle ?? "strength",
          secondsPerRep: r.exSecondsPerRep,
          muscles: [],
        },
        images: safeParseImages(r.imagesJson),
        target: generateTarget(base, userLevel),
      };
      byQuestExercise.set(r.qexId, qex);
      quest.exercises.push(qex);
    }

    if (isMuscleCode(r.muscle) && !qex.exercise.muscles.includes(r.muscle)) {
      qex.exercise.muscles.push(r.muscle);
    }
  }
  return quest;
}

export async function deleteQuest(id: number): Promise<void> {
  await db.delete(quests).where(eq(quests.id, id));
}

export async function updateQuestMeta(
  id: number,
  patch: Partial<
    Pick<
      QuestTemplate,
      "enTitle" | "frTitle" | "enDescription" | "frDescription" | "rounds" | "restSeconds"
    >
  >
): Promise<void> {
  await db
    .update(quests)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(eq(quests.id, id));
}

export async function setQuestExercises(
  questId: number,
  next: QuestTemplateExercise[]
): Promise<void> {
  type TransactionCallback = Parameters<(typeof db)["transaction"]>[0];
  type TransactionTx = Parameters<TransactionCallback>[0];

  const run = async (tx: TransactionTx) => {
    await tx.delete(questExercises).where(eq(questExercises.questId, questId));

    if (next.length === 0) return;

    await tx.insert(questExercises).values(
      next.map((qex, i) => ({
        questId,
        exerciseId: qex.exerciseId,
        sortOrder: i,
        targetType: qex.baseTarget.type,
        targetMin: qex.baseTarget.min,
        targetMax: qex.baseTarget.max,
        imagesJson: JSON.stringify(qex.images ?? []),
      }))
    );
  };

  try {
    await db.transaction(run);
  } catch (e) {
    if (
      e instanceof TypeError &&
      typeof e.message === "string" &&
      e.message.includes("Transaction function cannot return a promise")
    ) {
      await run(db as unknown as TransactionTx);
      return;
    }
    throw e;
  }
}

export async function ensureQuestHasExercise(
  questId: number,
  exerciseId: number,
  baseTarget: { type: QuestTargetType; min: number; max: number }
): Promise<void> {
  const existing = await db
    .select({ id: questExercises.id })
    .from(questExercises)
    .where(and(eq(questExercises.questId, questId), eq(questExercises.exerciseId, exerciseId)))
    .limit(1);

  if (existing.length > 0) return;

  const last = await db
    .select({ sortOrder: questExercises.sortOrder })
    .from(questExercises)
    .where(eq(questExercises.questId, questId))
    .orderBy(desc(questExercises.sortOrder))
    .limit(1);

  const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

  await db.insert(questExercises).values({
    questId,
    exerciseId,
    sortOrder,
    targetType: baseTarget.type,
    targetMin: baseTarget.min,
    targetMax: baseTarget.max,
    imagesJson: "[]",
  });
}

/**
 * Get the daily quest based on the current date.
 * Deterministically picks a quest from all available quests.
 */
export async function getDailyQuest(userLevel: UserLevel): Promise<Quest | null> {
  const templates = await listQuestTemplates();
  if (templates.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  // Simple hash of the date string
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const index = Math.abs(hash) % templates.length;
  const template = templates[index];

  return getQuestById(template.id, userLevel);
}

export async function isDailyQuest(questId: number): Promise<boolean> {
  const templates = await listQuestTemplates();
  if (templates.length === 0) return false;

  const today = new Date().toISOString().split("T")[0];
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % templates.length;
  return templates[index].id === questId;
}
