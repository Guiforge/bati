import { estimateQuestSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import { applyConfigToSlots, type QuestConfig } from "./questConfig";
import type { QuestExercise, QuestTemplate } from "./quests";
import type { DifficultyCode } from "./schema";
import { Difficulty, generateTarget } from "./targets";
import { estimateQuestXp } from "./xp";

type PreviewInput = {
  template: Pick<QuestTemplate, "rounds" | "restSeconds" | "roundRestSeconds" | "exercises">;
  /**
   * The whole catalogue row, not the four columns the estimate reads: a saved swap puts a
   * different movement in the slot, and pricing it needs the movement itself.
   */
  exercisesById: Record<number, Exercise>;
  userLevel: DifficultyCode;
  /**
   * What the hero saved on this quest. The structural half (`rounds`, both rests) is applied by
   * the caller through `resolveTemplateOverrides`; the per-slot half is applied here, through the
   * same `applyConfigToSlots` the session runs on.
   */
  config?: QuestConfig | null;
};

/**
 * The template's slots with their targets resolved for this hero, then the hero's own overrides
 * on top, which is what both previews price off.
 *
 * Shared so the duration chip and the XP chip can never disagree about which movements a quest
 * contains or what it asks of them, and routed through `applyConfigToSlots` so a card and the
 * detail screen behind it cannot disagree either.
 *
 * What is still out of reach here is not the config: `getQuestById` also serves an easier rung
 * to a hero who has not earned the written movement, and prescribes a hold off their own record.
 * Both need a journal read per quest, and the gallery prices 34 cards on every focus.
 */
function resolveTemplateExercises(input: PreviewInput): QuestExercise[] {
  const userLevelEnum =
    input.userLevel === "easy"
      ? Difficulty.Easy
      : input.userLevel === "hard"
        ? Difficulty.Hard
        : Difficulty.Medium;

  const slots = input.template.exercises.flatMap<QuestExercise>((qex) => {
    const ex = input.exercisesById[qex.exerciseId];
    if (!ex) return [];

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

    return [{ id: qex.id, exercise: ex, images: qex.images, target }];
  });

  return applyConfigToSlots(slots, input.config ?? null, input.exercisesById);
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
