/**
 * How tall a session's top artwork is, capped against *both* window axes so a short screen still
 * leaves the primary action room.
 *
 * Its own module because `ExerciseHero` and `BossArena` share the same picture slot and must
 * start from the same cut.
 *
 * The boss gets a taller cut than the exercise: the monster is the screen's subject and play
 * testing said it still read too small at the shared size. Both branches use this as a *floor*:
 * the hero and the arena are the elastic child of their column and grow past it to fill whatever
 * the counter and the CTA leave. So the art's height is NOT a pure function of the window, and
 * nothing may anchor to its bottom edge: `BossTauntOverlay` anchors to the top (under the HUD).
 */
const ART_FACTOR = {
  exercise: 0.34,
  boss: 0.46,
} as const;

export type SessionArtKind = keyof typeof ART_FACTOR;

/**
 * The floating HUD row in ActiveExerciseView: 8 top + ~36 row + 8 gap + 3 for its own progress
 * hairline (not the boss's: the HP gauge is under the boss's name now).
 *
 * Here rather than in `ExerciseHero` because `LiveMap` takes the same slot on an outing and has to
 * reserve the same room, and a component module that exports a constant loses Fast Refresh.
 */
export const HUD_HEIGHT = 56;

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
