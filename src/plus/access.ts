import { listAdventures, startedAdventureIds } from "@/db/adventures";
import { ADMIN_CREATOR, listExercises, USER_EXERCISE_CREATOR } from "@/db/exercises";
import { isOutingQuest } from "@/db/expeditions";
import { listQuestTemplates, USER_QUEST_AUTHOR } from "@/db/quests";
import { reportError } from "@/src/reportError";
import { readEntitlements } from "./source";

/**
 * What a hero may do without Bati+. Entitlement is store state, never database state: merge,
 * restore and import never ask `can()`, and the quotas refuse creating only. Content beyond a
 * quota stays listed, editable and playable.
 */
export const FREE_HERO_EXERCISES = 5;
export const FREE_HERO_QUESTS = 3;

/** Seed identity is `enTitle` (merge matches Admin rows by it). content-invariants pins these four. */
export const PLUS_ADVENTURE_TITLES = [
  "The Golem",
  "The Ranger's Journey",
  "The Guardian's Oath",
  "The Iron Lord's Conquest",
] as const;

export type Action =
  | { kind: "createExercise" }
  | { kind: "createQuest" }
  | { kind: "startAdventure"; adventureId: number };

/** Only `none` opens everything; a store source follows what it reports. */
function isOpen(): boolean {
  const e = readEntitlements();
  return e.source === "none" || e.plus;
}

/** Hero exercises the quota counts: retired ones hold their slot (PARK-2 default). */
export async function countedHeroExercises(): Promise<number> {
  return (await listExercises()).filter((x) => x.creator === USER_EXERCISE_CREATOR).length;
}

/** Hero quests the quota counts: a quest filed from an outing does not (PARK-1 default). */
export async function countedHeroQuests(): Promise<number> {
  const [quests, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
  const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));
  return quests.filter((q) => q.author === USER_QUEST_AUTHOR && !isOutingQuest(q, exercisesById))
    .length;
}

/** Adventure ids that cannot start a run now. Empty when everything is open. */
export async function lockedAdventures(): Promise<Set<number>> {
  if (isOpen()) return new Set();
  const [all, started] = await Promise.all([listAdventures(), startedAdventureIds()]);
  const titles: readonly string[] = PLUS_ADVENTURE_TITLES;
  return new Set(
    all
      .filter((a) => a.author === ADMIN_CREATOR && titles.includes(a.enTitle) && !started.has(a.id))
      .map((a) => a.id),
  );
}

export async function can(action: Action): Promise<boolean> {
  if (isOpen()) return true;
  switch (action.kind) {
    case "createExercise":
      return (await countedHeroExercises()) < FREE_HERO_EXERCISES;
    case "createQuest":
      return (await countedHeroQuests()) < FREE_HERO_QUESTS;
    case "startAdventure":
      return !(await lockedAdventures()).has(action.adventureId);
  }
}

/**
 * What the two create screens ask at mount: how many the hero holds when creating is refused, or
 * null when it is allowed. A failed read allows (the store is the authority, a broken count must
 * not cost a hero the editor) and is reported.
 */
export async function quotaRefusal(kind: "createExercise" | "createQuest"): Promise<number | null> {
  try {
    if (await can({ kind })) return null;
    return kind === "createExercise" ? await countedHeroExercises() : await countedHeroQuests();
  } catch (error) {
    reportError(`plus.quota.${kind}`, error);
    return null;
  }
}
