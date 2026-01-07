import { estimateQuestTemplateSeconds } from "@/src/db/preview";

describe("db/preview", () => {
  test("estimateQuestTemplateSeconds accounts for rounds + rest + generated targets", () => {
    const template = {
      rounds: 2,
      restSeconds: 30,
      exercises: [
        {
          exerciseId: 1,
          images: [],
          baseTarget: { type: "reps" as const, min: 10, max: 10 },
        },
      ],
    };

    const exercisesById = {
      1: { secondsPerRep: 2 },
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
});
