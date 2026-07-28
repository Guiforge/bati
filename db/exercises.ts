import { desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import { EQUIPMENT_LABELS, isEquipmentCode } from "./equipment";
import { isMuscleCode, MUSCLE_LABELS } from "./muscles";
import {
  type DifficultyCode,
  type EquipmentCode,
  type ExerciseStyle,
  exerciseStyles,
  type MovementPattern,
  type MuscleCode,
} from "./schema";

const { exercises, exerciseMuscles } = schema;

const EXERCISE_STYLE_SET = new Set<ExerciseStyle>(exerciseStyles);

function isExerciseStyle(value: unknown): value is ExerciseStyle {
  return typeof value === "string" && EXERCISE_STYLE_SET.has(value as ExerciseStyle);
}

export type Exercise = {
  id: number;
  enName: string;
  frName: string;
  enDescription: string;
  frDescription: string;
  imagePath: string;
  creator: string;
  difficulty: DifficultyCode;
  equipment: EquipmentCode;
  style: ExerciseStyle;
  secondsPerRep: number;
  muscles: MuscleCode[];
  /** Movement family — what the exercise *is*, as opposed to what it works. */
  pattern: MovementPattern | null;
};

export { EQUIPMENT_LABELS, isEquipmentCode, isMuscleCode, MUSCLE_LABELS };

// Exercise definitions are static seed content (no in-app editing), so every screen that
// mounts (quest/adventure galleries, adventure details) can share one fetch instead of each
// re-querying on every navigation - the biggest source of the post-navigation loading flash.
let exercisesCache: Promise<Exercise[]> | null = null;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Exercise list includes muscle groups and equipment filtering
async function fetchExercises(): Promise<Exercise[]> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      enDescription: exercises.enDescription,
      frDescription: exercises.frDescription,
      imagePath: exercises.imagePath,
      creator: exercises.creator,
      difficulty: exercises.difficulty,
      equipment: exercises.equipment,
      style: exercises.style,
      secondsPerRep: exercises.secondsPerRep,
      pattern: exercises.pattern,
      muscle: exerciseMuscles.muscle,
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id));

  const byId = new Map<number, Exercise>();

  for (const r of rows) {
    const current = byId.get(r.id);
    if (!current) {
      byId.set(r.id, {
        id: r.id,
        enName: r.enName,
        frName: r.frName,
        enDescription: r.enDescription,
        frDescription: r.frDescription,
        imagePath: r.imagePath,
        creator: r.creator,
        difficulty: r.difficulty,
        equipment: isEquipmentCode(r.equipment) ? r.equipment : "none",
        style: isExerciseStyle(r.style) ? r.style : "strength",
        secondsPerRep: typeof r.secondsPerRep === "number" ? r.secondsPerRep : 3,
        pattern: r.pattern ?? null,
        muscles: [],
      });
    }

    if (isMuscleCode(r.muscle)) {
      const ex = byId.get(r.id);
      if (ex && !ex.muscles.includes(r.muscle)) ex.muscles.push(r.muscle);
    }
  }

  return [...byId.values()];
}

export function listExercises(): Promise<Exercise[]> {
  if (!exercisesCache) {
    exercisesCache = fetchExercises().catch((e) => {
      exercisesCache = null; // don't cache a failure - let the next caller retry
      throw e;
    });
  }
  return exercisesCache;
}

export async function getExerciseById(id: number): Promise<Exercise | null> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      enDescription: exercises.enDescription,
      frDescription: exercises.frDescription,
      imagePath: exercises.imagePath,
      creator: exercises.creator,
      difficulty: exercises.difficulty,
      equipment: exercises.equipment,
      style: exercises.style,
      secondsPerRep: exercises.secondsPerRep,
      pattern: exercises.pattern,
      muscle: exerciseMuscles.muscle,
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(exercises.id, id));

  if (rows.length === 0) return null;

  const first = rows[0];
  const ex: Exercise = {
    id: first.id,
    enName: first.enName,
    frName: first.frName,
    enDescription: first.enDescription,
    frDescription: first.frDescription,
    imagePath: first.imagePath,
    creator: first.creator,
    difficulty: first.difficulty,
    equipment: isEquipmentCode(first.equipment) ? first.equipment : "none",
    style: isExerciseStyle(first.style) ? first.style : "strength",
    secondsPerRep: typeof first.secondsPerRep === "number" ? first.secondsPerRep : 3,
    pattern: first.pattern ?? null,
    muscles: [],
  };

  for (const r of rows) {
    if (isMuscleCode(r.muscle) && !ex.muscles.includes(r.muscle)) ex.muscles.push(r.muscle);
  }

  return ex;
}

// ------------------------------------------------------------
// Variation ladder
// ------------------------------------------------------------

/** Sessions meeting the target before the next variation is considered earned. */
export const PROGRESSION_SESSIONS_REQUIRED = 3;

export type NextProgression = {
  /** The harder variation this exercise leads to. */
  next: { id: number; enName: string; frName: string; imagePath: string };
  /** How many of the last sessions on this exercise met or beat their target. */
  metTarget: number;
  required: number;
  isEarned: boolean;
};

/**
 * What comes after this movement, and how close the hero is to it.
 *
 * Progressive overload without weights is a harder variation, not a bigger multiplier. This is a
 * hint and nothing else: no quest is hidden, no exercise is locked, and a hero who wants to try
 * the next step tonight can. The threshold is something the app can actually observe — the last
 * three logged sets met their target — rather than "3×12 clean reps", which would require seeing
 * technique the app cannot see.
 */
export async function getNextProgression(exerciseId: number): Promise<NextProgression | null> {
  const nextRows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      imagePath: exercises.imagePath,
    })
    .from(exercises)
    .where(eq(exercises.prerequisiteExerciseId, exerciseId))
    .limit(1);

  const next = nextRows[0];
  if (!next) return null;

  const recent = await db
    .select({
      resultValue: schema.completedExercises.resultValue,
      targetValue: schema.completedExercises.targetValue,
    })
    .from(schema.completedExercises)
    .where(eq(schema.completedExercises.exerciseId, exerciseId))
    .orderBy(desc(schema.completedExercises.performedAt))
    .limit(PROGRESSION_SESSIONS_REQUIRED);

  const metTarget = recent.filter(
    (r) => r.targetValue !== null && r.resultValue >= r.targetValue,
  ).length;

  return {
    next,
    metTarget,
    required: PROGRESSION_SESSIONS_REQUIRED,
    isEarned: metTarget >= PROGRESSION_SESSIONS_REQUIRED,
  };
}
