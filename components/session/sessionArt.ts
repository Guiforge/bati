/**
 * How tall a session's top artwork is, capped against *both* window axes so a short screen still
 * leaves the primary action room.
 *
 * Its own module because three things need the same answer and none of them can measure the
 * others: `ExerciseHero` and `BossArena`, which share the same picture slot, and
 * `BossTauntOverlay`, which renders above every session view and anchors its bubble under
 * whatever the screen puts at its top. A shared module is what makes that anchor correct on both
 * screens without a measurement, a context or a prop.
 *
 * The boss gets a taller cut than the exercise: the monster is the screen's subject and play
 * testing said it still read too small at the shared size. The exercise branch only uses this
 * as a *floor*: `ExerciseHero` is the elastic sibling in its column and grows past it to fill
 * whatever the counter and the CTA leave.
 */
const ART_FACTOR = {
  exercise: 0.34,
  boss: 0.46,
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
 * The rest screen's top block, which is the arena's counterpart there.
 *
 * A rest looks the same whether or not a boss is being fought: the monster owns the screen where
 * the work happens and nowhere else. So the arena is not rendered during a rest, and the flame
 * header takes its place at a fixed height, which `RestView` sets from this constant rather than
 * from the sum of its own children.
 *
 * It is here for the same reason the factors are: `BossTauntOverlay` anchors its bubble under
 * whichever of the two the session is showing, and it cannot measure either.
 *
 * **Below the safe area, not from the top of the screen.** 16 of padding, a 40 flame, an 8 gap
 * and a 38 line. Both readers add `insets.top` themselves, because the status bar is the one part
 * of this neither of them can hard-code.
 */
export const REST_HEADER_HEIGHT = 102;
