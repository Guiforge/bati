import { useIsFocused } from "expo-router";
import { useEffect } from "react";

import { type CueOwner, useChorusStore } from "@/stores/chorus";

/**
 * Binds a screen to the cues it owns: returns whether the screen is focused, and sends away its
 * cue when the screen loses focus or unmounts.
 *
 * Only its own: a cue raised by another screen (the one being navigated to, say) is never touched,
 * and a screen never draws a cue it does not own. Tab screens stay mounted once visited, so
 * without an owner every one of them would draw, and dismiss, whatever was current.
 */
export function useCueOwner(owner: CueOwner): boolean {
  const focused = useIsFocused();
  const dismissOwned = useChorusStore((s) => s.dismissOwned);

  useEffect(() => {
    if (!focused) dismissOwned(owner);
  }, [focused, owner, dismissOwned]);
  useEffect(() => () => dismissOwned(owner), [owner, dismissOwned]);

  return focused;
}
