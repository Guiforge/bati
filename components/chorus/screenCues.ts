import { differenceInCalendarDays, parseISO } from "date-fns";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { type GuideMoment, MOMENT_CAST } from "@/constants/villagers";
import { preferences } from "@/db";
import { getStreakInfo } from "@/db/streaks";
import { reportError } from "@/src/reportError";
import { type CueOwner, useChorusStore } from "@/stores/chorus";

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
 * which makes "short and skippable" true by construction rather than by a Skip button. A
 * screen you are looking at needs one sentence; if it needs three, the screen is the problem.
 */
export function useScreenGuide(moment: GuideMoment, { enabled = true } = {}): void {
  const cue = useChorusStore((s) => s.cue);

  // On *focus*, not on mount. A tab navigator keeps a screen mounted once it has been visited, so
  // a mount effect runs exactly once per app launch — and a guide that politely stood aside the
  // first time would then never try again. Arriving on a screen is a focus event.
  useFocusEffect(
    useCallback(() => {
      // Off when the screen cannot show it (the Village on a window with no room for the figure):
      // a guide marked seen and never drawn is a tutorial burnt unread.
      if (!enabled) return;
      let cancelled = false;

      preferences
        .getGuidesSeen()
        .then((seen) => {
          if (cancelled || seen.includes(moment)) return;
          // Marked seen by the drawer (`useGuideSeen`), once a villager is actually drawn saying
          // it. `cue` refuses a guide while an event or another guide speaks, and an accepted cue
          // can still go undrawn (the Village failing to load, Home's comeback replacing it): a
          // flag written here would burn a tutorial nobody read, and there is no second chance.
          cue(moment);
        })
        .catch((error) => reportError("chorus.guide", error));

      // Marked as soon as it is *drawn*, not when it finishes: a hero who leaves the screen
      // mid-sentence has met the guide, and showing it again would be the app not trusting them.
      return () => {
        cancelled = true;
      };
    }, [moment, cue, enabled]),
  );
}

/**
 * Raise a screen's ambient cue when the hero arrives on it.
 *
 * All four browsing screens share the *same* ambient window as the rest screen, on purpose: the
 * promise is one villager per half-hour wherever you are, not one per surface. Without that,
 * wandering Quests -> Adventures -> Journal before a session would quietly spend three times the
 * rate the session was tuned for.
 */
export function useAmbientVisit(
  moment: "village_visit" | "menu_visit",
  { owner, enabled = true }: { owner?: CueOwner; enabled?: boolean } = {},
): void {
  const cue = useChorusStore((s) => s.cue);

  // Focus, not mount, for the same reason as the guide: a tab screen stays mounted after its first
  // visit, so a mount effect would mean the village greeted you once per app launch and never
  // again. The window is what keeps this rare, not the mounting.
  useFocusEffect(
    useCallback(() => {
      if (enabled) cue(moment, undefined, owner);
    }, [moment, owner, enabled, cue]),
  );
}

/**
 * A first-visit guide on screen is not replaced by the greeting: it has one chance and the
 * greeting has many (not marked greeted, so the next visit owes it). Replacing it burnt
 * guide_home. Asked right before the cue, after the last await: the guide can land during one.
 */
function guideSpeaking(): boolean {
  const speaking = useChorusStore.getState().current;
  return speaking !== null && MOMENT_CAST[speaking.moment].priority === "guide";
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

  // On focus, not on mount: Home stays mounted behind a session, so a cold start straight into
  // one used to greet (and mark the hero greeted) under the rest screen, where the line then
  // showed as the first rest's and held the ambient budget.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const { lastWorkoutDate } = await getStreakInfo();
        if (cancelled || !lastWorkoutDate) return;
        if (differenceInCalendarDays(new Date(), parseISO(lastWorkoutDate)) < ABSENCE_DAYS) return;
        if ((await preferences.getComebackGreetedAfter()) === lastWorkoutDate) return;
        if (cancelled || guideSpeaking()) return;

        cue("comeback");
        await preferences.setComebackGreetedAfter(lastWorkoutDate);
      })().catch((error) => reportError("chorus.comeback", error));

      return () => {
        cancelled = true;
      };
    }, [cue]),
  );
}
