/**
 * How tall a session's top artwork is, capped against *both* window axes so a short screen still
 * leaves the primary action room.
 *
 * Its own module because three things need the same answer and none of them can measure the
 * others: `ExerciseHero`, `BossArena` — they are the same picture slot, so they are the same size
 * — and `BossTauntOverlay`, which renders above every session view and anchors its bubble to the
 * arena's bottom edge. A shared pure function is what makes that anchor correct in both the
 * running and the resting screen without a measurement, a context or a prop.
 *
 * Every pixel over this comes straight out of the ScrollView below it: on a 360x640 the running
 * screen has about 39 px of slack. Grow the art and the CTA is what pays.
 */
export function sessionArtHeight(width: number, height: number): number {
  return Math.min(Math.round(height * 0.42), Math.round(width * 1.1));
}
