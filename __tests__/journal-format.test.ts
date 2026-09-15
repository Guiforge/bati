import { foldRounds, formatShare, shortDate } from "@/components/journal/journalFormat";
import type { CompletedExercise } from "@/db/completed";

const set = (id: number, round: number, value: number, target: number | null) =>
  ({
    id,
    roundIndex: round,
    sortOrder: 0,
    result: { type: "reps", value },
    target: target == null ? undefined : { type: "reps", value: target },
    notes: "",
    performedAt: new Date(),
    exercise: { id: 7 },
  }) as unknown as CompletedExercise;

describe("journalFormat", () => {
  it("folds a movement's rounds into one row, cleared only when every set met its target", () => {
    const [cleared] = foldRounds([set(1, 0, 12, 12), set(2, 1, 15, 12), set(3, 2, 13, 12)]);
    expect(cleared?.sets.map((s) => s.value)).toEqual([12, 15, 13]);
    expect(cleared?.cleared).toBe(true);

    const [missed] = foldRounds([set(1, 0, 10, 9), set(2, 1, 8, 9)]);
    expect(missed?.cleared).toBe(false);
    expect(missed?.sets.map((s) => s.met)).toEqual([true, false]);
  });

  it("dates this year without the year, and any other year with it", () => {
    const now = new Date(2026, 8, 15);
    expect(shortDate("en", new Date(2026, 1, 3), now)).not.toMatch(/2026/);
    expect(shortDate("en", new Date(2024, 1, 3), now)).toMatch(/2024/);
  });

  it("writes a share the language's way", () => {
    expect(formatShare("en", 45)).toBe("45%");
    expect(formatShare("fr", 45)).toMatch(/^45\s%$/);
  });
});
