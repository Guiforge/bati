import type { EstimateQuestInput } from "@/db/estimate";
import {
  adventureWeeks,
  estimateExerciseSeconds,
  estimateQuestSeconds,
  formatDuration,
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
      roundRestSeconds: null,
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

  it("bills the round rest at round boundaries and the set rest inside them", () => {
    const quest = {
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: 90,
      exercises: [
        { exercise: { secondsPerRep: 3 }, target: { type: "reps", value: 10 } },
        { exercise: { secondsPerRep: 1 }, target: { type: "time", value: 20 } },
      ],
    } satisfies EstimateQuestInput;

    // 100 work, 2 gaps inside rounds (2 * 30) and 1 round boundary (90).
    expect(estimateQuestSeconds(quest)).toBe(250);

    // A single exercise makes every gap a round boundary, so no set rest is billed at all.
    expect(
      estimateQuestSeconds({
        rounds: 3,
        restSeconds: 30,
        roundRestSeconds: 90,
        exercises: [{ exercise: { secondsPerRep: 3 }, target: { type: "reps", value: 10 } }],
      }),
    ).toBe(3 * 30 + 2 * 90);
  });

  it("rounds estimates to the minute, never below one", () => {
    expect(formatDurationEstimate(666)).toBe("11 min"); // 11 min 6s
    expect(formatDurationEstimate(690)).toBe("12 min"); // rounds half up
    expect(formatDurationEstimate(20)).toBe("1 min");
  });

  // Measured durations, unlike estimates, keep their seconds. Untested until now, and the
  // function it sits next to had a dead `lang` parameter for exactly as long.
  it("keeps seconds on measured durations and drops empty halves", () => {
    expect(formatDuration(45, "en")).toBe("45s");
    expect(formatDuration(600, "en")).toBe("10 min");
    expect(formatDuration(666, "en")).toBe("11 min 6s");
    expect(formatDuration(0, "en")).toBe("0s");
    expect(formatDuration(-5, "en")).toBe("0s");
    expect(formatDuration(59.6, "en")).toBe("1 min");
  });

  // "12 min 17s" was written the English way in every language; the seconds now wear the same
  // suffix as a hold (`formatTarget`), and the minutes/seconds split is unchanged.
  it("spaces the seconds the way the language spaces a hold", () => {
    expect(formatDuration(737, "fr")).toBe("12 min 17 s");
    expect(formatDuration(737, "de")).toBe("12 min 17 s");
    expect(formatDuration(45, "es")).toBe("45 s");
    expect(formatDuration(720, "fr")).toBe("12 min");
  });

  it("rounds adventure steps up to whole weeks, never below one", () => {
    expect(adventureWeeks(2)).toBe(1);
    expect(adventureWeeks(6)).toBe(2);
    expect(adventureWeeks(7)).toBe(3);
    expect(adventureWeeks(0)).toBe(1);
  });
});
