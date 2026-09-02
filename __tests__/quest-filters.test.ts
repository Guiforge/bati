import {
  galleryOrder,
  matchesFilters,
  NO_FILTERS,
  type QuestFilters,
  toggleInSet,
} from "@/constants/questFilters";
import type { EquipmentCode, MuscleCode, QuestArchetype } from "@/db/schema";

// The gallery rail is JSX; this predicate is the only real logic behind it. What matters:
// OR inside a dimension, AND across dimensions, and that "≤ 30 min" swallows the short ones.

const quest = (
  muscles: MuscleCode[],
  equipment: EquipmentCode[],
  durationSeconds: number,
  archetype: QuestArchetype | null = null,
  outside = false,
) => ({
  muscles,
  equipment,
  durationSeconds,
  archetype,
  outside,
});

// The three seeded outings, as `matchesFilters` sees them: no muscles at all (an expedition
// converts to zero rep-equivalents, so tagging it `legs` would lie to the balance card), the
// same `metabolic` archetype every continuous-effort quest declares, and no equipment.
const expedition = (durationSeconds: number) =>
  quest([], ["none"], durationSeconds, "metabolic", true);
const wardensRound = expedition(15 * 60);
const messengersRoad = expedition(15 * 60);
const outridersWay = expedition(20 * 60);

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

test("equipment is what the hero has — bodyweight always fits, anything else must be selected", () => {
  const noEquipment = filters({ equipment: new Set<EquipmentCode>(["none"]) });
  const pullupBar = filters({ equipment: new Set<EquipmentCode>(["pullup_bar"]) });
  const mixed = quest(["back"], ["none", "pullup_bar"], 600);

  // One pull-up in a bodyweight quest is not a bodyweight quest.
  expect(matchesFilters(mixed, noEquipment)).toBe(false);
  expect(matchesFilters(backNone45min, noEquipment)).toBe(true);
  // Owning a bar does not rule out the quests that never needed one.
  expect(matchesFilters(mixed, pullupBar)).toBe(true);
  expect(matchesFilters(backNone45min, pullupBar)).toBe(true);
  expect(matchesFilters(chestDumbbell10min, pullupBar)).toBe(false);
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

test("archetype filter — a quest with no archetype is not 'strength'", () => {
  const f = filters({ archetypes: new Set<QuestArchetype>(["strength"]) });

  expect(matchesFilters(quest(["chest"], ["none"], 600, "strength"), f)).toBe(true);
  expect(matchesFilters(quest(["chest"], ["none"], 600, "circuit"), f)).toBe(false);
  // User-authored quests declare none, and must not slip into a filter they never claimed.
  expect(matchesFilters(chestDumbbell10min, f)).toBe(false);
});

test("toggleInSet adds then removes, without mutating the original", () => {
  const empty = new Set<MuscleCode>();
  const withChest = toggleInSet(empty, "chest");

  expect([...withChest]).toEqual(["chest"]);
  expect(empty.size).toBe(0);
  expect([...toggleInSet(withChest, "chest")]).toEqual([]);
});

describe("the Outside dimension", () => {
  const outside = filters({ outside: true });
  const indoors = [chestDumbbell10min, backNone45min, quest(["legs"], ["none"], 600, "metabolic")];

  test("returns exactly the expeditions and excludes everything else", () => {
    expect(
      [wardensRound, messengersRoad, outridersWay, ...indoors].filter((q) =>
        matchesFilters(q, outside),
      ),
    ).toEqual([wardensRound, messengersRoad, outridersWay]);
  });

  test("off means 'not asked', never 'indoors only'", () => {
    // The chip is one boolean, so its off state has to leave the outings in the gallery — the
    // failure mode is a filter that hides three quests nobody asked it to hide.
    for (const q of [wardensRound, ...indoors]) {
      expect(matchesFilters(q, NO_FILTERS)).toBe(true);
    }
  });

  test("intersects the other dimensions like every rail before it", () => {
    expect(matchesFilters(wardensRound, filters({ outside: true, duration: "short" }))).toBe(true);
    expect(matchesFilters(outridersWay, filters({ outside: true, duration: "short" }))).toBe(false);
    // A metabolic archetype is shared with indoor circuits, which is the whole problem the chip
    // exists to solve: asking for both must not widen either.
    expect(
      matchesFilters(
        quest(["legs"], ["none"], 600, "metabolic"),
        filters({ outside: true, archetypes: new Set<QuestArchetype>(["metabolic"]) }),
      ),
    ).toBe(false);
  });

  test("a muscle filter still hides them, which is why the chip had to exist", () => {
    // Deliberately unchanged: "Chest" must mean chest, exactly as "Strength" must mean strength.
    // Pinned so nobody makes muscle-less quests match every muscle to fix discovery — Outside is
    // the fix, and this asserts the two are not confused.
    expect(matchesFilters(wardensRound, filters({ muscles: new Set<MuscleCode>(["legs"]) }))).toBe(
      false,
    );
  });
});

/**
 * The gallery's order, and mostly what it leaves alone.
 *
 * Seed order is authored: the gallery opens on a curated first card, and the catalogue below it
 * is a sequence someone chose. Pinning is the hero's own thumb on that sequence, and it must lift
 * exactly what they pinned without shuffling anything else on the way past.
 */
describe("galleryOrder", () => {
  const q = (id: number) => ({ id });
  const seed = [q(1), q(2), q(3), q(4), q(5)];
  const mine = (x: { id: number }) => x.id === 4;
  const ids = (list: { id: number }[]) => list.map((x) => x.id);

  test("with nothing pinned, the hero's own quests lead and seed order is untouched", () => {
    expect(ids(galleryOrder(seed, mine, new Set()))).toEqual([4, 1, 2, 3, 5]);
  });

  test("a pinned quest goes to the very top, above the hero's own", () => {
    expect(ids(galleryOrder(seed, mine, new Set([3])))).toEqual([3, 4, 1, 2, 5]);
  });

  test("several pins keep their order relative to each other", () => {
    expect(ids(galleryOrder(seed, mine, new Set([5, 2])))).toEqual([2, 5, 4, 1, 3]);
  });

  test("a pin on an id no quest has changes nothing", () => {
    expect(ids(galleryOrder(seed, mine, new Set([999])))).toEqual([4, 1, 2, 3, 5]);
  });

  test("does not mutate the list it was handed", () => {
    const original = [...seed];
    galleryOrder(seed, mine, new Set([5]));
    expect(seed).toEqual(original);
  });
});
