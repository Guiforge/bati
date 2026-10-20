import type { OutingGoal } from "@/src/gps/track";
import { estimateQuestSeconds } from "./estimate";
import type { Exercise } from "./exercises";
import { isOutingQuest, outingGoal, proposesWalkRun } from "./expeditions";
import { isLightWeekRunning, lightenRounds } from "./lightWeek";
import type { OutingHabit } from "./outingRule";
import {
  applyConfigToSlots,
  loadDefaultLevels,
  type QuestConfig,
  resolveTemplateOverrides,
} from "./questConfig";
import {
  isUserQuest,
  loadSlotJournal,
  movementRef,
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

    const { exercise, target, ghost, asWritten, setAsideFrom, walkRun, targetWhy } = resolveSlot({
      base: qex.baseTarget,
      written,
      userLevel: userLevelEnum,
      journal: input.journal,
      catalogue: input.exercisesById,
      substitute,
    });

    return [
      {
        id: qex.id,
        exercise,
        // Same rule as `buildSlot`: the quest's own art is of the movement the template wrote.
        images: exercise.id === written.id ? qex.images : [],
        target,
        ghost,
        ...(substitute ? { band: qex.baseTarget } : {}),
        ...(targetWhy ? { targetWhy } : {}),
        ...(walkRun ? { walkRun: true as const } : {}),
        // And the same account of a stepped-down slot as `buildSlot` gives, because the saved
        // config reads it: a hero who took the written movement back ("Do X instead") is
        // prescribed what the quest wrote for it. Without this the card priced that slot at the
        // unit's default while the screen behind it priced the quest's own number.
        ...(setAsideFrom
          ? { substitutedFor: { ...movementRef(setAsideFrom), setAside: true as const } }
          : asWritten
            ? { substitutedFor: { ...movementRef(written), target: asWritten } }
            : {}),
      },
    ];
  });

  return applyConfigToSlots(slots, input.config ?? null, input.exercisesById, input.journal);
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
  // A saved swap puts another movement in a slot, and it is progressed on its own history.
  const swapped = [...configs.values()].flatMap((c) => Object.values(c.swaps ?? {}));
  const [journal, defaults, lightWeek] = await Promise.all([
    loadSlotJournal([
      ...templates.flatMap((q) => q.exercises.map((qex) => qex.exerciseId)),
      ...swapped,
    ]),
    loadDefaultLevels(),
    isLightWeekRunning(new Date()),
  ]);

  return new Map(
    templates.map((q) => {
      const config = configs.get(q.id) ?? null;
      // The level the quest will start at, by the rule `loadConfiguredQuest` applies.
      const starts =
        level ??
        config?.level ??
        (isOutingQuest(q, exercisesById) ? Difficulty.Medium : defaults(q.id));
      // The round a light week takes off, as the screen behind the card takes it (`lightenRounds`).
      const shown = lightenRounds(q, config, lightWeek, isUserQuest(q));
      return [q.id, previewQuest(shown, exercisesById, config, journal, starts)] as const;
    }),
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
 * What a way out leaves with from Home's tile, which always starts it at medium: the goal its
 * chip says, and whether that goal is still the app's walk-run proposal (`proposesWalkRun`, the
 * predicate the quest screen uses).
 *
 * Off the cached template and the saved config rather than `loadConfiguredQuest`, which reads the
 * hero's whole history of the movement to serve a slot, three times on every Home focus for a
 * number the history cannot move: an outing's duration is authored, set by hand, or proposed
 * from the month of running the caller hands in. One resolution for both answers, so they
 * cannot be read off two different sets of slots.
 * `__tests__/db-change-version.test.ts` holds the goal to the one the tap actually runs.
 */
export function previewOuting(
  template: Pick<
    QuestTemplate,
    "author" | "rounds" | "restSeconds" | "roundRestSeconds" | "exercises"
  >,
  exercisesById: Record<number, Exercise>,
  saved: QuestConfig | null,
  /** The hero's month of running, which a run's duration is proposed from. Loaded by the caller. */
  runHabit: OutingHabit,
): { goal: OutingGoal | null; walkRun: boolean } {
  const config = saved === null ? null : { ...saved, level: Difficulty.Medium };
  const exercises = resolveTemplateExercises({
    template,
    exercisesById,
    userLevel: Difficulty.Medium,
    config,
    // The one preview that stays synchronous, and the one that can: every slot here is an
    // expedition, nothing on the ladder stands below a walk, and `resolveSlot` gives an outing
    // no hold from the journal either. The one thing the journal changes is how long a run is
    // proposed at, and that the caller reads and hands in, so this stays synchronous.
    journal: { ...QUEST_AS_WRITTEN, runHabit },
  });
  return {
    goal: outingGoal({ exercises }, config?.distanceM ?? null),
    walkRun: proposesWalkRun(exercises, config?.distanceM),
  };
}
