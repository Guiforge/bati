import { type MuscleCode, muscleCodes } from "./schema";

export const MUSCLE_LABELS: Record<MuscleCode, { en: string; fr: string }> = {
  arms: { en: "Arms", fr: "Bras" },
  back: { en: "Back", fr: "Dos" },
  shoulder: { en: "Shoulders", fr: "Épaules" },
  chest: { en: "Chest", fr: "Pectoraux" },
  abs: { en: "Abs", fr: "Abdos" },
  legs: { en: "Legs", fr: "Jambes" },
};

export function isMuscleCode(value: unknown): value is MuscleCode {
  return typeof value === "string" && (muscleCodes as readonly string[]).includes(value);
}
