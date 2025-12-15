import { eq } from "drizzle-orm";
import { db, schema } from "./client";
import { type MuscleCode, muscleCodes } from "./schema";

const { exercises, exerciseMuscles } = schema;

export type Exercise = {
  id: number;
  enName: string;
  frName: string;
  enDescription: string;
  frDescription: string;
  imagePath: string;
  muscles: MuscleCode[];
};

export const MUSCLE_LABELS: Record<MuscleCode, { en: string; fr: string }> = {
  arms: { en: "Arms", fr: "Bras" },
  back: { en: "Back", fr: "Dos" },
  shoulder: { en: "Shoulders", fr: "Épaules" },
  chest: { en: "Chest", fr: "Pectoraux" },
  abs: { en: "Abs", fr: "Abdos" },
  calf: { en: "Calves", fr: "Mollets" },
};

export function isMuscleCode(value: unknown): value is MuscleCode {
  return typeof value === "string" && (muscleCodes as readonly string[]).includes(value);
}

export async function listExercises(): Promise<Exercise[]> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      enDescription: exercises.enDescription,
      frDescription: exercises.frDescription,
      imagePath: exercises.imagePath,
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

export async function getExerciseById(id: number): Promise<Exercise | null> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      enDescription: exercises.enDescription,
      frDescription: exercises.frDescription,
      imagePath: exercises.imagePath,
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
    muscles: [],
  };

  for (const r of rows) {
    if (isMuscleCode(r.muscle) && !ex.muscles.includes(r.muscle)) ex.muscles.push(r.muscle);
  }

  return ex;
}
