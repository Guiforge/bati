import {
  getExerciseColorKey,
  getExerciseColorTokens,
  getQuestColorKeyFromQuest,
  getQuestColorKeyFromTemplateWithExercises,
} from "@/src/constants/exerciseColors";
import { estimateExerciseSeconds } from "@/src/db/estimate";
import type { Exercise } from "@/src/db/exercises";
import type { Quest } from "@/src/db/quests";

describe("exerciseColors", () => {
  test("getExerciseColorKey prefers muscle over target type", () => {
    const key = getExerciseColorKey({ muscles: ["back"], targetType: "reps" });
    expect(key).toBe("back");
  });

  test("getExerciseColorKey falls back to target type when no muscle", () => {
    const key = getExerciseColorKey({ muscles: [], targetType: "time" });
    expect(key).toBe("time");
  });

  test("getExerciseColorTokens returns pastel surfaces", () => {
    expect(getExerciseColorTokens("time").bg).toBe("$pastelBlue");
    expect(getExerciseColorTokens("reps").bg).toBe("$pastelYellow");
    expect(getExerciseColorTokens("back").bg).toBe("$pastelBlue");
  });

  test("getQuestColorKeyFromQuest is weighted by estimated seconds", () => {
    const exFastReps: Pick<Exercise, "secondsPerRep" | "muscles"> = {
      secondsPerRep: 1,
      muscles: ["arms"],
    };

    const exLongTime: Pick<Exercise, "secondsPerRep" | "muscles"> = {
      secondsPerRep: 3,
      muscles: ["back"],
    };

    // Sanity: the time-based set dominates by weight.
    const repsWeight = estimateExerciseSeconds(
      { secondsPerRep: exFastReps.secondsPerRep },
      { type: "reps", value: 20 }
    );
    const timeWeight = estimateExerciseSeconds(
      { secondsPerRep: exLongTime.secondsPerRep },
      { type: "time", value: 60 }
    );
    expect(timeWeight).toBeGreaterThan(repsWeight);

    const quest: Pick<Quest, "exercises"> = {
      exercises: [
        {
          exercise: exFastReps as Exercise,
          images: [],
          target: { type: "reps", value: 20 },
        },
        {
          exercise: exLongTime as Exercise,
          images: [],
          target: { type: "time", value: 60 },
        },
      ],
    };

    expect(getQuestColorKeyFromQuest(quest)).toBe("back");
  });

  test("getQuestColorKeyFromTemplateWithExercises uses muscle weights when available", () => {
    const template = {
      exercises: [
        {
          exerciseId: 1,
          images: [],
          baseTarget: { type: "reps" as const, min: 10, max: 10 },
        },
        {
          exerciseId: 2,
          images: [],
          baseTarget: { type: "time" as const, min: 60, max: 60 },
        },
      ],
    };

    // 60s time should dominate over 10 reps * 1s.
    const exercisesById = {
      1: { muscles: ["arms" as const], secondsPerRep: 1 },
      2: { muscles: ["back" as const], secondsPerRep: 3 },
    };

    const key = getQuestColorKeyFromTemplateWithExercises({
      quest: template,
      exercisesById,
    });

    expect(key).toBe("back");
  });
});
