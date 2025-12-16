import { Difficulty, generateTarget } from "@/db/targets";

describe("generateTarget", () => {
  it("scales reps by user level (easy < medium < hard)", () => {
    const base = { type: "reps" as const, min: 10, max: 20 };

    expect(generateTarget(base, Difficulty.Easy).value).toBe(12);
    expect(generateTarget(base, Difficulty.Medium).value).toBe(15);
    expect(generateTarget(base, Difficulty.Hard).value).toBe(19);
  });

  it("handles inverted ranges and keeps minimum at 1", () => {
    const inverted = { type: "time" as const, min: 0, max: -10 };
    expect(generateTarget(inverted, Difficulty.Medium)).toEqual({
      type: "time",
      value: 1,
    });
  });
});
