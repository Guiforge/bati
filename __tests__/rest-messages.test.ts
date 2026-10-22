import { pickDailyVariant, restMessageKey } from "@/constants/restMessages";
import { i18n } from "@/i18n";
import { APP_LANGUAGES } from "@/src/i18n/deviceLanguage";

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
});

/**
 * Every line of every pool, read the way the Home reads it, in every language and at counts that
 * land on different plural forms where a language has them (5, 21, 22). A line missing a form
 * prints its key, and one that lost `{{count}}` prints no number.
 */
describe("the rest note", () => {
  const days = Array.from({ length: 28 }, (_, i) => `2026-07-${String(i + 1).padStart(2, "0")}`);

  test.each(APP_LANGUAGES)("%s: every line reads with its count", async (language) => {
    await i18n.changeLanguage(language);
    for (const reason of ["overtraining", "consecutive_days", "high_volume", "deload"] as const) {
      const keys = new Set(days.map((day) => restMessageKey(reason, `${day}:${reason}`)));
      expect(keys.size).toBeGreaterThan(1);
      for (const key of keys) {
        for (const count of [5, 21, 22]) {
          const line = i18n.t(key, { count });
          expect(line).not.toContain("rest_messages");
          expect(line).not.toContain("{{");
          // A deload line names no count; every other one says it.
          expect(reason === "deload" || line.includes(String(count))).toBe(true);
        }
      }
    }
  });
});
