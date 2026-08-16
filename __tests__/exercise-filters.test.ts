import {
  buildLeadsTo,
  type ExerciseFilters,
  filterExercises,
  NO_EXERCISE_FILTERS,
} from "@/constants/exerciseFilters";
import type { Exercise } from "@/db/exercises";

function makeExercise(over: Partial<Exercise> & Pick<Exercise, "id">): Exercise {
  return {
    enName: "Exercise",
    frName: "Exercice",
    enDescription: "",
    frDescription: "",
    imagePath: "assets/placeholder.webp",
    creator: "Admin",
    difficulty: "medium",
    equipment: "none",
    style: "calisthenics",
    secondsPerRep: 3,
    muscles: [],
    pattern: null,
    prerequisiteExerciseId: null,
    ...over,
  };
}

// The pull ladder as `0022` seeds it, cut to three rungs.
const tableRow = makeExercise({
  id: 1,
  enName: "Table Row",
  frName: "Tirage sous table",
  muscles: ["back"],
  pattern: "pull_horizontal",
});
const invertedRow = makeExercise({
  id: 2,
  enName: "Inverted Row",
  frName: "Tirage australien",
  muscles: ["back", "arms"],
  pattern: "pull_horizontal",
  prerequisiteExerciseId: 1,
});
const pullUp = makeExercise({
  id: 3,
  enName: "Pull-up",
  frName: "Traction",
  muscles: ["back"],
  equipment: "pullup_bar",
  pattern: "pull_vertical",
  prerequisiteExerciseId: 2,
});
// Off the ladder entirely: nothing leads to it, it leads nowhere.
const pushUp = makeExercise({
  id: 4,
  enName: "Push-up",
  frName: "Pompe",
  muscles: ["chest"],
  pattern: "push_horizontal",
});

const ALL = [tableRow, invertedRow, pullUp, pushUp];
const LEADS_TO = buildLeadsTo(ALL);

const withFilters = (over: Partial<ExerciseFilters>): ExerciseFilters => ({
  ...NO_EXERCISE_FILTERS,
  ...over,
});

const ids = (list: Exercise[]) => list.map((e) => e.id);

describe("buildLeadsTo", () => {
  it("maps a movement to the harder variation built on it", () => {
    expect(LEADS_TO.get(tableRow.id)).toBe(invertedRow);
    expect(LEADS_TO.get(invertedRow.id)).toBe(pullUp);
  });

  it("leaves the top of a ladder and off-ladder movements out", () => {
    expect(LEADS_TO.has(pullUp.id)).toBe(false);
    expect(LEADS_TO.has(pushUp.id)).toBe(false);
  });
});

describe("filterExercises", () => {
  it("returns everything when no facet is set", () => {
    expect(ids(filterExercises(ALL, NO_EXERCISE_FILTERS, "en", LEADS_TO))).toEqual([1, 2, 3, 4]);
  });

  it("searches the English name, case-insensitively", () => {
    const out = filterExercises(ALL, withFilters({ search: "  PULL-UP " }), "en", LEADS_TO);
    expect(ids(out)).toEqual([3]);
  });

  // The bug `localizedName` exists to prevent: a French hero typing a French word found
  // nothing, because the needle was compared against `enName`.
  it("searches the French name when the language is French", () => {
    const out = filterExercises(ALL, withFilters({ search: "tirage" }), "fr", LEADS_TO);
    expect(ids(out)).toEqual([1, 2]);

    expect(ids(filterExercises(ALL, withFilters({ search: "tirage" }), "en", LEADS_TO))).toEqual(
      [],
    );
  });

  it("keeps only movements that lead somewhere when ladderOnly is on", () => {
    expect(ids(filterExercises(ALL, withFilters({ ladderOnly: true }), "en", LEADS_TO))).toEqual([
      1, 2,
    ]);
  });

  it("unions inside a dimension (chest OR back)", () => {
    const out = filterExercises(
      ALL,
      withFilters({ muscles: new Set(["chest", "back"]) }),
      "en",
      LEADS_TO,
    );
    expect(ids(out)).toEqual([1, 2, 3, 4]);
  });

  it("intersects across dimensions (back AND no equipment)", () => {
    const out = filterExercises(
      ALL,
      withFilters({ muscles: new Set(["back"]), equipment: new Set(["none"]) }),
      "en",
      LEADS_TO,
    );
    expect(ids(out)).toEqual([1, 2]);
  });

  it("filters on the movement pattern", () => {
    const out = filterExercises(
      ALL,
      withFilters({ patterns: new Set(["pull_vertical"]) }),
      "en",
      LEADS_TO,
    );
    expect(ids(out)).toEqual([3]);
  });

  // Same rule the quest archetype filter follows: "Squat" must mean squat, so a movement with
  // no declared pattern drops out rather than matching everything.
  it("drops movements with no pattern from a pattern filter", () => {
    const unclassified = makeExercise({ id: 5, enName: "Nap", pattern: null });
    const out = filterExercises(
      [...ALL, unclassified],
      withFilters({ patterns: new Set(["squat"]) }),
      "en",
      LEADS_TO,
    );
    expect(ids(out)).toEqual([]);
  });

  it("combines the search with the facets", () => {
    const out = filterExercises(
      ALL,
      withFilters({ search: "row", ladderOnly: true, muscles: new Set(["arms"]) }),
      "en",
      LEADS_TO,
    );
    expect(ids(out)).toEqual([2]);
  });
});
