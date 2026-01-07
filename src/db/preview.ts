import { estimateQuestSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import type { QuestTemplate } from "./quests";
import type { DifficultyCode } from "./schema";
import { Difficulty, generateTarget } from "./targets";

export function estimateQuestTemplateSeconds(input: {
  template: Pick<QuestTemplate, "rounds" | "restSeconds" | "exercises">;
  exercisesById: Record<number, Pick<Exercise, "secondsPerRep">>;
  userLevel: DifficultyCode;
}): number {
  const userLevelEnum =
    input.userLevel === "easy"
      ? Difficulty.Easy
      : input.userLevel === "hard"
        ? Difficulty.Hard
        : Difficulty.Medium;

  const exercises = input.template.exercises
    .map((qex) => {
      const ex = input.exercisesById[qex.exerciseId];
      if (!ex) return null;

      const target = generateTarget(
        {
          type: qex.baseTarget.type,
          min: qex.baseTarget.min,
          max: qex.baseTarget.max,
        },
        userLevelEnum
      );

      return {
        exercise: { secondsPerRep: ex.secondsPerRep },
        target,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  return estimateQuestSeconds({
    rounds: input.template.rounds,
    restSeconds: input.template.restSeconds,
    exercises,
  });
}
