import { estimateQuestSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import type { QuestTemplate } from "./quests";
import type { DifficultyCode } from "./schema";
import { Difficulty, generateTarget } from "./targets";
import { estimateQuestXp } from "./xp";

type PreviewInput = {
  template: Pick<QuestTemplate, "rounds" | "restSeconds" | "roundRestSeconds" | "exercises">;
  exercisesById: Record<number, Pick<Exercise, "secondsPerRep" | "difficulty">>;
  userLevel: DifficultyCode;
};

/**
 * The template's slots with their targets resolved for this hero — what both previews price off.
 *
 * Shared so the duration chip and the XP chip can never disagree about which movements a quest
 * contains or what it asks of them.
 */
function resolveTemplateExercises(input: PreviewInput) {
  const userLevelEnum =
    input.userLevel === "easy"
      ? Difficulty.Easy
      : input.userLevel === "hard"
        ? Difficulty.Hard
        : Difficulty.Medium;

  return input.template.exercises
    .map((qex) => {
      const ex = input.exercisesById[qex.exerciseId];
      if (!ex) return null;

      // No personal best passed on purpose: this is a synchronous duration estimate for the
      // authoring preview, and a hold derived from the journal is clamped inside the same
      // [min, max] window the estimate already assumes. Reading records here would make the
      // whole authoring screen async to move a number by a few seconds.
      const target = generateTarget(
        {
          type: qex.baseTarget.type,
          min: qex.baseTarget.min,
          max: qex.baseTarget.max,
        },
        userLevelEnum,
      );

      return {
        exercise: { secondsPerRep: ex.secondsPerRep, difficulty: ex.difficulty },
        target,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

export function estimateQuestTemplateSeconds(input: PreviewInput): number {
  return estimateQuestSeconds({
    rounds: input.template.rounds,
    restSeconds: input.template.restSeconds,
    roundRestSeconds: input.template.roundRestSeconds,
    exercises: resolveTemplateExercises(input),
  });
}

/**
 * The XP chip on a quest card or an adventure poster.
 *
 * Deliberately does not take the rest columns: XP is paid for effort, and a card whose XP moved
 * with the rest slider is how the rest exploit was discovered — the screen advertised +2940 XP
 * for a quest that was mostly sitting.
 */
export function estimateQuestTemplateXp(input: PreviewInput): number {
  return estimateQuestXp(
    { rounds: input.template.rounds, exercises: resolveTemplateExercises(input) },
    input.userLevel,
  );
}
