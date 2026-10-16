import { listExercises } from "./exercises";
import { preferences, type SetAsideExercise } from "./preferences";
import { clearCached } from "./queryCache";
import { getAllQuestConfigs, saveQuestConfig } from "./questConfig";
import { listQuestTemplates } from "./quests";
import { ADMIN_CREATOR } from "./schema";

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
export async function setExerciseAside(
  exerciseId: number,
  now = Date.now(),
  /** A zone's end date (epoch ms): set aside until then, as `reason: "zone"` (M-04). */
  until?: number,
): Promise<void> {
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

  const list = await preferences.getSetAsideExercises(now);
  const next = withExercise(list, exerciseId, now, until);
  if (next) await preferences.setSetAsideExercises(next);

  // A quest detail painted from cache would show the exercise for one frame, then swap.
  clearCached("quest:");
}

/**
 * The list with the exercise set aside, or null when it already says so. The hero's own hand
 * outranks a zone, both ways: a zone never turns a hand-made entry into one that expires, and a
 * hand set aside during a zone makes the entry the hero's, which stays.
 */
function withExercise(
  list: SetAsideExercise[],
  id: number,
  at: number,
  until: number | undefined,
): SetAsideExercise[] | null {
  const held = list.find((e) => e.id === id);
  const entry: SetAsideExercise =
    until === undefined ? { id, at } : { id, at, until, reason: "zone" };
  if (!held) return [...list, entry];
  if (held.until === undefined) return null;
  if (until === undefined) return list.map((e) => (e === held ? entry : e));
  return until > held.until ? list.map((e) => (e === held ? { ...held, until } : e)) : null;
}

/**
 * Every jump at once (`exercises.impact`, `0070`), for a hero who cannot or will not jump: a bad
 * knee, a downstairs neighbour. One movement at a time it took six sessions of meeting each one
 * mid-warm-up, clock running. Seed movements only, and through `setExerciseAside` so each one
 * gets the whole treatment; put back one by one from the same list. Returns how many it added.
 */
export async function setImpactAside(now = Date.now()): Promise<number> {
  const [catalogue, list] = await Promise.all([
    listExercises(),
    preferences.getSetAsideExercises(),
  ]);
  const aside = new Set(list.map((e) => e.id));
  const jumps = catalogue.filter(
    (e) => e.impact === true && e.creator === ADMIN_CREATOR && !aside.has(e.id),
  );
  // One after the other: each call reads the list it then appends to.
  for (const jump of jumps) await setExerciseAside(jump.id, now);
  return jumps.length;
}

/**
 * Hand it back, from the list, from a slot, or from the toast just after setting it aside. The
 * swaps and target numbers dropped when it was set aside stay dropped, the undo included: putting
 * a saved config back would also erase the swap the hero may have picked in the same gesture.
 */
export async function putExerciseBack(exerciseId: number): Promise<void> {
  const list = await preferences.getSetAsideExercises();
  await preferences.setSetAsideExercises(list.filter((e) => e.id !== exerciseId));
  clearCached("quest:");
}
