import { Difficulty, formatTarget, generateTarget } from "@/db/targets";

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

  // Holds are prescribed at ~67% of the hero's longest logged hold, never to failure.
  describe("holds derived from a personal record", () => {
    const hold = { type: "time" as const, min: 30, max: 60 };

    it("is unchanged when no record exists", () => {
      // The whole point of the optional argument: a hero with no history trains exactly as before.
      expect(generateTarget(hold, Difficulty.Medium).value).toBe(45);
      expect(generateTarget(hold, Difficulty.Medium, null).value).toBe(45);
      expect(generateTarget(hold, Difficulty.Medium, undefined).value).toBe(45);
      expect(generateTarget(hold, Difficulty.Medium, 0).value).toBe(45);
    });

    it("prescribes ~67% of the record, inside the 60-75% window", () => {
      const value = generateTarget(hold, Difficulty.Medium, 60).value;
      expect(value).toBe(40);
      expect(value).toBeGreaterThanOrEqual(60 * 0.6);
      expect(value).toBeLessThanOrEqual(60 * 0.75);
    });

    it("never drops below the quest's own floor", () => {
      // `resultValue` records what the hero did, which is usually the target they were given
      // rather than their ceiling — unclamped, 67% would ratchet the prescription down forever.
      expect(generateTarget(hold, Difficulty.Medium, 10).value).toBe(30);
    });

    it("never exceeds the quest's own ceiling", () => {
      expect(generateTarget(hold, Difficulty.Medium, 600).value).toBe(60);
    });

    it("clamps against the level-scaled window, not the raw one", () => {
      // Easy scales 30-60 down to 23-45, so the same 600 s record stops at 45, not 60.
      expect(generateTarget(hold, Difficulty.Easy, 600).value).toBe(45);
      expect(generateTarget(hold, Difficulty.Hard, 600).value).toBe(75);
    });

    it("ignores the record for rep targets", () => {
      // 67% of a rep PR is just a smaller set — the research gives no such rule for reps.
      const reps = { type: "reps" as const, min: 10, max: 20 };
      expect(generateTarget(reps, Difficulty.Medium, 60).value).toBe(15);
    });
  });
});

describe("formatTarget", () => {
  // One source for these words: the session's ghost line has to read the same as the target
  // above it, and it used to live privately on the quest screen.
  test("names the unit the slot is measured in", () => {
    expect(formatTarget({ type: "reps", value: 12 })).toBe("12 reps");
    expect(formatTarget({ type: "time", value: 30 })).toBe("30s");
  });
});
