import { useEffect, useState } from "react";
import { routeCandidates } from "@/db/gps";
import type { Locomotion } from "@/db/schema";
import type { RoutePoint, RouteShape } from "@/src/gps/route";
import { reportError } from "@/src/reportError";

// ponytail: one entry, the outing in progress, so its recap reuses the live map's read. Upgrade to
// a small LRU only if a screen ever needs two sessions' candidates at once. Keyed by the session
// uuid alone: a peer merge landing during the outing can leave the recap one candidate short.
let last: { key: string; shapes: Promise<RouteShape[]> } | null = null;

function read(locomotion: Locomotion, start: RoutePoint, beforeMs: number, exclude: string) {
  if (last?.key === exclude) return last.shapes;
  const entry: { key: string; shapes: Promise<RouteShape[]> } = {
    key: exclude,
    shapes: routeCandidates(locomotion, start, new Date(beforeMs), exclude).catch((e: unknown) => {
      // A failed read is not remembered: the next screen (or the recap) asks again.
      if (last === entry) last = null;
      reportError("routeGhost.candidates", e);
      return [];
    }),
  };
  last = entry;
  return entry.shapes;
}

/**
 * The past outings that started where this one did, read once per outing. Null while nothing is
 * wanted (any argument null) or the read is on its way; then the shapes, maybe none.
 */
export function useRouteCandidates(
  locomotion: Locomotion | null,
  start: RoutePoint | null,
  beforeMs: number | null,
  exclude: string | null,
): RouteShape[] | null {
  const [got, setGot] = useState<{ key: string; shapes: RouteShape[] } | null>(null);
  useEffect(() => {
    if (locomotion === null || start === null || beforeMs === null || exclude === null) return;
    let cancelled = false;
    read(locomotion, start, beforeMs, exclude).then((shapes) => {
      if (!cancelled) setGot({ key: exclude, shapes });
    });
    return () => {
      cancelled = true;
    };
  }, [locomotion, start, beforeMs, exclude]);
  return exclude !== null && got?.key === exclude ? got.shapes : null;
}
