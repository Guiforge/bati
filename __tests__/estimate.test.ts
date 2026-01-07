import type { EstimateQuestInput } from "@/src/db/estimate";
import { estimateExerciseSeconds, estimateQuestSeconds } from "@/src/db/estimate";

describe("db/estimate", () => {
  it("estimates rep-based exercises using secondsPerRep", () => {
    expect(estimateExerciseSeconds({ secondsPerRep: 3 }, { type: "reps", value: 10 })).toBe(30);
  });

  it("adds rest between sets when estimating quest", () => {
    const quest = {
      rounds: 2,
      restSeconds: 30,
      exercises: [
        {
          exercise: { secondsPerRep: 3 },
          target: { type: "reps", value: 10 },
        },
        {
          exercise: { secondsPerRep: 1 },
          target: { type: "time", value: 20 },
        },
      ],
    } satisfies EstimateQuestInput;

    // Work per round: 10*3 + 20 = 50
    // 2 rounds => 100 work
    // sets = 2 rounds * 2 exercises = 4; rest intervals = 3
    // rest = 3 * 30 = 90
    expect(estimateQuestSeconds(quest)).toBe(190);
  });
});
