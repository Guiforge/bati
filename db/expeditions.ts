import type { Exercise } from "./exercises";
import { NON_REP_STYLE } from "./workUnits";

/**
 * Nothing here reaches the database, and that is load-bearing rather than tidy: two screen tests
 * mock `db/*` module by module, so a predicate that dragged the SQLite client in behind it left
 * them with a choice between mocking the rule and not running. The reader that does need the
 * database is `listOutings`, in `db/quests.ts`, where the query belongs anyway.
 */

/** Only what the two predicates read — `QuestTemplate` and `Quest` both satisfy it. */
type Slotted = { exercises: { exerciseId: number }[] };

/** As little of a movement as the rule needs. */
type Styled = { style: Exercise["style"] };

/**
 * `every` on an empty array is true, and a quest with no exercises is exactly what the editor
 * holds while the hero is still writing it. A slot pointing at a row that is not in the
 * catalogue is not outdoors either - it is unknown, and unknown is not a door out.
 */
function allOutdoors(movements: (Styled | undefined)[]): boolean {
  return movements.length > 0 && movements.every((m) => m?.style === NON_REP_STYLE);
}

/**
 * Two questions about the same word, kept side by side because they are genuinely different
 * and the difference is the whole reason this file exists.
 *
 * The gallery's "Outside" chip asks the generous one: show me anything that happens out there,
 * including a quest that walks for ten minutes and then does push-ups in the yard. Home's band
 * asks the strict one: which quests *are* a way out, so a tap on one is a tap on going running
 * and nothing else. A mixed quest answers yes to the first and no to the second.
 *
 * Written as one predicate they would drift the moment either surface changed its mind, which
 * is the failure mode AGENTS.md names. Written as two, the gap is on screen.
 */
export function hasOutdoorMovement(
  quest: Slotted,
  exercisesById: Record<number, Exercise>,
): boolean {
  return quest.exercises.some((qex) => exercisesById[qex.exerciseId]?.style === NON_REP_STYLE);
}

/** A door out: every slot is an expedition, and there is at least one. */
export function isOutingQuest(quest: Slotted, exercisesById: Record<number, Exercise>): boolean {
  return allOutdoors(quest.exercises.map((qex) => exercisesById[qex.exerciseId]));
}

/**
 * The same question, of a quest whose slots already carry their movement.
 *
 * The gallery holds ids and a catalogue; the detail screen and the session store hold the
 * resolved rows. Two adapters over one rule rather than the rule written twice - the shapes
 * differ, the question does not.
 */
export function isOutingSession(quest: { exercises: { exercise: Styled }[] }): boolean {
  return allOutdoors(quest.exercises.map((qex) => qex.exercise));
}
