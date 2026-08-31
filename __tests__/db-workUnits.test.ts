import { NON_REP_STYLE, SECONDS_PER_REP_EQUIVALENT, toRepEquivalent } from "@/db/workUnits";

describe("db/workUnits", () => {
  test("reps pass through untouched", () => {
    expect(toRepEquivalent(20, "reps", "strength")).toBe(20);
    expect(toRepEquivalent(0, "reps", "strength")).toBe(0);
  });

  test("seconds become rep-equivalents", () => {
    expect(toRepEquivalent(60, "time", "strength")).toBe(60 / SECONDS_PER_REP_EQUIVALENT);
    expect(toRepEquivalent(30, "time", "strength")).toBe(10);
  });

  // The whole point of the bug: at face value a 60 s hold outweighed a 20-rep set six to one.
  test("a 60 s hold and a 20-rep set weigh the same", () => {
    expect(toRepEquivalent(60, "time", "strength")).toBe(toRepEquivalent(20, "reps", "strength"));
  });

  // A hold shorter than the divisor is still work — it must never round away to zero, or a
  // muscle trained only in short holds would read as untrained.
  test("a hold shorter than one rep-equivalent still counts as one", () => {
    expect(toRepEquivalent(1, "time", "strength")).toBe(1);
    expect(toRepEquivalent(2, "time", "strength")).toBe(1);
  });

  // `targetType` is nullable on questExercises — the boss maths passes it straight through.
  test("a missing type is treated as reps", () => {
    expect(toRepEquivalent(15, null, "strength")).toBe(15);
    expect(toRepEquivalent(15, undefined, "strength")).toBe(15);
  });

  // The reason this function learned about styles at all. Boss HP runs from 278 to 1115 for a
  // whole campaign and damage has no ceiling, so an hour of walking at 3 s per rep would be
  // 1200 damage — one walk, every boss in the game. Cardio is measured in leagues instead.
  describe("cardio converts to nothing, whatever the unit", () => {
    test("an hour of walking is worth no rep-equivalents", () => {
      expect(toRepEquivalent(3600, "time", NON_REP_STYLE)).toBe(0);
    });

    test("and neither is a counted cardio result", () => {
      expect(toRepEquivalent(500, "reps", NON_REP_STYLE)).toBe(0);
      expect(toRepEquivalent(500, null, NON_REP_STYLE)).toBe(0);
    });

    test("while every other style still converts", () => {
      for (const style of ["strength", "calisthenics", "yoga"] as const) {
        expect(toRepEquivalent(60, "time", style)).toBe(20);
      }
    });
  });
});
