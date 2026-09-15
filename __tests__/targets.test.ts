import {
  Difficulty,
  formatCount,
  formatTarget,
  formatTargetValue,
  generateTarget,
  retargetForMovement,
} from "@/db/targets";

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
    expect(formatTarget({ type: "reps", value: 12 }, "en")).toBe("12 reps");
    expect(formatTarget({ type: "reps", value: 12 }, "de")).toBe("12 Wdh.");
    expect(formatTarget({ type: "time", value: 30 }, "en")).toBe("30s");
    expect(formatTarget({ type: "time", value: 30 }, "fr")).toBe("30 s");
  });

  // One rule for every screen. A 60 s hold read "60s" in the session, "1:00" in the Journal and
  // "1 min" on the quest row, and 1000 reps read "1000 reps" beside the Journal's "1,000".
  test("a hold is seconds under a minute and a clock from 60 s", () => {
    const hold = (value: number, language: "en" | "fr" | "de" | "es") =>
      formatTarget({ type: "time", value }, language);
    expect(hold(59, "en")).toBe("59s");
    expect(hold(59, "fr")).toBe("59 s");
    expect(hold(59, "de")).toBe("59 s");
    expect(hold(59, "es")).toBe("59 s");
    for (const language of ["en", "fr", "de", "es"] as const) {
      expect(hold(60, language)).toBe("1:00");
      expect(hold(61, language)).toBe("1:01");
      expect(hold(3600, language)).toBe("60:00");
    }
  });

  test("a count takes the language's thousands separator", () => {
    const reps = (value: number, language: "en" | "fr" | "de" | "es") =>
      formatTarget({ type: "reps", value }, language);
    expect(reps(999, "en")).toBe("999 reps");
    expect(reps(1000, "en")).toBe("1,000 reps");
    // CLDR: French groups with a narrow no-break space, Spanish only from five digits.
    expect(reps(1000, "fr")).toBe("1 000 reps");
    expect(reps(1000, "de")).toBe("1.000 Wdh.");
    expect(reps(1000, "es")).toBe("1000 reps");
    expect(formatCount("es", 10_000)).toBe("10.000");
  });

  test("a column of sets drops the rep word and keeps the hold's shape", () => {
    expect(formatTargetValue({ type: "reps", value: 1000 }, "en")).toBe("1,000");
    expect(formatTargetValue({ type: null, value: 12 }, "en")).toBe("12");
    expect(formatTargetValue({ type: "time", value: 45 }, "fr")).toBe("45 s");
    expect(formatTargetValue({ type: "time", value: 64 }, "fr")).toBe("1:04");
  });
});

describe("retargetForMovement", () => {
  const repSlot = { type: "reps" as const, value: 22 };

  test("keeps the slot's target when the movement is measured the same way, or never said", () => {
    expect(retargetForMovement(repSlot, { measure: "reps" }, Difficulty.Medium)).toBe(repSlot);
    expect(retargetForMovement(repSlot, { measure: null }, Difficulty.Medium)).toBe(repSlot);
  });

  // The bug: Squat (22 reps) swapped for Superman, a hold everywhere in the seeds, ran as
  // "22 reps of Superman" — and that row then poisoned records, volume, XP and the ladder.
  test("a hold landing in a rep slot runs in seconds, at the hero's level", () => {
    expect(retargetForMovement(repSlot, { measure: "time" }, Difficulty.Medium)).toEqual({
      type: "time",
      value: 30,
    });
    // 25 rather than 23: time targets land on the five-second grid the stepper moves in, so a
    // prescription is always a value the hero could have dialled themselves.
    expect(retargetForMovement(repSlot, { measure: "time" }, Difficulty.Easy).value).toBe(25);
  });
});
