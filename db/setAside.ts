import { ADMIN_CREATOR, type Exercise, listExercises } from "./exercises";
import { preferences } from "./preferences";
import { clearCached } from "./queryCache";
import { getAllQuestConfigs, saveQuestConfig } from "./questConfig";
import { listQuestTemplates } from "./quests";

/**
 * The seeded exercises that leave the floor. Issue #145 was "I can't jump", and one jump set aside
 * at a time is five sessions of meeting the next one; setting one aside offers the rest.
 *
 * ponytail: names in a list, like `ONE_SIDED` in `constants/warmup.ts`, until exercises carry an
 * impact column. A second reader (a "low impact" filter in the catalogue) is the moment for it.
 * `content-invariants` checks every name still resolves.
 */
export const JUMPING: ReadonlySet<string> = new Set([
  "Jumping Jack",
  "Star Jump",
  "Skater Hop",
  "Jump Squat",
  "Burpee",
]);

/** The other seeded jumps the hero still gets, when `exercise` is one of them. */
export async function otherJumps(exercise: Exercise): Promise<Exercise[]> {
  if (exercise.creator !== ADMIN_CREATOR || !JUMPING.has(exercise.enName)) return [];
  const [catalogue, list] = await Promise.all([
    listExercises(),
    preferences.getSetAsideExercises(),
  ]);
  const aside = new Set(list.map((e) => e.id));
  return catalogue.filter(
    (e) =>
      e.creator === ADMIN_CREATOR &&
      JUMPING.has(e.enName) &&
      e.id !== exercise.id &&
      e.retiredAt === null &&
      !aside.has(e.id),
  );
}

/**
 * Set an exercise aside: quests stop serving it and the warm-up stops prescribing it.
 *
 * The one writer of the list, because setting aside has a second half: a swap the hero saved on a
 * quest screen (`QuestConfig.swaps`) is applied *after* the slot is resolved, so a pinned swap to
 * this exercise would hand it straight back. Those swaps are dropped here, once, instead of every
 * reader of a config having to know about the list. The slot falls back to the template, which
 * `resolveSlot` then substitutes.
 *
 * So are the target numbers saved on a slot that names the exercise: "20" was set for Jump Squat,
 * and must not become 20 of whatever stands in for it. Only where the slot runs as written: a
 * slot the hero swapped keeps its number, which was set for the swap.
 *
 * The configs first and the list last, so a write that fails halfway leaves the exercise off the
 * list and the next attempt does the whole thing again.
 */
export async function setExerciseAside(exerciseId: number, now = Date.now()): Promise<void> {
  const [configs, templates] = await Promise.all([getAllQuestConfigs(), listQuestTemplates()]);
  const writtenBy = new Map(
    templates.flatMap((q) => q.exercises.map((s) => [String(s.id), s.exerciseId] as const)),
  );

  for (const [questId, config] of configs) {
    const swaps = config.swaps ?? {};
    const keepSwap = ([, id]: [string, number]) => id !== exerciseId;
    const keepTarget = ([slot]: [string, number]) =>
      swaps[slot] !== undefined || writtenBy.get(slot) !== exerciseId;
    const keptSwaps = Object.fromEntries(Object.entries(swaps).filter(keepSwap));
    const keptTargets = Object.fromEntries(Object.entries(config.targets ?? {}).filter(keepTarget));
    if (
      Object.keys(keptSwaps).length === Object.keys(swaps).length &&
      Object.keys(keptTargets).length === Object.keys(config.targets ?? {}).length
    ) {
      continue;
    }
    await saveQuestConfig(questId, {
      ...config,
      swaps: Object.keys(keptSwaps).length > 0 ? keptSwaps : undefined,
      targets: Object.keys(keptTargets).length > 0 ? keptTargets : undefined,
    });
  }

  const list = await preferences.getSetAsideExercises();
  if (!list.some((e) => e.id === exerciseId)) {
    await preferences.setSetAsideExercises([...list, { id: exerciseId, at: now }]);
  }

  // A quest detail painted from cache would show the exercise for one frame, then swap.
  clearCached("quest:");
}

/** Hand it back. The swaps dropped when it was set aside stay dropped: that was a separate choice. */
export async function putExerciseBack(exerciseId: number): Promise<void> {
  const list = await preferences.getSetAsideExercises();
  await preferences.setSetAsideExercises(list.filter((e) => e.id !== exerciseId));
  clearCached("quest:");
}
