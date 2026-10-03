import { useEffect } from "react";

import { MOMENT_CAST } from "@/constants/villagers";
import { preferences } from "@/db";
import { reportError } from "@/src/reportError";
import type { Cameo } from "@/stores/chorus";

/**
 * Marks a guide seen once it is DRAWN, which is the only moment the hero has met it. Both drawers
 * (the Village figure, `VillagerLine`) call it with the cameo they are showing, or null.
 *
 * Marking at cue time burnt tutorials nobody saw: the Village scene failing to load mounts no
 * figure, and Home's comeback greeting replaces guide_home in the store before its line renders.
 * A guide has no second chance, so the flag follows the screen, not the store.
 */
export function useGuideSeen(drawn: Cameo | null): void {
  const moment = drawn && MOMENT_CAST[drawn.moment].priority === "guide" ? drawn.moment : null;
  useEffect(() => {
    if (!moment) return;
    preferences
      .getGuidesSeen()
      .then((seen) =>
        seen.includes(moment) ? undefined : preferences.setGuidesSeen([...seen, moment]),
      )
      .catch((error) => reportError("chorus.guide", error));
  }, [moment]);
}
