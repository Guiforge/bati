import { type Exercise, listExercises } from "./exercises";
import { isOutingQuest } from "./expeditions";
import { listQuestTemplates, type QuestTemplate } from "./quests";

/**
 * The one reader in the expedition set that needs the database, kept apart from the predicates
 * in `db/expeditions.ts` for a reason that is not tidiness: the quest screens import those
 * predicates, and two of their tests mock `db/*` module by module. A predicate that dragged the
 * SQLite client in behind it left those tests choosing between mocking the rule they exercise
 * and not running at all. The rule stays importable on its own; the query lives here.
 */

export type Outing = {
  quest: QuestTemplate;
  /**
   * The movement the quest is made of. Home's band names *this* rather than the quest, because
   * "Course du Messager" says which one is the run and "La Parole Doit Passer" does not.
   */
  exercise: Exercise;
};

/**
 * The ways out, in content order.
 *
 * Both reads are the cached ones, so this costs nothing on a warm app and one query each on a
 * cold one. Nothing is scoped to `Admin`: a hero who writes their own hour-long run has written
 * a door out, and it belongs in the band next to the three seeded ones. What keeps a hero's
 * mixed quest out is `isOutingQuest`, not who authored it.
 */
export async function listOutings(): Promise<Outing[]> {
  const [quests, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
  const exercisesById: Record<number, Exercise> = Object.fromEntries(
    exercises.map((e) => [e.id, e] as const),
  );

  const outings: Outing[] = [];
  for (const quest of quests) {
    if (!isOutingQuest(quest, exercisesById)) continue;
    const exercise = exercisesById[quest.exercises[0]?.exerciseId ?? -1];
    if (exercise) outings.push({ quest, exercise });
  }
  return outings;
}
