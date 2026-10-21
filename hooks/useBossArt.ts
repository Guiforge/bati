import { useEffect, useState } from "react";
import { type BossFight, getBossArt } from "@/db/bossFights";
import type { BossArt } from "@/db/bossVoice";
import { countsAsDeed } from "@/db/deed";
import { reportError } from "@/src/reportError";

const NONE: BossArt = {};

/**
 * The hero's own pictures of the boss they are facing: empty for a seeded boss (no query) and
 * until the read lands, when the painted monster shows. One small read per mount; the photos stay
 * out of `BossFight` on purpose (`getBossArt`).
 */
export function useBossArt(fight: Pick<BossFight, "adventureId" | "author"> | null): BossArt {
  // The hero's own boss only: a seeded fight (and one saved before 0076) has no pictures to read.
  const adventureId = fight && !countsAsDeed(fight) ? fight.adventureId : null;
  const [loaded, setLoaded] = useState<{ id: number; art: BossArt } | null>(null);

  useEffect(() => {
    if (adventureId === null) return;
    let cancelled = false;
    getBossArt(adventureId)
      .then((art) => {
        if (!cancelled) setLoaded({ id: adventureId, art });
      })
      .catch((error: unknown) => reportError("boss.art", error));
    return () => {
      cancelled = true;
    };
  }, [adventureId]);

  return loaded && loaded.id === adventureId ? loaded.art : NONE;
}
