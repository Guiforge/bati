import { type MovementPattern, movementPatterns } from "./schema";

/**
 * Labels for the movement families. Mirrors `MUSCLE_LABELS` — the two vocabularies are
 * orthogonal on purpose (`drizzle/0020_movement_patterns.sql`): muscles map 1:1 onto the
 * village's resources, patterns describe what the body is *doing*, and only the second one can
 * express "your pulling is behind your pushing".
 */
export const PATTERN_LABELS: Record<MovementPattern, { en: string; fr: string }> = {
  push_horizontal: { en: "Horizontal push", fr: "Poussée horizontale" },
  push_vertical: { en: "Vertical push", fr: "Poussée verticale" },
  pull_horizontal: { en: "Horizontal pull", fr: "Tirage horizontal" },
  pull_vertical: { en: "Vertical pull", fr: "Tirage vertical" },
  squat: { en: "Squat", fr: "Squat" },
  hinge: { en: "Hinge", fr: "Charnière" },
  core: { en: "Core", fr: "Gainage" },
  locomotion: { en: "Locomotion", fr: "Locomotion" },
  mobility: { en: "Mobility", fr: "Mobilité" },
};

/** The two families the research singles out: pulling is the weak point of training without a bar. */
export const PUSH_PATTERNS: readonly MovementPattern[] = ["push_horizontal", "push_vertical"];
export const PULL_PATTERNS: readonly MovementPattern[] = ["pull_horizontal", "pull_vertical"];

export function isMovementPattern(value: unknown): value is MovementPattern {
  return typeof value === "string" && (movementPatterns as readonly string[]).includes(value);
}
