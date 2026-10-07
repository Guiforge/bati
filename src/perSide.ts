/**
 * A hold done one side, then the other (`exercises.perSide`, `0068`), as one clock.
 *
 * The clock runs `side + SIDE_SWITCH_SECONDS + side`: the first side, a short uncounted switch,
 * the second side, then overtime like any hold. The switch exists because changing legs in a
 * pigeon pose or getting down onto the other forearm takes seconds, and without it they came out
 * of the second side. Pure functions, so the store that sets the clock, the view that reads it and
 * the estimate that prices it cannot disagree on where the switch is.
 */

/** Long enough to get onto the other side, short enough not to cool down. */
export const SIDE_SWITCH_SECONDS = 5;

/** The whole clock for a per-side hold of `sideSeconds` a side. */
export function perSideClockSeconds(sideSeconds: number): number {
  return sideSeconds * 2 + SIDE_SWITCH_SECONDS;
}

export type SidePhase = {
  phase: "first" | "switch" | "second";
  /** What the numeral counts down in this phase. Negative in the second side's overtime. */
  seconds: number;
};

/** Where `remainingSeconds` (of `perSideClockSeconds(side)`) stands. */
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
 * The seconds a per-side hold logs: one side's worth, so the record, the ghost and the Journal
 * compare a side plank to the side planks before it. In coaching it is the weaker side that counts,
 * so a short side is never hidden behind a full one.
 *
 * - On the first side, the time held. A hero who stops at 25 s because the shoulder hurt held 25 s.
 * - During the switch, the full first side: the second was never started.
 * - On the second side, short of the target, the second side: 30 s left then 8 s right is 8 s per
 *   side, because that 8 is what the next target has to be built on.
 * - Past it, the average of the two, so a longer second side still counts for something.
 *
 * The switch is never counted. The figure dips when the second side starts, and the screen says so
 * honestly: the ghost line then compares the side in progress.
 */
export function perSideHeldSeconds(elapsedSeconds: number, sideSeconds: number): number {
  if (elapsedSeconds < sideSeconds) return elapsedSeconds;
  const second = elapsedSeconds - sideSeconds - SIDE_SWITCH_SECONDS;
  if (second < 0) return sideSeconds;
  if (second < sideSeconds) return second;
  return Math.floor((sideSeconds + second) / 2);
}
