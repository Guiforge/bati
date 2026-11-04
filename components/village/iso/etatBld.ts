// The capture states of the buildings track (docs/designs/village-buildings/PROMPT.md 9.5), read
// from the dev link bati://dev-iso: "building X at rank N", an upgrade as (own rank, base rank),
// the first week. Dev only: app/dev-iso.tsx is the sole reader and
// it already sends the hero home outside a dev or .perf build (constants/isoPoc.ts).
//
//   bld=<code>&rang=<1..ceiling>            the building alone at that rank
//   &base=<rank>                            an upgrade's base building rank (rule B), (rang, base)
//   &semaine=1&palier=<1..3>                the village of that tier, every building at rank `rang`
// Idle loops need no parameter: a link without fige=1, recorded for 10 s (video in the capture spec).

import { createContext } from "react";
import type { BuildingData } from "@/constants/buildingData";
import { buildingCeiling } from "@/constants/buildingLevels";
import { type BuildingCode, buildingCodes, buildingDefinitions } from "@/db/schema";
import type { VillageTier } from "@/db/village";

export type EtatBld = {
  code: BuildingCode;
  rang: number;
  /** The base building's rank, for an upgrade under rule B. */
  base?: number;
  /** Tier of the island: 12 for a lone building (the same frame for all), 1 to 3 for the first week. */
  palier: VillageTier;
  semaine: boolean;
  /**
   * The engine's data for this building, put there by BatimentSeul (never by a link) while the engine
   * flag is on: the map's Maquette sends exactly this building through the engine.
   */
  donnees?: BuildingData;
};

/**
 * The hook point of the shared engine (branch bld-engine): its show and beat read the state here,
 * `show` says which of the two to play, `base` which look an upgrade wears. Null outside a capture.
 */
export const EtatBldContext = createContext<EtatBld | null>(null);

type Params = Record<"bld" | "rang" | "base" | "palier" | "semaine", string | undefined>;

const entier = (v: string | undefined) =>
  v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined;

/** The state a link names, or null when it has no valid `bld` or `rang` (the screen then opens as before). */
export function etatBldDe(p: Partial<Params>): EtatBld | null {
  const code = buildingCodes.find((c) => c === p.bld);
  const rang = entier(p.rang);
  if (!code || rang === undefined) return null;
  const plafond = buildingCeiling({ tier: buildingDefinitions[code].tier, code });
  if (rang < 1 || rang > plafond) return null;
  const base = entier(p.base);
  const semaine = p.semaine === "1";
  const palier = semaine ? Math.min(3, Math.max(1, entier(p.palier) ?? 1)) : 12;
  return {
    code,
    rang,
    base: base !== undefined && base >= 1 && base <= 10 ? base : undefined,
    palier: palier as VillageTier,
    semaine,
  };
}

/**
 * The ranks the village tab draws (IsoVillage): each building's claimed rank and, for an upgrade,
 * the base rank the hero has claimed (rule B). Null outside the tab. A painted building reads its
 * rank here, so nothing rises without a tap: both numbers are the claimed ones, never the live ones.
 */
export const RangsBldContext = createContext<{
  rangs: ReadonlyMap<BuildingCode, number>;
  bases: Readonly<Partial<Record<BuildingCode, number>>>;
} | null>(null);

/** The engine state of a building standing at a rank: what the tab gives a painted building. */
export const etatDeRang = (
  code: BuildingCode,
  rang: number,
  base: number,
  donnees: BuildingData,
): EtatBld => ({ code, rang, base, palier: 12, semaine: false, donnees });
