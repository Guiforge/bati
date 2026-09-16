import type { OutingGoal } from "@/src/gps/track";
import { estimateQuestSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import { outingGoal } from "./expeditions";
import { applyConfigToSlots, type QuestConfig, resolveTemplateOverrides } from "./questConfig";
import {
  isUserQuest,
  loadSlotJournal,
  QUEST_AS_WRITTEN,
  type QuestExercise,
  type QuestTemplate,
  resolveSlot,
  type SlotJournal,
} from "./quests";
import type { DifficultyCode } from "./schema";
import { Difficulty } from "./targets";
import { estimateQuestXp } from "./xp";

type PreviewInput = {
  template: Pick<
    QuestTemplate,
    "author" | "rounds" | "restSeconds" | "roundRestSeconds" | "exercises"
  >;
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
  /**
   * The hero's ladder and records, read once for the whole gallery by `previewQuests`. Without
   * it a card prices the quest as written while the screen behind it serves an easier rung and a
   * hold off the hero's own maximum, which is how 27 of 37 quests came to advertise two rewards.
   */
  journal: SlotJournal;
};

/**
 * The template's slots as this hero will run them, then their own overrides on top, which is what
 * both previews price off.
 *
 * Shared so the duration chip and the XP chip can never disagree about which movements a quest
 * contains or what it asks of them; routed through `resolveSlot` so a card cannot disagree with
 * the screen behind it, and through `applyConfigToSlots` so neither can disagree with the session.
 */
function resolveTemplateExercises(input: PreviewInput): QuestExercise[] {
  const userLevelEnum =
    input.userLevel === "easy"
      ? Difficulty.Easy
      : input.userLevel === "hard"
        ? Difficulty.Hard
        : Difficulty.Medium;
  const substitute = !isUserQuest(input.template);

  const slots = input.template.exercises.flatMap<QuestExercise>((qex) => {
    const written = input.exercisesById[qex.exerciseId];
    if (!written) return [];

    const { exercise, target, ghost } = resolveSlot({
      base: qex.baseTarget,
      written,
      userLevel: userLevelEnum,
      journal: input.journal,
      catalogue: input.exercisesById,
      substitute,
    });

    // Same rule as `buildSlot`: the quest's own art is of the movement the template wrote.
    return [
      { id: qex.id, exercise, images: exercise.id === written.id ? qex.images : [], target, ghost },
    ];
  });

  return applyConfigToSlots(slots, input.config ?? null, input.exercisesById);
}

/** What a card advertises: the duration chip and the XP chip, for one quest. */
export type QuestPreview = { seconds: number; xp: number };

/**
 * One quest's two chips, off the hero's saved config unless the caller names a level.
 *
 * Synchronous, and the `journal` is why: everything it needs to know about the hero was read
 * before it was called. An adventure step prices itself at the run's difficulty rather than at
 * whatever the hero last set on that quest, which is the one reason `level` exists.
 */
export function previewQuest(
  template: QuestTemplate,
  exercisesById: Record<number, Exercise>,
  config: QuestConfig | null,
  journal: SlotJournal,
  level?: DifficultyCode,
): QuestPreview {
  const input: PreviewInput = {
    template: { ...template, ...resolveTemplateOverrides(template, config) },
    exercisesById,
    userLevel: level ?? config?.level ?? Difficulty.Medium,
    config,
    journal,
  };
  return { seconds: estimateQuestTemplateSeconds(input), xp: estimateQuestTemplateXp(input) };
}

/**
 * Every card in a gallery, priced the way the screen behind it will price the same quest.
 *
 * Async and batched, which is the only reason this can be honest: the ladder and the records are
 * two queries for all 37 quests (10 ms on a five-year journal) where one `getQuestById` per card
 * is 37 joins and 129 ms.
 */
export async function previewQuests(
  templates: readonly QuestTemplate[],
  exercisesById: Record<number, Exercise>,
  configs: ReadonlyMap<number, QuestConfig>,
  level?: DifficultyCode,
): Promise<Map<number, QuestPreview>> {
  const journal = await loadSlotJournal(
    templates.flatMap((q) => q.exercises.map((qex) => qex.exerciseId)),
  );

  return new Map(
    templates.map(
      (q) =>
        [q.id, previewQuest(q, exercisesById, configs.get(q.id) ?? null, journal, level)] as const,
    ),
  );
}

/**
 * Exported for the tests and for the two functions above, not for a screen: a caller that reaches
 * for one of these directly is a caller choosing its own `journal`, which is the shape of bug B4.
 * `db/index.ts` re-exports `previewQuest`/`previewQuests` alone.
 */
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

/**
 * The goal a way out leaves with from Home's tile, which always starts it at medium: what its chip
 * says.
 *
 * Off the cached template and the saved config rather than `loadConfiguredQuest`, which reads the
 * hero's whole history of the movement to serve a slot, three times on every Home focus for a
 * number the history cannot move: an outing's duration is authored, or set by hand.
 * `__tests__/db-change-version.test.ts` holds it to the goal the tap actually runs.
 */
export function previewOutingGoal(
  template: Pick<
    QuestTemplate,
    "author" | "rounds" | "restSeconds" | "roundRestSeconds" | "exercises"
  >,
  exercisesById: Record<number, Exercise>,
  saved: QuestConfig | null,
): OutingGoal | null {
  const config = saved === null ? null : { ...saved, level: Difficulty.Medium };
  const exercises = resolveTemplateExercises({
    template,
    exercisesById,
    userLevel: Difficulty.Medium,
    config,
    // The one preview that stays synchronous, and the one that can: every slot here is an
    // expedition, nothing on the ladder stands below a walk, and `resolveSlot` gives an outing
    // no hold from the journal either. There is nothing for a journal read to change.
    journal: QUEST_AS_WRITTEN,
  });
  return outingGoal({ exercises }, config?.distanceM ?? null);
}
