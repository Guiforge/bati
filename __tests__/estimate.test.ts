import type { EstimateQuestInput } from "@/db/estimate";
import {
  adventureWeeks,
  estimateExerciseSeconds,
  estimateQuestSeconds,
  formatDurationEstimate,
} from "@/db/estimate";

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

  it("rounds estimates to the minute, never below one", () => {
    expect(formatDurationEstimate(666)).toBe("11 min"); // 11 min 6s
    expect(formatDurationEstimate(690)).toBe("12 min"); // rounds half up
    expect(formatDurationEstimate(20)).toBe("1 min");
  });

  it("rounds adventure steps up to whole weeks, never below one", () => {
    expect(adventureWeeks(2)).toBe(1);
    expect(adventureWeeks(6)).toBe(2);
    expect(adventureWeeks(7)).toBe(3);
    expect(adventureWeeks(0)).toBe(1);
  });
});
