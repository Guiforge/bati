import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import type { Exercise } from "./exercises";
import type { QuestTargetType } from "./schema";

const { exercises, exerciseMuscles, questExercises, quests } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export enum Difficulty {
  Easy = "easy",
  Medium = "medium",
  Hard = "hard",
}

export type UserLevel = Difficulty;

export type Target = {
  type: QuestTargetType;
  value: number;
};

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
  rounds: number;
  exercises: QuestTemplateExercise[];
};

export type Quest = {
  id: number;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  rounds: number;
  exercises: QuestExercise[];
};

// ------------------------------------------------------------
// Target generation
// ------------------------------------------------------------

const USER_LEVEL_MULTIPLIER: Record<UserLevel, number> = {
  [Difficulty.Easy]: 0.75,
  [Difficulty.Medium]: 1.0,
  [Difficulty.Hard]: 1.25,
};

export function generateTarget(
  base: { type: QuestTargetType; min: number; max: number },
  userLevel: UserLevel,
): Target {
  const min = Math.min(base.min, base.max);
  const max = Math.max(base.min, base.max);
  const m = USER_LEVEL_MULTIPLIER[userLevel];

  const scaledMin = Math.max(1, Math.round(min * m));
  const scaledMax = Math.max(1, Math.round(max * m));

  const value = Math.max(1, Math.round((scaledMin + scaledMax) / 2));
  return { type: base.type, value };
}

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

export async function createQuestTemplate(input: Omit<QuestTemplate, "id">): Promise<number> {
  await db.insert(quests).values({
    enTitle: input.enTitle,
    frTitle: input.frTitle,
    enDescription: input.enDescription,
    frDescription: input.frDescription,
    rounds: input.rounds,
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
      })),
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
      rounds: quests.rounds,

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
        rounds: r.rounds,
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
  const all = await listQuestTemplates();
  return all.find((q) => q.id === id) ?? null;
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
      rounds: quests.rounds,

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
    rounds: first.rounds,
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
          muscles: [],
        },
        images: safeParseImages(r.imagesJson),
        target: generateTarget(base, userLevel),
      };
      byQuestExercise.set(r.qexId, qex);
      quest.exercises.push(qex);
    }

    if (r.muscle && !qex.exercise.muscles.includes(r.muscle)) qex.exercise.muscles.push(r.muscle);
  }
  return quest;
}

export async function deleteQuest(id: number): Promise<void> {
  await db.delete(quests).where(eq(quests.id, id));
}

export async function updateQuestMeta(
  id: number,
  patch: Partial<
    Pick<QuestTemplate, "enTitle" | "frTitle" | "enDescription" | "frDescription" | "rounds">
  >,
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
  next: QuestTemplateExercise[],
): Promise<void> {
  await db.transaction(async (tx) => {
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
      })),
    );
  });
}

export async function ensureQuestHasExercise(
  questId: number,
  exerciseId: number,
  baseTarget: { type: QuestTargetType; min: number; max: number },
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
