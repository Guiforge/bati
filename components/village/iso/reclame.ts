// Which buildings are ready to evolve on the map (L6-T13, VI-29), pure. Every one wears a fixed
// hammer above it (a drawing, no node, at rest and with reduced motion). The building also glows and
// shakes during a wave, one animated node each, at most NOEUDS_RECLAMABLES; the others, and all of
// them with reduced motion, keep the hammer alone.

import { createContext } from "react";
import type { BuildingCode } from "@/db/schema";

/** Animated nodes the signal adds to a wave: the map's worst case is 57 of 64 since T23 (iso-ciel.test); the banners' glints give way to them. */
export const NOEUDS_RECLAMABLES = 4;

export type Reclamables = { animes: ReadonlySet<BuildingCode>; tous: ReadonlySet<BuildingCode> };

/** The map's signal state, set by IsoVillage; null (the default) draws nothing. */
export const ReclamablesContext = createContext<Reclamables | null>(null);

/** All the ready codes get a hammer; the first few (in the order given) also glow and shake in a wave. */
export function repartirReclamables(codes: readonly BuildingCode[], reduit: boolean): Reclamables {
  return {
    animes: new Set(reduit ? [] : codes.slice(0, NOEUDS_RECLAMABLES)),
    tous: new Set(codes),
  };
}
