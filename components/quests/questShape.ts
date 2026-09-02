/**
 * What a quest's shape makes possible, so nothing offers a control that cannot fire.
 *
 * `estimateQuestSeconds` (db/estimate.ts) already counts zero of both rests below: with one
 * movement every gap is a round boundary, and with one round there is no boundary at all. The
 * steppers that set them, and the chip that reports them, were still on screen — "a control
 * wired to nothing is invisible to every tool you own" (AGENTS.md), and here it was worse than
 * invisible: an expedition promised a 30 s rest it never takes.
 *
 * Stated as quest shape rather than as an expedition check on purpose. The three outings are
 * where it showed, but a one-movement quest anyone writes in the editor has exactly the same
 * dead control.
 */

export function restsBetweenExercises(quest: { exercises: unknown[] }): boolean {
  return quest.exercises.length > 1;
}

export function restsBetweenRounds(quest: { rounds: number }): boolean {
  return quest.rounds > 1;
}
