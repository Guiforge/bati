import {
  matchesFilters,
  NO_FILTERS,
  type QuestFilters,
  toggleInSet,
} from "@/constants/questFilters";
import type { EquipmentCode, MuscleCode } from "@/db/schema";

// The gallery rail is JSX; this predicate is the only real logic behind it. What matters:
// OR inside a dimension, AND across dimensions, and that "≤ 30 min" swallows the short ones.

const quest = (muscles: MuscleCode[], equipment: EquipmentCode[], durationSeconds: number) => ({
  muscles,
  equipment,
  durationSeconds,
});

const filters = (over: Partial<QuestFilters> = {}): QuestFilters => ({
  ...NO_FILTERS,
  ...over,
});

const chestDumbbell10min = quest(["chest"], ["dumbbell"], 10 * 60);
const backNone45min = quest(["back"], ["none"], 45 * 60);

test("no filters lets everything through", () => {
  expect(matchesFilters(chestDumbbell10min, NO_FILTERS)).toBe(true);
  expect(matchesFilters(backNone45min, NO_FILTERS)).toBe(true);
});

test("muscles are a union — chest OR back matches both", () => {
  const f = filters({ muscles: new Set<MuscleCode>(["chest", "back"]) });

  expect(matchesFilters(chestDumbbell10min, f)).toBe(true);
  expect(matchesFilters(backNone45min, f)).toBe(true);
  expect(matchesFilters(quest(["legs"], ["none"], 600), f)).toBe(false);
});

test("dimensions intersect — right muscle but wrong equipment is out", () => {
  const f = filters({
    muscles: new Set<MuscleCode>(["chest"]),
    equipment: new Set<EquipmentCode>(["none"]),
  });

  expect(matchesFilters(chestDumbbell10min, f)).toBe(false);
  expect(matchesFilters(quest(["chest"], ["none"], 600), f)).toBe(true);
});

test("duration buckets — 30 min or less includes the short quests", () => {
  const short = filters({ duration: "short" });
  const medium = filters({ duration: "medium" });
  const long = filters({ duration: "long" });

  expect(matchesFilters(chestDumbbell10min, short)).toBe(true);
  expect(matchesFilters(chestDumbbell10min, medium)).toBe(true);
  expect(matchesFilters(chestDumbbell10min, long)).toBe(false);

  expect(matchesFilters(backNone45min, short)).toBe(false);
  expect(matchesFilters(backNone45min, medium)).toBe(false);
  expect(matchesFilters(backNone45min, long)).toBe(true);

  // Boundaries: 15 and 30 min fall inside their own bucket, not the next one up.
  expect(matchesFilters(quest(["chest"], ["dumbbell"], 15 * 60), short)).toBe(true);
  expect(matchesFilters(quest(["chest"], ["dumbbell"], 30 * 60), medium)).toBe(true);
  expect(matchesFilters(quest(["chest"], ["dumbbell"], 30 * 60), long)).toBe(false);
});

test("toggleInSet adds then removes, without mutating the original", () => {
  const empty = new Set<MuscleCode>();
  const withChest = toggleInSet(empty, "chest");

  expect([...withChest]).toEqual(["chest"]);
  expect(empty.size).toBe(0);
  expect([...toggleInSet(withChest, "chest")]).toEqual([]);
});
