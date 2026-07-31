import { pickDailyVariant, REST_SUGGESTION_MESSAGES } from "@/constants/restMessages";

describe("pickDailyVariant", () => {
  const pool = ["a", "b", "c", "d", "e"];

  test("is deterministic for the same seed", () => {
    expect(pickDailyVariant(pool, "2026-07-31:overtraining")).toBe(
      pickDailyVariant(pool, "2026-07-31:overtraining"),
    );
  });

  test("stays within the pool for a range of seeds", () => {
    for (let day = 1; day <= 28; day++) {
      const seed = `2026-07-${String(day).padStart(2, "0")}:high_volume`;
      expect(pool).toContain(pickDailyVariant(pool, seed));
    }
  });

  test("varies across different seeds", () => {
    const picks = new Set(
      Array.from({ length: 28 }, (_, i) =>
        pickDailyVariant(pool, `2026-07-${String(i + 1).padStart(2, "0")}:consecutive_days`),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  test("every rest-suggestion reason has an en and fr pool", () => {
    for (const reason of Object.keys(
      REST_SUGGESTION_MESSAGES,
    ) as (keyof typeof REST_SUGGESTION_MESSAGES)[]) {
      expect(REST_SUGGESTION_MESSAGES[reason].en.length).toBeGreaterThan(0);
      expect(REST_SUGGESTION_MESSAGES[reason].fr.length).toBeGreaterThan(0);
    }
  });
});
