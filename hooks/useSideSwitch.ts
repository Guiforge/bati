import { useEffect, useRef } from "react";
import { useCountdownCues } from "@/hooks/useCountdownCues";
import { useHaptics } from "@/hooks/useHaptics";

/**
 * The change of sides in a hold done one side, then the other (`exercises.perSide`, `0068`).
 *
 * Felt and heard. The phone is on the floor, and a line of text changing colour is not something
 * anyone sees from a side plank, so it vibrates whether or not the beeps are on. With them on, the
 * end of the first side counts down like the end of a set, 3-2-1, then two short beeps instead of
 * the long one: the same countdown, a different zero, so the hero does not stand up at halfway.
 *
 * With a switch (`switchSeconds > 0`, a quest's hold: see `src/perSide.ts`), its end is announced
 * too, 3-2-1 and the "go" a rest ends on, and a second vibration: the second side starts now. The
 * warm-up has none, its sides are fifteen seconds of mobility, so its switch is a single moment.
 *
 * `remainingSeconds` counts the whole clock down; the second side starts at `sideSeconds`.
 */
export function useSideSwitch(
  remainingSeconds: number,
  sideSeconds: number,
  switchSeconds: number,
  sided: boolean,
): void {
  const { mediumImpact } = useHaptics();
  useCountdownCues(sided ? remainingSeconds - sideSeconds - switchSeconds : null, "switch");
  useCountdownCues(sided && switchSeconds > 0 ? remainingSeconds - sideSeconds : null, "go");

  const previousRef = useRef(remainingSeconds);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = remainingSeconds;
    if (!sided || remainingSeconds <= 0) return;
    const crossed = (mark: number) => previous > mark && remainingSeconds <= mark;
    if (crossed(sideSeconds + switchSeconds) || (switchSeconds > 0 && crossed(sideSeconds))) {
      mediumImpact();
    }
  }, [remainingSeconds, sided, sideSeconds, switchSeconds, mediumImpact]);
}
