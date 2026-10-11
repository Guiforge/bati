import { type MuscleCode, muscleCodes } from "./schema";

export function isMuscleCode(value: unknown): value is MuscleCode {
  return typeof value === "string" && (muscleCodes as readonly string[]).includes(value);
}
