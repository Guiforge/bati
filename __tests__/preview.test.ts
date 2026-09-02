import { estimateQuestTemplateSeconds, estimateQuestTemplateXp } from "@/db/preview";

describe("db/preview", () => {
  test("estimateQuestTemplateSeconds accounts for rounds + rest + generated targets", () => {
    const template = {
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [
        {
          exerciseId: 1,
          images: [],
          baseTarget: { type: "reps" as const, min: 10, max: 10 },
        },
      ],
    };

    const exercisesById = {
      1: { secondsPerRep: 2, difficulty: "medium" as const, style: "strength" as const },
    };

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
    const exercisesById = {
      1: { secondsPerRep: 3, difficulty: "medium" as const, style: "strength" as const },
    };
    const base = {
      rounds: 10,
      exercises: [
        { exerciseId: 1, images: [], baseTarget: { type: "reps" as const, min: 12, max: 12 } },
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
});
