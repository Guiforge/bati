import { eq } from "drizzle-orm";
import { db, schema } from "./client";
import { EQUIPMENT_LABELS, isEquipmentCode } from "./equipment";
import { isMuscleCode, MUSCLE_LABELS } from "./muscles";
import {
  type DifficultyCode,
  type EquipmentCode,
  type ExerciseStyle,
  exerciseStyles,
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
    muscles: [],
  };

  for (const r of rows) {
    if (isMuscleCode(r.muscle) && !ex.muscles.includes(r.muscle)) ex.muscles.push(r.muscle);
  }

  return ex;
}
