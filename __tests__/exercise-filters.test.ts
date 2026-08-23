import {
  buildLeadsTo,
  type ExerciseFilters,
  filterExercises,
  NO_EXERCISE_FILTERS,
  rankSwapCandidates,
  type SwapCandidate,
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

describe("rankSwapCandidates", () => {
  const reasonOf = (out: SwapCandidate[], id: number) =>
    out.find((c) => c.exercise.id === id)?.reason;

  it("never offers the movement it is replacing", () => {
    const out = rankSwapCandidates(ALL, pullUp, null);
    expect(out.some((c) => c.exercise.id === pullUp.id)).toBe(false);
    expect(out).toHaveLength(ALL.length - 1);
  });

  /**
   * The regression this whole feature exists for. Every seeded `pull_vertical` movement needs a
   * bar, so "same pattern" alone hands a bar-less hero an empty sheet on a Pull-ups slot — and so
   * does a one-rung ladder step, because the rung below a pull-up is another pull-up. Only the
   * full walk reaches a movement they can actually do tonight.
   */
  it("reaches an equipment-free movement for a bar-less hero, through the ladder", () => {
    const out = rankSwapCandidates(ALL, pullUp, new Set());

    const firstFree = out.find((c) => c.exercise.equipment === "none");
    expect(firstFree).toBeDefined();
    expect(firstFree?.reason).not.toBeNull();

    // And it leads the list: nothing the hero cannot lift outranks something they can.
    expect(out[0]?.exercise.equipment).toBe("none");
  });

  it("sinks unowned equipment inside its tier instead of hiding it", () => {
    const barRow = makeExercise({
      id: 6,
      enName: "Bar Row",
      equipment: "pullup_bar",
      pattern: "pull_horizontal",
    });
    const out = rankSwapCandidates([...ALL, barRow], tableRow, new Set());

    // Still offered — the hero decides what is in the room — but behind the free ones.
    const positions = out.map((c) => c.exercise.id);
    expect(positions).toContain(barRow.id);
    expect(positions.indexOf(invertedRow.id)).toBeLessThan(positions.indexOf(barRow.id));
  });

  it("names why each movement is offered", () => {
    const out = rankSwapCandidates(ALL, invertedRow, null);

    expect(reasonOf(out, tableRow.id)).toBe("easier");
    expect(reasonOf(out, pullUp.id)).toBe("harder");
    // Off the ladder and a different family entirely.
    expect(reasonOf(out, pushUp.id)).toBeNull();
  });

  it("reports a same-pattern movement that is not on the ladder", () => {
    const dip = makeExercise({ id: 7, enName: "Dip", pattern: "push_horizontal" });
    const out = rankSwapCandidates([...ALL, dip], pushUp, null);

    expect(reasonOf(out, dip.id)).toBe("same_pattern");
  });

  it("falls back to the push/pull family when the pattern has nothing else", () => {
    const out = rankSwapCandidates(ALL, pullUp, null);

    // `pull_horizontal` is not `pull_vertical`, but it is the same family — which is what makes
    // the tail of the vertical-pull ladder reachable at all.
    expect(reasonOf(out, tableRow.id)).toBe("easier");
    expect(reasonOf(out, pushUp.id)).toBeNull();
  });

  it("still ranks a movement that declares no pattern", () => {
    const unclassified = makeExercise({ id: 8, enName: "Nap", prerequisiteExerciseId: 1 });
    const out = rankSwapCandidates([...ALL, unclassified], unclassified, null);

    expect(reasonOf(out, tableRow.id)).toBe("easier");
    expect(out).toHaveLength(ALL.length);
  });

  it("survives a prerequisite cycle in the seed rather than hanging a screen", () => {
    const a = makeExercise({ id: 20, enName: "A", prerequisiteExerciseId: 21 });
    const b = makeExercise({ id: 21, enName: "B", prerequisiteExerciseId: 20 });

    const out = rankSwapCandidates([a, b], a, null);
    expect(out.map((c) => c.exercise.id)).toEqual([21]);
  });
});
