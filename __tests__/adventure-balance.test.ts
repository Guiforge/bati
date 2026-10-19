import { balanceFacts } from "@/components/adventures/balanceFacts";
import type { Exercise } from "@/db/exercises";
import { WEAK_SHARE_OF_IDEAL } from "@/db/patterns";
import type { QuestTemplate } from "@/db/quests";
import { type MovementPattern, type MuscleCode, muscleCodes } from "@/db/schema";

// Exercise ids: 1 push chest, 2 pull back, 3 push+pull-free legs squat (no pattern), 4 no muscle (outing).
const ex = (id: number, muscles: MuscleCode[], pattern: MovementPattern | null) =>
  ({ id, muscles, pattern }) as unknown as Exercise;
const CATALOGUE: Record<number, Exercise> = {
  1: ex(1, ["chest"], "push_horizontal"),
  2: ex(2, ["back"], "pull_horizontal"),
  3: ex(3, ["legs"], null),
  4: ex(4, [], null),
  5: ex(5, ["arms", "shoulder", "abs", "legs", "chest", "back"], null),
};
const step = (...exerciseIds: number[]) =>
  ({ exercises: exerciseIds.map((exerciseId) => ({ exerciseId })) }) as unknown as QuestTemplate;
const kinds = (steps: QuestTemplate[]) => balanceFacts(steps, CATALOGUE).map((f) => f.kind);

describe("push_streak", () => {
  test("three push-only steps in a row make one, two do not", () => {
    expect(balanceFacts([step(1), step(1), step(1)], CATALOGUE)[0]).toEqual({
      kind: "push_streak",
      count: 3,
    });
    expect(kinds([step(1), step(1)])).not.toContain("push_streak");
  });

  test("a pull step in the middle breaks the streak", () => {
    expect(kinds([step(1), step(1), step(2), step(1), step(1)])).not.toContain("push_streak");
  });

  test("a step with push and pull does not push", () => {
    expect(kinds([step(1), step(1, 2), step(1)])).not.toContain("push_streak");
  });

  test("a step of a movement with no pattern ends the run", () => {
    expect(kinds([step(1), step(1), step(3), step(1)])).not.toContain("push_streak");
    expect(kinds([step(3), step(3), step(3)])).toEqual(["absent"]);
  });
});

describe("pull_deficit", () => {
  test("push slots at 2 or more and pull under half, without a streak", () => {
    expect(balanceFacts([step(1), step(2), step(1), step(3), step(1)], CATALOGUE)[0]).toEqual({
      kind: "pull_deficit",
      push: 3,
      pull: 1,
    });
  });

  test("not with a single push slot, not with enough pull, not beside a streak", () => {
    expect(kinds([step(1), step(3)])).not.toContain("pull_deficit");
    expect(kinds([step(1), step(1), step(2), step(2)])).not.toContain("pull_deficit");
    expect(kinds([step(1), step(1), step(1)])).toEqual(["push_streak", "absent"]);
  });
});

describe("muscle facts", () => {
  test("absent lists the zero-hit muscles in muscleCodes order", () => {
    const [fact] = balanceFacts([step(1), step(2)], CATALOGUE);
    expect(fact).toEqual({
      kind: "absent",
      muscles: muscleCodes.filter((m) => m !== "chest" && m !== "back"),
    });
  });

  test("light only when nothing is absent, with a threshold of WEAK_SHARE_OF_IDEAL / count", () => {
    // 5 gives every muscle one hit. Seven chest steps more: the rest are 1/13 = 7.7 percent,
    // under 0.5/6 = 8.3 percent; chest itself is not light.
    const heavy = Array.from({ length: 7 }, () => step(1));
    const facts = balanceFacts([step(5), ...heavy], CATALOGUE);
    const light = facts.find((f) => f.kind === "light");
    expect(light?.kind === "light" && light.muscles).toEqual(
      muscleCodes.filter((m) => m !== "chest"),
    );
    // A muscle at exactly the threshold is not light: 6 muscles, share 1/12 = 0.5/6.
    expect(WEAK_SHARE_OF_IDEAL / muscleCodes.length).toBeCloseTo(1 / 12);
    const exact = [step(5), step(1), step(1), step(1), step(1), step(1), step(1)];
    // total = 6 + 6 = 12, five muscles at 1/12, chest at 7/12.
    expect(kinds(exact)).not.toContain("light");
  });

  test("a muscle only a movement with no pattern works is not absent", () => {
    expect(kinds([step(3), step(1), step(2)])).not.toEqual(
      expect.arrayContaining(["pull_deficit"]),
    );
    const facts = balanceFacts([step(3), step(1)], CATALOGUE);
    const absent = facts.find((f) => f.kind === "absent");
    expect(absent?.kind === "absent" && absent.muscles).not.toContain("legs");
  });
});

describe("no fact", () => {
  test("all outings, or movements with no muscle: nothing, not six absent muscles", () => {
    expect(balanceFacts([step(4), step(4), step(4)], CATALOGUE)).toEqual([]);
    expect(balanceFacts([step(4), step(4)], CATALOGUE)).toEqual([]);
  });

  test("unknown exercise ids contribute nothing", () => {
    expect(balanceFacts([step(99), step(99), step(99)], CATALOGUE)).toEqual([]);
  });

  test("no steps: nothing", () => {
    expect(balanceFacts([], CATALOGUE)).toEqual([]);
  });

  test("three steps of a movement with no pattern give no streak and no deficit", () => {
    expect(kinds([step(3), step(3), step(3)])).not.toContain("push_streak");
    expect(kinds([step(3), step(3), step(3)])).not.toContain("pull_deficit");
  });
});
