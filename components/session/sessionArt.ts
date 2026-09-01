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
 * testing said it still read too small at the shared size. The exercise branch only uses this
 * as a *floor*: `ExerciseHero` is the elastic sibling in its column and grows past it to fill
 * whatever the counter and the CTA leave.
 *
 * **`boss_rest` is the same monster on a screen it is no longer the subject of.** During a rest
 * the timer is, and the arena kept claiming 46% of the height anyway: the rest column overflowed
 * and the set-review card, the only place a wrong result can be corrected, was cut in half at the
 * fold, with `showsVerticalScrollIndicator={false}` hiding the fact that it scrolled at all.
 * Twelve points of screen height is roughly the overflow, so a resting boss takes the ordinary
 * art slot.
 *
 * The taunt bubble anchors to whichever of the three the session is showing, which is why this is
 * one function rather than a constant in each component. Get it wrong and the bubble floats over
 * the arena or under it, during rests only, which is the kind of bug nobody reproduces.
 */
const ART_FACTOR = {
  exercise: 0.34,
  boss: 0.46,
  /** Shares the exercise factor today. Nothing says the two must move together. */
  boss_rest: 0.34,
} as const;

export type SessionArtKind = keyof typeof ART_FACTOR;

export function sessionArtHeight(
  width: number,
  height: number,
  kind: SessionArtKind = "exercise",
): number {
  return Math.min(Math.round(height * ART_FACTOR[kind]), Math.round(width * 1.1));
}

/**
 * Which slot the monster takes, from the only thing that decides it.
 *
 * Here rather than at either call site: `BossArena` renders the arena and `BossTauntOverlay`
 * anchors to its bottom edge, and the two agreeing is the whole reason this module exists. A
 * ternary in each of them is two places to get it wrong, and one of them is a component already
 * at its complexity ceiling.
 */
export function bossArtKind(resting: boolean): SessionArtKind {
  return resting ? "boss_rest" : "boss";
}
