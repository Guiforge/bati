import { useEffect, useRef } from "react";
import { playCue, warm } from "@/src/sounds";
import { useSettingsStore } from "@/stores/settings";

/**
 * Beep the last three seconds of a timer, and once more on zero.
 *
 * Written once and called from both timed views rather than copied into each: the four lines of
 * counting are the easy half, and the `prevRef` lifecycle around them is where the mistakes live
 * — two copies would be two places to get the negative-seconds guard wrong.
 *
 * The caller passes `remainingSeconds` straight from `useSessionTimer`, which needs no guard of
 * its own for the three cases that look like they need one:
 *
 * - **Overtime.** A timed exercise keeps counting past its target, so `remainingSeconds` goes
 *   negative. `-1` and below match neither branch: "go" fires once at zero and the set stays
 *   silent for as long as the hero holds it.
 * - **Rep-based exercises.** No timer runs, so `remainingSeconds` is a constant `0` and `prevRef`
 *   initialises to it — the change test never passes, and "go" never fires on mount. That is why
 *   this takes no `isTimeBased` parameter (which is lucky: `ActiveExerciseView` computes it below
 *   an early return).
 * - **Pause.** `resumeSession` shifts `timerStartTimestamp` by the paused duration, so the count
 *   is monotonically non-increasing across a pause. It can repeat a value — caught by the change
 *   test — but never climbs back through 3-2-1.
 *
 * The two crossings that *do* repeat are meant to: `addRestTime(+30)` during a rest, and the
 * remount `ActiveExerciseView` does per exercise.
 */
export function useCountdownCues(remainingSeconds: number): void {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const previousRef = useRef(remainingSeconds);

  useEffect(() => {
    if (soundEnabled) warm();
  }, [soundEnabled]);

  useEffect(() => {
    const previous = previousRef.current;
    // Updated before the enabled check, deliberately: turning sound on at 0:02 should be heard
    // as "1", not as "2" and "1" fired back to back once the effect re-runs.
    previousRef.current = remainingSeconds;
    if (!soundEnabled || remainingSeconds === previous) return;

    if (remainingSeconds >= 1 && remainingSeconds <= 3) playCue("tick");
    else if (remainingSeconds === 0) playCue("go");
  }, [remainingSeconds, soundEnabled]);
}
