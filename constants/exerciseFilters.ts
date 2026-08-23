import type { Exercise } from "@/db/exercises";
import { PULL_PATTERNS, PUSH_PATTERNS } from "@/db/patterns";
import type { DifficultyCode, EquipmentCode, MovementPattern, MuscleCode } from "@/db/schema";
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

/**
 * Why a movement is being offered as a replacement. `null` means "nothing in common" — the tail
 * of the list, reachable but never explained.
 */
export type SwapReason = "easier" | "harder" | "same_pattern" | "same_family";

export type SwapCandidate = { exercise: Exercise; reason: SwapReason | null };

const DIFFICULTY_RANK: Record<DifficultyCode, number> = { easy: 0, medium: 1, hard: 2 };

/** Owned, or free, or the question was never asked — `null` means "allow everything". */
function isAffordable(exercise: Exercise, owned: ReadonlySet<EquipmentCode> | null): boolean {
  return owned === null || exercise.equipment === "none" || owned.has(exercise.equipment);
}

/**
 * Every rung of `current`'s ladder, in both directions, transitively.
 *
 * Transitively, and this is the part that decides whether the feature works at all. Verified
 * against the seeded catalogue: `pull_vertical` holds 6 movements and **all 6 need a bar**, so a
 * hero without one has no same-pattern option whatsoever on a Pull-ups slot. The ladder is the
 * way out — but only walked to its end, because it takes six rungs to reach the first
 * equipment-free movement, and it crosses into `pull_horizontal` on the way (Dead Hang's
 * prerequisite is an Inverted Row). A one-step walk returns another movement on a bar.
 *
 * `seen` guards a seed cycle rather than trusting the data: a prerequisite loop would hang the
 * app on a screen, which is a bad place to discover a content mistake.
 */
function ladderOf(
  exercises: Exercise[],
  current: Exercise,
): Map<number, Extract<SwapReason, "easier" | "harder">> {
  const byId = new Map(exercises.map((e) => [e.id, e] as const));
  const leadsTo = buildLeadsTo(exercises);
  const found = new Map<number, Extract<SwapReason, "easier" | "harder">>();
  const seen = new Set<number>([current.id]);

  let down = byId.get(current.prerequisiteExerciseId ?? -1);
  while (down && !seen.has(down.id)) {
    seen.add(down.id);
    found.set(down.id, "easier");
    down = byId.get(down.prerequisiteExerciseId ?? -1);
  }

  let up = leadsTo.get(current.id);
  while (up && !seen.has(up.id)) {
    seen.add(up.id);
    found.set(up.id, "harder");
    up = leadsTo.get(up.id);
  }

  return found;
}

function familyOf(pattern: MovementPattern | null): readonly MovementPattern[] | null {
  if (pattern === null) return null;
  if (PUSH_PATTERNS.includes(pattern)) return PUSH_PATTERNS;
  if (PULL_PATTERNS.includes(pattern)) return PULL_PATTERNS;
  return null;
}

/**
 * What the hero can put in this slot instead, best first.
 *
 * Four tiers — the ladder, then the same pattern, then the same push/pull family, then the rest —
 * and **nothing is ever removed**. Equipment the hero does not own sinks to the bottom of its tier
 * rather than disappearing: `getOwnedEquipment()` returns `null` until the question is answered,
 * a kitchen table is not fitness gear, and the hero is the only one who knows what is in the room.
 */
export function rankSwapCandidates(
  exercises: Exercise[],
  current: Exercise,
  owned: ReadonlySet<EquipmentCode> | null,
): SwapCandidate[] {
  const ladder = ladderOf(exercises, current);
  const family = familyOf(current.pattern);

  const tier = (e: Exercise): number => {
    if (ladder.has(e.id)) return 0;
    if (current.pattern !== null && e.pattern === current.pattern) return 1;
    if (family !== null && e.pattern !== null && family.includes(e.pattern)) return 2;
    return 3;
  };

  const reason = (e: Exercise): SwapReason | null => {
    const rung = ladder.get(e.id);
    if (rung) return rung;
    if (current.pattern !== null && e.pattern === current.pattern) return "same_pattern";
    if (family !== null && e.pattern !== null && family.includes(e.pattern)) return "same_family";
    return null;
  };

  return exercises
    .filter((e) => e.id !== current.id)
    .map((e) => ({ exercise: e, tier: tier(e), reason: reason(e) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;

      const affordable =
        Number(isAffordable(b.exercise, owned)) - Number(isAffordable(a.exercise, owned));
      if (affordable !== 0) return affordable;

      const closeness =
        Math.abs(DIFFICULTY_RANK[a.exercise.difficulty] - DIFFICULTY_RANK[current.difficulty]) -
        Math.abs(DIFFICULTY_RANK[b.exercise.difficulty] - DIFFICULTY_RANK[current.difficulty]);
      if (closeness !== 0) return closeness;

      // Last resort so the order is stable between renders rather than dependent on input order.
      return a.exercise.id - b.exercise.id;
    })
    .map(({ exercise, reason: why }) => ({ exercise, reason: why }));
}
