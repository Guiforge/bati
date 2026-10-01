import { ADMIN_CREATOR, type Exercise, listExercises } from "./exercises";
import { preferences } from "./preferences";
import { clearCached } from "./queryCache";
import { getAllQuestConfigs, saveQuestConfig } from "./questConfig";

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
 */
export async function setExerciseAside(exerciseId: number, now = Date.now()): Promise<void> {
  const list = await preferences.getSetAsideExercises();
  if (list.some((e) => e.id === exerciseId)) return;
  await preferences.setSetAsideExercises([...list, { id: exerciseId, at: now }]);

  for (const [questId, config] of await getAllQuestConfigs()) {
    const swaps = Object.entries(config.swaps ?? {});
    if (!swaps.some(([, id]) => id === exerciseId)) continue;
    const kept = Object.fromEntries(swaps.filter(([, id]) => id !== exerciseId));
    await saveQuestConfig(questId, {
      ...config,
      swaps: Object.keys(kept).length > 0 ? kept : undefined,
    });
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
