import { localizedTable } from "@/src/i18n/copy";
import type { Localized } from "@/src/i18n/deviceLanguage";
import { type MovementPattern, movementPatterns } from "./schema";

/**
 * Labels for the movement families. Mirrors `MUSCLE_LABELS` — the two vocabularies are
 * orthogonal on purpose (`drizzle/0020_movement_patterns.sql`): muscles map 1:1 onto the
 * village's resources, patterns describe what the body is *doing*, and only the second one can
 * express "your pulling is behind your pushing".
 */
export const PATTERN_LABELS: Record<MovementPattern, Localized> = localizedTable((l) => l.patterns);

/** The two families the research singles out: pulling is the weak point of training without a bar. */
export const PUSH_PATTERNS: readonly MovementPattern[] = ["push_horizontal", "push_vertical"];
export const PULL_PATTERNS: readonly MovementPattern[] = ["pull_horizontal", "pull_vertical"];

export function isMovementPattern(value: unknown): value is MovementPattern {
  return typeof value === "string" && (movementPatterns as readonly string[]).includes(value);
}

/**
 * Pulling should not sit far below pushing. Below half is the point where it is worth saying
 * something — the hero is not "a bit unbalanced", they are building a posture problem. Read by the
 * Coach's pull deficit and by the adventure editor's balance sentences.
 *
 * ponytail: one flat ratio, not a per-pattern model. The research gives a direction, not a
 * number; refine it if heroes start reporting the nudge as noise.
 */
export const PULL_DEFICIT_RATIO = 0.5;

/** A muscle under this share of its ideal share is weak. A fraction: each reader multiplies by its own unit. */
export const WEAK_SHARE_OF_IDEAL = 0.5;
