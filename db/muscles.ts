import type { Localized } from "@/src/i18n/deviceLanguage";
import { type MuscleCode, muscleCodes } from "./schema";

export const MUSCLE_LABELS: Record<MuscleCode, Localized> = {
  arms: { en: "Arms", fr: "Bras", de: "Arme", es: "Brazos" },
  back: { en: "Back", fr: "Dos", de: "Rücken", es: "Espalda" },
  shoulder: { en: "Shoulders", fr: "Épaules", de: "Schultern", es: "Hombros" },
  chest: { en: "Chest", fr: "Pectoraux", de: "Brust", es: "Pecho" },
  abs: { en: "Abs", fr: "Abdos", de: "Bauch", es: "Abdominales" },
  legs: { en: "Legs", fr: "Jambes", de: "Beine", es: "Piernas" },
};

export function isMuscleCode(value: unknown): value is MuscleCode {
  return typeof value === "string" && (muscleCodes as readonly string[]).includes(value);
}
