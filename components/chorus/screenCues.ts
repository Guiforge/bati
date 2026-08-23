import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect } from "react";

import type { GuideMoment } from "@/constants/villagers";
import { preferences } from "@/db";
import { getStreakInfo } from "@/db/streaks";
import { reportError } from "@/src/reportError";
import { useChorusStore } from "@/stores/chorus";

/**
 * The two cues a *screen* raises, as opposed to the ones a session does.
 *
 * Both consult something persisted before deciding, which is what keeps them out of the store:
 * `cue()` is synchronous and must stay that way — it runs inside a render effect — so anything
 * that needs a disk read to know whether it should fire does the reading here and calls `cue()`
 * only once it has an answer.
 */

/** After this long away, a returning hero is greeted. Under it, nothing is said at all. */
const ABSENCE_DAYS = 7;

/**
 * Show a screen's first-visit guide, once ever.
 *
 * There is no tap-to-advance and no second bubble. One villager, one sentence, gone on its own —
 * which keeps the whole layer non-interactive (`pointerEvents="none"` everywhere, no exception for
 * a guide) and makes "short and skippable" true by construction rather than by a Skip button. A
 * screen you are looking at needs one sentence; if it needs three, the screen is the problem.
 */
export function useScreenGuide(moment: GuideMoment): void {
  const cue = useChorusStore((s) => s.cue);

  useEffect(() => {
    let cancelled = false;

    preferences
      .getGuidesSeen()
      .then((seen) => {
        if (cancelled || seen.includes(moment)) return;
        cue(moment);
        return preferences.setGuidesSeen([...seen, moment]);
      })
      .catch((error) => reportError("chorus.guide", error));

    // Marked seen as soon as it is raised, not when it finishes: a hero who leaves the screen
    // mid-sentence has met the guide, and showing it again would be the app not trusting them.
    return () => {
      cancelled = true;
    };
  }, [moment, cue]);
}

/**
 * Greet a hero who has been away, exactly once per absence.
 *
 * Keyed on the *last workout date* rather than on when the greeting was last shown. Storing "when
 * did we greet" would re-greet on every app open during a long absence — reminding someone daily
 * that they are not training, which is precisely the shame loop that the research says makes
 * people stop opening the app at all. None of the lines mention the absence either.
 */
export function useComebackCue(): void {
  const cue = useChorusStore((s) => s.cue);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { lastWorkoutDate } = await getStreakInfo();
      if (cancelled || !lastWorkoutDate) return;
      if (differenceInCalendarDays(new Date(), parseISO(lastWorkoutDate)) < ABSENCE_DAYS) return;
      if ((await preferences.getComebackGreetedAfter()) === lastWorkoutDate) return;

      cue("comeback");
      await preferences.setComebackGreetedAfter(lastWorkoutDate);
    })().catch((error) => reportError("chorus.comeback", error));

    return () => {
      cancelled = true;
    };
  }, [cue]);
}
