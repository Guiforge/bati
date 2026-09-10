// The preview reads the saved config through `applyConfigToSlots`, whose module reaches the
// database for the *other* functions it exports. Stubbed the way `quest-gallery-meta.test.ts`
// stubs it, so the pure projection under test loads without expo-sqlite.
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

import type { Exercise } from "@/db/exercises";
import { estimateQuestTemplateSeconds, estimateQuestTemplateXp } from "@/db/preview";

const exercise = (id: number, over: Partial<Exercise> = {}): Exercise => ({
  id,
  enName: `ex-${id}`,
  frName: `ex-${id}`,
  enDescription: "",
  frDescription: "",
  imagePath: "",
  creator: "Admin",
  difficulty: "medium",
  equipment: "none",
  style: "strength",
  secondsPerRep: 2,
  muscles: [],
  pattern: null,
  measure: "reps",
  locomotion: null,
  prerequisiteExerciseId: null,
  retiredAt: null,
  ...over,
});

describe("db/preview", () => {
  test("estimateQuestTemplateSeconds accounts for rounds + rest + generated targets", () => {
    const template = {
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [
        {
          id: 1,
          exerciseId: 1,
          images: [],
          baseTarget: { type: "reps" as const, min: 10, max: 10 },
        },
      ],
    };

    const exercisesById = { 1: exercise(1) };

    const medium = estimateQuestTemplateSeconds({
      template,
      exercisesById,
      userLevel: "medium",
    });

    // reps: 10 * 2s = 20s per round; rounds=2 => 40s work.
    // setCount = 2*1 = 2 => restCount = 1 => +30s
    expect(medium).toBe(70);

    const hard = estimateQuestTemplateSeconds({
      template,
      exercisesById,
      userLevel: "hard",
    });

    // hard multiplier 1.25 => 10 -> 13, reps: 13*2=26 per round; rounds=2 => 52; +30 rest
    expect(hard).toBe(82);
  });

  /**
   * The bug as it was reported: "a 300 minute break gives me a lot of XP".
   *
   * The rest slider is what made the exploit findable — the gallery's "up to +N XP" chip moved
   * with it, so the screen advertised the cheat. XP is paid for effort now, and rest is not
   * effort, so the two templates below differ only in a column the XP estimate must not read.
   */
  test("the XP estimate does not move when the rest slider does", () => {
    const exercisesById = { 1: exercise(1, { secondsPerRep: 3 }) };
    const base = {
      rounds: 10,
      exercises: [
        {
          id: 1,
          exerciseId: 1,
          images: [],
          baseTarget: { type: "reps" as const, min: 12, max: 12 },
        },
      ],
    };

    const brisk = estimateQuestTemplateXp({
      template: { ...base, restSeconds: 30, roundRestSeconds: null },
      exercisesById,
      userLevel: "medium",
    });
    const glacial = estimateQuestTemplateXp({
      template: { ...base, restSeconds: 300, roundRestSeconds: 300 },
      exercisesById,
      userLevel: "medium",
    });

    expect(glacial).toBe(brisk);

    // ...while the duration estimate, whose job *is* the clock, still does.
    const briskSeconds = estimateQuestTemplateSeconds({
      template: { ...base, restSeconds: 30, roundRestSeconds: null },
      exercisesById,
      userLevel: "medium",
    });
    const glacialSeconds = estimateQuestTemplateSeconds({
      template: { ...base, restSeconds: 300, roundRestSeconds: 300 },
      exercisesById,
      userLevel: "medium",
    });
    expect(glacialSeconds).toBeGreaterThan(briskSeconds);
  });

  /**
   * One quest, one duration, one reward.
   *
   * The gallery card priced the pristine template while the quest's own screen priced the hero's
   * config, so the same quest at the same level read "≈ 12 min, up to +140 XP" on the card and
   * "≈ 10 min, up to +70 XP" one tap later. The template slot had no row id to file an override
   * under, so there was nothing for `targets` and `swaps` to attach to here.
   */
  describe("the saved config reaches the card, not just the screen behind it", () => {
    const template = {
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [
        {
          id: 7,
          exerciseId: 1,
          images: [],
          baseTarget: { type: "reps" as const, min: 20, max: 20 },
        },
      ],
    };
    const exercisesById = { 1: exercise(1), 2: exercise(2, { secondsPerRep: 6 }) };

    test("a target the hero lowered lowers both numbers", () => {
      const written = {
        template,
        exercisesById,
        userLevel: "medium" as const,
        config: { level: "medium" as const },
      };
      const halved = { ...written, config: { level: "medium" as const, targets: { 7: 10 } } };

      // 20 reps * 2s * 2 rounds + 30s rest = 110s, against 10 reps * 2s * 2 + 30 = 70s.
      expect(estimateQuestTemplateSeconds(written)).toBe(110);
      expect(estimateQuestTemplateSeconds(halved)).toBe(70);
      expect(estimateQuestTemplateXp(halved)).toBeLessThan(estimateQuestTemplateXp(written));
    });

    test("a movement the hero swapped in is the one that gets priced", () => {
      const swapped = {
        template,
        exercisesById,
        userLevel: "medium" as const,
        config: { level: "medium" as const, swaps: { 7: 2 } },
      };

      // The substitute costs 6s a rep against the written movement's 2.
      expect(estimateQuestTemplateSeconds(swapped)).toBe(20 * 6 * 2 + 30);
    });

    test("a config that only remembers a level changes nothing", () => {
      const bare = {
        template,
        exercisesById,
        userLevel: "medium" as const,
        config: { level: "medium" as const },
      };

      expect(estimateQuestTemplateSeconds(bare)).toBe(
        estimateQuestTemplateSeconds({ template, exercisesById, userLevel: "medium" }),
      );
    });
  });
});
