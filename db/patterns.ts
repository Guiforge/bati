import type { Localized } from "@/src/i18n/deviceLanguage";
import { type MovementPattern, movementPatterns } from "./schema";

/**
 * Labels for the movement families. Mirrors `MUSCLE_LABELS` — the two vocabularies are
 * orthogonal on purpose (`drizzle/0020_movement_patterns.sql`): muscles map 1:1 onto the
 * village's resources, patterns describe what the body is *doing*, and only the second one can
 * express "your pulling is behind your pushing".
 */
export const PATTERN_LABELS: Record<MovementPattern, Localized> = {
  push_horizontal: {
    en: "Horizontal push",
    fr: "Poussée horizontale",
    de: "Horizontales Drücken",
    es: "Empuje horizontal",
  },
  push_vertical: {
    en: "Vertical push",
    fr: "Poussée verticale",
    de: "Vertikales Drücken",
    es: "Empuje vertical",
  },
  pull_horizontal: {
    en: "Horizontal pull",
    fr: "Tirage horizontal",
    de: "Horizontales Ziehen",
    es: "Tirón horizontal",
  },
  pull_vertical: {
    en: "Vertical pull",
    fr: "Tirage vertical",
    de: "Vertikales Ziehen",
    es: "Tirón vertical",
  },
  squat: { en: "Squat", fr: "Squat", de: "Kniebeuge", es: "Sentadilla" },
  hinge: { en: "Hinge", fr: "Charnière", de: "Hüftbeuge", es: "Bisagra de cadera" },
  core: { en: "Core", fr: "Gainage", de: "Rumpf", es: "Core" },
  locomotion: { en: "Locomotion", fr: "Locomotion", de: "Fortbewegung", es: "Desplazamiento" },
  mobility: { en: "Mobility", fr: "Mobilité", de: "Mobilität", es: "Movilidad" },
};

/** The two families the research singles out: pulling is the weak point of training without a bar. */
export const PUSH_PATTERNS: readonly MovementPattern[] = ["push_horizontal", "push_vertical"];
export const PULL_PATTERNS: readonly MovementPattern[] = ["pull_horizontal", "pull_vertical"];

export function isMovementPattern(value: unknown): value is MovementPattern {
  return typeof value === "string" && (movementPatterns as readonly string[]).includes(value);
}
