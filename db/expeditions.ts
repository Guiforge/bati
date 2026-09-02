import type { OutingGoal } from "@/src/gps/track";
import type { Exercise } from "./exercises";
import type { Target } from "./targets";
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

/**
 * The outdoor slots' combined duration, when at least one of them is timed.
 *
 * Only a slot whose movement is the outdoor style may contribute: the goal is a promise about
 * ground and moving time, and the GPS never measures an indoor slot, whatever that slot's own
 * target looks like. Three shapes decide this on purpose:
 *
 * - Warden's Walk (outdoor, 900 s) next to Plank (indoor, 60 s) now goals at 900, not 960 - the
 *   plank never moved the hero an inch, so its seconds were never part of a moving-time promise.
 *   This is the regression the fix wave introduced: it summed every timed slot regardless of
 *   style, so a mixed quest buzzed late or never.
 * - Warden's Walk next to an indoor *rep* slot goals the same 900. The indoor slot's own target
 *   type does not matter once its style already disqualifies it - a rep slot excluded for being
 *   indoors must not also revert the whole goal to null the way an all-slots-must-be-timed rule
 *   would.
 * - An all-outdoor quest is unchanged: every slot it has already passes the style filter, so two
 *   outdoor timed slots still sum to both slots' minutes, exactly as before this fix.
 */
function timeGoal(exercises: { target: Target; exercise: Styled }[]): OutingGoal | null {
  const outdoorTimed = exercises.filter(
    (qex) => qex.exercise.style === NON_REP_STYLE && qex.target.type === "time",
  );
  if (outdoorTimed.length === 0) return null;
  const seconds = outdoorTimed.reduce((sum, qex) => sum + qex.target.value, 0);
  return { type: "time", seconds };
}

/**
 * What the hero set out to do. A distance, when they chose one on the quest screen; otherwise the
 * outdoor slots' combined duration, which is the number the steppers on that screen edit for a
 * pure outing. A quest with no outdoor timed slot at all - no slots, an indoor-only quest, or a
 * lone outdoor rep slot - has none.
 */
export function outingGoal(
  quest: { exercises: { target: Target; exercise: Styled }[] },
  distanceGoalM: number | null | undefined,
): OutingGoal | null {
  if (distanceGoalM != null && distanceGoalM > 0)
    return { type: "distance", metres: distanceGoalM };
  return timeGoal(quest.exercises);
}

/**
 * Whether this outing is on a mount. Read off the movement rather than asked, because the hero
 * already chose it by choosing the quest. Moved here from the session store so the quest screen
 * can estimate a ride from a distance with the same answer the speed cap uses.
 */
export function isMountedOuting(quest: { exercises: { exercise: { enName: string } }[] }): boolean {
  return quest.exercises.some((slot) => slot.exercise.enName === "Outrider's Ride");
}

/** Nominal speeds for an estimate, in m/s. A brisk walk and a steady ride; a run sits between. */
const NOMINAL_SPEED_MS = { onFoot: 1.4, mounted: 5.6 } as const;

/**
 * How long a distance goal is likely to take, for the "≈ 40 min" tag on the quest screen. An
 * estimate and labelled as one; XP is paid on moving seconds, never on this.
 */
export function estimateDistanceSeconds(metres: number, mounted: boolean): number {
  const speed = mounted ? NOMINAL_SPEED_MS.mounted : NOMINAL_SPEED_MS.onFoot;
  return Math.max(1, Math.round(metres / speed));
}
