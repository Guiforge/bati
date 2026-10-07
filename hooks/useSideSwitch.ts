import { useEffect, useRef } from "react";
import { useCountdownCues } from "@/hooks/useCountdownCues";
import { useHaptics } from "@/hooks/useHaptics";

/**
 * Halfway through a hold done one side, then the other (`exercises.perSide`, `0068`): change sides.
 *
 * Felt and heard. The phone is on the floor, and a line of text changing colour is not something
 * anyone sees from a side plank, so it vibrates whether or not the beeps are on. With them on, the
 * halfway counts down like the end of a set, 3-2-1, then two short beeps instead of the long one:
 * the same countdown, a different zero, so the hero does not stand up at halfway.
 *
 * The warm-up and a quest's timed slot both call this, so the two cannot disagree on what a switch
 * sounds like. `halfSeconds` is where `remainingSeconds` crosses into the second side.
 */
export function useSideSwitch(remainingSeconds: number, halfSeconds: number, sided: boolean): void {
  const { mediumImpact } = useHaptics();
  useCountdownCues(sided ? remainingSeconds - halfSeconds : 0, "switch");

  const previousRef = useRef(remainingSeconds);
  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = remainingSeconds;
    if (
      sided &&
      previous > halfSeconds &&
      remainingSeconds <= halfSeconds &&
      remainingSeconds > 0
    ) {
      mediumImpact();
    }
  }, [remainingSeconds, sided, halfSeconds, mediumImpact]);
}
