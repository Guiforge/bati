/**
 * A hold done one side, then the other (`exercises.perSide`, `0068`), as one clock.
 *
 * The clock runs `side + SIDE_SWITCH_SECONDS + side`: the first side, a short uncounted switch,
 * the second side, then overtime like any hold. The switch exists because changing legs in a
 * pigeon pose or getting down onto the other forearm takes seconds, and without it they came out
 * of the second side. Pure functions, so the store that sets the clock, the view that reads it and
 * the estimate that prices it cannot disagree on where the switch is.
 */

/**
 * Long enough to get onto the other side, short enough not to cool down. Five was too short to
 * change legs in a pigeon pose on a knee that is coming back from surgery; eight is one constant
 * for every movement rather than a table of postures.
 */
export const SIDE_SWITCH_SECONDS = 8;

/** The whole clock for a per-side hold of `sideSeconds` a side. */
export function perSideClockSeconds(sideSeconds: number): number {
  return sideSeconds * 2 + SIDE_SWITCH_SECONDS;
}

export type SidePhase = {
  phase: "first" | "switch" | "second";
  /** What the numeral counts down in this phase. Negative in the second side's overtime. */
  seconds: number;
};

/**
 * Where `remainingSeconds` stands. `sideSeconds` is the second side's length: the target, or the
 * first side's time once "Next side" cut it short (the first side is over by then).
 */
export function sidePhase(remainingSeconds: number, sideSeconds: number): SidePhase {
  if (remainingSeconds > sideSeconds + SIDE_SWITCH_SECONDS) {
    return { phase: "first", seconds: remainingSeconds - sideSeconds - SIDE_SWITCH_SECONDS };
  }
  if (remainingSeconds > sideSeconds) {
    return { phase: "switch", seconds: remainingSeconds - sideSeconds };
  }
  return { phase: "second", seconds: remainingSeconds };
}

/**
 * A second side shorter than this has not really been started: the hero tapped Done on the "go",
 * or reached for the phone instead of the floor. It counts as the switch.
 */
export const SECOND_SIDE_GRACE_SECONDS = 3;

/**
 * What a per-side hold logs, and how many sides it pays for.
 *
 * `seconds` is one side's worth, so the record, the ghost and the Journal compare a side plank to
 * the side planks before it. In coaching it is the weaker side that counts, so a short side is
 * never hidden behind a full one:
 *
 * - On the first side, the time held. A hero who stops at 25 s because the shoulder hurt held 25 s.
 * - In the switch, or the first few seconds after it, the full first side.
 * - On the second side, short of the target, the second side: 30 s left then 8 s right is 8 s per
 *   side, because that 8 is what the next target has to be built on.
 * - Past it, the average of the two, so a longer second side still counts for something.
 * - A first side cut short with "Next side" (`firstSideSeconds`) is that side's real time, and the
 *   weaker of the two sides is logged: 10 s then 5 s is 5 s per side, 10 s then 20 s is 10.
 *
 * The average is for two full sides only: 20 then 40 is 30, 19 then 40 is 19. A side short of its
 * target is the figure the next target has to be built on, however long the other one lasted.
 *
 * `sides` is what XP and the boss pay for: two only once the second side has really been worked.
 * Holding the first side and tapping Done in the switch is one side of work, and is paid as one.
 * The switch is never counted.
 */
export function perSideSet(
  elapsedSeconds: number,
  sideSeconds: number,
  firstSideSeconds: number | null = null,
): { seconds: number; sides: 1 | 2 } {
  if (elapsedSeconds < sideSeconds) return { seconds: elapsedSeconds, sides: 1 };
  const first = firstSideSeconds ?? sideSeconds;
  const second = elapsedSeconds - sideSeconds - SIDE_SWITCH_SECONDS;
  if (second < SECOND_SIDE_GRACE_SECONDS) return { seconds: first, sides: 1 };
  if (second < sideSeconds || first < sideSeconds) {
    return { seconds: Math.min(first, second), sides: 2 };
  }
  return { seconds: Math.floor((first + second) / 2), sides: 2 };
}
