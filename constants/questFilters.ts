import type { EquipmentCode, MuscleCode } from "@/db/schema";

/**
 * How much time the hero has right now. Single-select on purpose: you only ever have one
 * amount of time, and "30 min or less" is expected to include the 10-minute quests.
 */
export type DurationBucket = "short" | "medium" | "long";

export const DURATION_BUCKETS: DurationBucket[] = ["short", "medium", "long"];

export type QuestFilters = {
  muscles: Set<MuscleCode>;
  equipment: Set<EquipmentCode>;
  duration: DurationBucket | null;
};

export const NO_FILTERS: QuestFilters = {
  muscles: new Set(),
  equipment: new Set(),
  duration: null,
};

/** Only what filtering reads — QuestMeta satisfies it structurally. */
type Filterable = {
  muscles: MuscleCode[];
  equipment: EquipmentCode[];
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
 */
export function matchesFilters(quest: Filterable, filters: QuestFilters): boolean {
  if (filters.muscles.size > 0 && !quest.muscles.some((c) => filters.muscles.has(c))) return false;
  if (filters.equipment.size > 0 && !quest.equipment.some((c) => filters.equipment.has(c))) {
    return false;
  }
  return matchesDuration(quest.durationSeconds, filters.duration);
}

export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (!next.delete(value)) next.add(value);
  return next;
}
