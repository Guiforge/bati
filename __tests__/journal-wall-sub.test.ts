import { wallSub } from "@/components/journal/stats/wall";
import type { WallEntry } from "@/db/journal";
import { i18n } from "@/i18n";
import { APP_LANGUAGES } from "@/src/i18n/deviceLanguage";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const now = new Date(2026, 8, 15, 12);
const entry = (over: Partial<WallEntry>): WallEntry => ({
  exerciseId: 1,
  name: { en: "Push-ups", fr: "Pompes", de: "Liegestütze", es: "Flexiones" },
  imagePath: "",
  type: "reps",
  best: 24,
  last: 11,
  recordAt: new Date(2026, 8, 2, 12),
  recordSessionId: 7,
  seasonBest: 24,
  ...over,
});

// The record's date is cut out of a translated line to become a link. The cut has to give back the
// whole line, in every language and every shape of line, or the wall prints a sentence missing its
// middle or its end.
describe("the wall's line under a movement", () => {
  test.each(APP_LANGUAGES)("%s: the date is cut out and nothing else is lost", (language) => {
    const t = i18n.getFixedT(language);
    for (const shape of [
      entry({}),
      entry({ last: 24 }),
      entry({ recordAt: new Date(2025, 0, 3), seasonBest: 18 }),
    ]) {
      const { before, when, after } = wallSub(t, language, shape, now);
      expect(when).not.toBe("");
      expect(`${before}${when}${after}`).not.toContain("⁣");
      expect(`${before}${after}`).toContain("24");
    }
    // The line with a last result has it after the date in every language: the cut kept the tail.
    expect(wallSub(t, language, entry({}), now).after).toContain("11");
  });

  test("a count of reps carries its unit, a hold reads as a clock", () => {
    const t = i18n.getFixedT("en");
    expect(wallSub(t, "en", entry({}), now).after).toBe(" · last time 11 reps");
    expect(wallSub(t, "en", entry({ type: "time", best: 70, last: 56 }), now).after).toBe(
      " · last time 0:56",
    );
  });

  test("a record older than a year is dated with its year, never floored to a count of years", () => {
    const t = i18n.getFixedT("de");
    const { when } = wallSub(t, "de", entry({ recordAt: new Date(2023, 9, 20) }), now);
    expect(when).toContain("2023");
  });
});
