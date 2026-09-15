import { workVerdict } from "@/components/journal/stats/workVerdict";
import type { MuscleBalance } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import type { MuscleCode } from "@/db/schema";
import { i18n } from "@/i18n";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const balance = (sessions: number, shares: [MuscleCode, number][], weak: MuscleCode[]) =>
  ({
    period: "30d",
    startDate: new Date(),
    endDate: new Date(),
    totalVolume: 100,
    totalSessions: sessions,
    muscles: shares.map(([muscle, percentage]) => ({
      muscle,
      label: MUSCLE_LABELS[muscle],
      volume: percentage,
      percentage,
      sessionCount: sessions,
    })),
    weakAreas: weak,
    strongAreas: [],
    unclassifiedResults: 0,
  }) as MuscleBalance;

// The stats page and the balance page say the balance in this one sentence. The balance page used
// to add a badge and a second message: three verdicts on the same thirty days.
describe("the balance verdict", () => {
  const t = i18n.getFixedT("en");

  test("below three sessions it is too early, whatever the shares say", () => {
    const early = workVerdict(
      t,
      "en",
      balance(
        2,
        [
          ["legs", 90],
          ["back", 10],
        ],
        ["back"],
      ),
    );
    expect(early).toEqual({ text: expect.stringContaining("Too early"), behind: false });
  });

  test("every muscle behind is named with its own share", () => {
    const verdict = workVerdict(
      t,
      "en",
      balance(
        5,
        [
          ["legs", 60],
          ["back", 8],
          ["shoulder", 5],
        ],
        ["back", "shoulder"],
      ),
    );
    expect(verdict.behind).toBe(true);
    expect(verdict.text).toContain("8%");
    expect(verdict.text).toContain("5%");
  });

  test("nothing behind is balanced", () => {
    expect(workVerdict(t, "en", balance(5, [["legs", 50]], []))).toEqual({
      text: t("journal.work_balanced"),
      behind: false,
    });
  });
});
