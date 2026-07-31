import { SECONDS_PER_REP_EQUIVALENT, toRepEquivalent } from "@/db/workUnits";

describe("db/workUnits", () => {
  test("reps pass through untouched", () => {
    expect(toRepEquivalent(20, "reps")).toBe(20);
    expect(toRepEquivalent(0, "reps")).toBe(0);
  });

  test("seconds become rep-equivalents", () => {
    expect(toRepEquivalent(60, "time")).toBe(60 / SECONDS_PER_REP_EQUIVALENT);
    expect(toRepEquivalent(30, "time")).toBe(10);
  });

  // The whole point of the bug: at face value a 60 s hold outweighed a 20-rep set six to one.
  test("a 60 s hold and a 20-rep set weigh the same", () => {
    expect(toRepEquivalent(60, "time")).toBe(toRepEquivalent(20, "reps"));
  });

  // A hold shorter than the divisor is still work — it must never round away to zero, or a
  // muscle trained only in short holds would read as untrained.
  test("a hold shorter than one rep-equivalent still counts as one", () => {
    expect(toRepEquivalent(1, "time")).toBe(1);
    expect(toRepEquivalent(2, "time")).toBe(1);
  });

  // `targetType` is nullable on questExercises — the boss maths passes it straight through.
  test("a missing type is treated as reps", () => {
    expect(toRepEquivalent(15, null)).toBe(15);
    expect(toRepEquivalent(15, undefined)).toBe(15);
  });
});
