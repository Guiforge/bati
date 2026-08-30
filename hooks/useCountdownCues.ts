import { useEffect, useRef } from "react";
import { playCue, warm } from "@/src/sounds";
import { useSettingsStore } from "@/stores/settings";

/**
 * Beep the last three seconds of a timer, and once more on zero.
 *
 * Written once and called from all three timed views rather than copied into each: the four lines
 * of counting are the easy half, and the `previousRef` lifecycle around them is where the mistakes
 * live — three copies would be three places to get the negative-seconds guard wrong.
 *
 * The caller passes `remainingSeconds` straight from `useSessionTimer`, which needs no guard of
 * its own for the cases that look like they need one:
 *
 * - **Overtime.** A timed exercise keeps counting past its target, so `remainingSeconds` goes
 *   negative. `-1` and below match neither branch: "go" fires once at zero and the set stays
 *   silent for as long as the hero holds it.
 * - **Rep-based exercises.** No timer runs, so `remainingSeconds` is a constant `0`. That is the
 *   one value the mount must stay quiet on (see below), which is why this takes no `isTimeBased`
 *   parameter — lucky, since `ActiveExerciseView` computes it below an early return.
 * - **Pause.** `resumeSession` shifts `timerStartTimestamp` by the paused duration, so the count
 *   is monotonically non-increasing across a pause. It can repeat a value — caught by the change
 *   test — but never climbs back through 3-2-1.
 * - **A jump.** Android stops the 10 Hz interval while the app is backgrounded, and React batches
 *   a burst of updates into one render, so a resume arrives as one large step. The range test
 *   handles it: a rest that slept through 3-2-1 announces its zero and nothing else.
 *
 * The two crossings that *do* repeat are meant to: `addRestTime(+30)` during a rest, and the
 * remount `ActiveExerciseView` does per exercise.
 */
export function useCountdownCues(remainingSeconds: number): void {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  // `null` until the first run, which is what tells a mount apart from a tick.
  const previousRef = useRef<number | null>(null);

  useEffect(() => {
    if (soundEnabled) warm();
  }, [soundEnabled]);

  useEffect(() => {
    const previous = previousRef.current;
    // Updated before the enabled check, deliberately: turning sound on at 0:02 should be heard
    // as "1", not as "2" and "1" fired back to back once the effect re-runs.
    previousRef.current = remainingSeconds;
    if (!soundEnabled || remainingSeconds === previous) return;

    // A mount inside the last three seconds still counts, because one view starts there:
    // `CountdownView` opens on exactly 3 (PRE_START_COUNTDOWN_SECONDS), so a blanket "the mount
    // is silent" rule would show a 3 on screen and beep only twice. Zero is the exception, and
    // the only one that matters — a rep-based exercise parks there forever and must never sound
    // like a set that just ended. Rest and timed sets mount far above 3 and are unaffected.
    if (previous === null && remainingSeconds === 0) return;

    if (remainingSeconds >= 1 && remainingSeconds <= 3) playCue("tick");
    else if (remainingSeconds === 0) playCue("go");
  }, [remainingSeconds, soundEnabled]);
}
