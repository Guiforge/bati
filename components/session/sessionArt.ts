/**
 * How tall a session's top artwork is, capped against *both* window axes so a short screen still
 * leaves the primary action room.
 *
 * Its own module because three things need the same answer and none of them can measure the
 * others: `ExerciseHero`, `BossArena` — they share the same picture slot — and `BossTauntOverlay`,
 * which renders above every session view and anchors its bubble to the arena's bottom edge. A
 * shared pure function is what makes that anchor correct in both the running and the resting
 * screen without a measurement, a context or a prop.
 *
 * The boss gets a taller cut than the exercise: the monster is the screen's subject and play
 * testing said it still read too small at the shared size. Every pixel here comes straight out of
 * the ScrollView below — at the boss factor a 360x640 running screen keeps ~13 px of slack before
 * the rep counter scrolls, which it is built to do. The taunt bubble always anchors to the *boss*
 * height, since it only exists during a fight.
 */
export function sessionArtHeight(
  width: number,
  height: number,
  kind: "exercise" | "boss" = "exercise",
): number {
  const factor = kind === "boss" ? 0.46 : 0.42;
  return Math.min(Math.round(height * factor), Math.round(width * 1.1));
}
