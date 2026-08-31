import type { EquipmentCode, MuscleCode, QuestArchetype } from "@/db/schema";

/**
 * How much time the hero has right now. Single-select on purpose: you only ever have one
 * amount of time, and "30 min or less" is expected to include the 10-minute quests.
 */
export type DurationBucket = "short" | "medium" | "long";

export const DURATION_BUCKETS: DurationBucket[] = ["short", "medium", "long"];

export type QuestFilters = {
  muscles: Set<MuscleCode>;
  equipment: Set<EquipmentCode>;
  archetypes: Set<QuestArchetype>;
  /**
   * "Show me the ones that happen outdoors." A boolean rather than a set: there is one word to
   * say here, so there is one chip, and an off chip has to mean "not asked" and never "indoors
   * only" — a hero who has not chosen still wants the walks in the list.
   */
  outside: boolean;
  duration: DurationBucket | null;
};

export const NO_FILTERS: QuestFilters = {
  muscles: new Set(),
  equipment: new Set(),
  archetypes: new Set(),
  outside: false,
  duration: null,
};

/** Only what filtering reads — QuestMeta satisfies it structurally. */
type Filterable = {
  muscles: MuscleCode[];
  equipment: EquipmentCode[];
  /** Null on user-authored quests, which declare no archetype. */
  archetype: QuestArchetype | null;
  /** True when any of the quest's movements is an expedition — `NON_REP_STYLE`. */
  outside: boolean;
  durationSeconds: number;
};

function matchesDuration(seconds: number, bucket: DurationBucket | null): boolean {
  if (!bucket) return true;
  if (bucket === "short") return seconds <= 15 * 60;
  if (bucket === "medium") return seconds <= 30 * 60;
  return seconds > 30 * 60;
}

/**
 * Union (OR) inside a dimension, intersection (AND) across them:
 * "(chest OR back) AND (dumbbells) AND (≤ 30 min)". An empty dimension matches everything.
 *
 * Equipment is the one dimension read as "what I have": every exercise must be doable with the
 * selection, bodyweight always is. "Any exercise uses it" matched 33 of 34 seed quests for
 * "no equipment", which is a filter that does nothing.
 */
export function matchesFilters(quest: Filterable, filters: QuestFilters): boolean {
  if (filters.muscles.size > 0 && !quest.muscles.some((c) => filters.muscles.has(c))) return false;
  if (
    filters.equipment.size > 0 &&
    quest.equipment.some((c) => c !== "none" && !filters.equipment.has(c))
  ) {
    return false;
  }
  // A hero training for strength can now say so. Quests with no archetype drop out of an
  // archetype filter rather than matching everything — "Strength" must mean strength.
  if (filters.archetypes.size > 0) {
    if (quest.archetype === null || !filters.archetypes.has(quest.archetype)) return false;
  }
  // The only chip that says "leave the house". An expedition declares `metabolic` like every
  // other continuous-effort session and carries no muscles at all, so every other dimension
  // either files it under Cardio or drops it — three quests out of 41 with no way to ask for them.
  if (filters.outside && !quest.outside) return false;
  return matchesDuration(quest.durationSeconds, filters.duration);
}

export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}
