import type { Exercise } from "@/db/exercises";
import type { EquipmentCode, MovementPattern, MuscleCode } from "@/db/schema";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/**
 * What the catalogue can narrow by. Same shape of rules as `questFilters`, different facets —
 * an exercise has no duration and no archetype, and a quest has no ladder.
 */
export type ExerciseFilters = {
  muscles: Set<MuscleCode>;
  equipment: Set<EquipmentCode>;
  patterns: Set<MovementPattern>;
  /** Only movements that lead somewhere — the variation ladder, as a facet. */
  ladderOnly: boolean;
  search: string;
};

export const NO_EXERCISE_FILTERS: ExerciseFilters = {
  muscles: new Set(),
  equipment: new Set(),
  patterns: new Set(),
  ladderOnly: false,
  search: "",
};

/**
 * `prerequisite → the movement built on it`, for every rung of the ladder.
 *
 * Derived from the list rather than queried: `listExercises()` already carries
 * `prerequisiteExerciseId` and is promise-cached, so "what does this lead to" costs one pass
 * over ~66 rows instead of one seek per row.
 */
export function buildLeadsTo(exercises: Exercise[]): Map<number, Exercise> {
  const leadsTo = new Map<number, Exercise>();
  for (const e of exercises) {
    if (e.prerequisiteExerciseId !== null) leadsTo.set(e.prerequisiteExerciseId, e);
  }
  return leadsTo;
}

/**
 * Union (OR) inside a dimension, intersection (AND) across them, exactly as `matchesFilters`
 * does for quests: "(chest OR back) AND (no equipment) AND on a ladder". An empty dimension
 * matches everything.
 *
 * The search runs on the *localized* name — a French hero typing "tirage" has to find the row
 * that reads "Tirage", not miss it because the needle was compared against `enName`.
 */
/** An empty dimension matches everything; a null value never matches a non-empty one. */
const matchesOne = <T>(set: Set<T>, value: T | null): boolean =>
  set.size === 0 || (value !== null && set.has(value));

/** Same, for a value that is itself a list — one overlap is enough. */
const matchesAny = <T>(set: Set<T>, values: T[]): boolean =>
  set.size === 0 || values.some((v) => set.has(v));

export function filterExercises(
  exercises: Exercise[],
  filters: ExerciseFilters,
  language: AppLanguage,
  leadsTo: ReadonlyMap<number, unknown>,
): Exercise[] {
  const needle = filters.search.trim().toLowerCase();

  return exercises.filter(
    (e) =>
      (!needle || localizedName(e, language).toLowerCase().includes(needle)) &&
      (!filters.ladderOnly || leadsTo.has(e.id)) &&
      matchesAny(filters.muscles, e.muscles) &&
      matchesOne(filters.equipment, e.equipment) &&
      matchesOne(filters.patterns, e.pattern),
  );
}
