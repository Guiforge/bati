// The capture states of the buildings track (docs/designs/village-buildings/PROMPT.md 9.5), read
// from the dev link bati://dev-iso: "building X at rank N", an upgrade as (own rank, base rank),
// the upgrade show, the rank beat, the first week. Dev only: app/dev-iso.tsx is the sole reader and
// it already sends the hero home outside a dev or .perf build (constants/isoPoc.ts).
//
//   bld=<code>&rang=<1..ceiling>            the building alone at that rank
//   &base=<rank>[&avantbase=<rank>]         an upgrade's base building rank (rule B), (rang, base)
//   &show=stade|rang&avant=<rank>           the show of the tap, from rank `avant` (default rang - 1)
//   &semaine=1&palier=<1..3>                the village of that tier, every building at rank `rang`
// Idle loops need no parameter: a link without fige=1, recorded for 10 s (video in the capture spec).

import { createContext } from "react";
import { buildingCeiling } from "@/constants/buildingLevels";
import { type BuildingCode, buildingCodes, buildingDefinitions } from "@/db/schema";
import type { VillageTier } from "@/db/village";

/** `stade`: the full stage-change show; `rang`: the short beat of a rank inside a stage. */
export type ShowBld = "stade" | "rang";

export type EtatBld = {
  code: BuildingCode;
  rang: number;
  /** The base building's rank, for an upgrade under rule B. */
  base?: number;
  /** The rank the show rises from. */
  avant: number;
  /** With `base`: the base rank the show rises from (an upgrade's look follows its base, rule B). */
  avantBase?: number;
  show?: ShowBld;
  /** Tier of the island: 12 for a lone building (the same frame for all), 1 to 3 for the first week. */
  palier: VillageTier;
  semaine: boolean;
  /** `moteur=1`: the buildings engine (BatimentMoteur) is on for this link only. */
  moteur?: boolean;
};

/**
 * The hook point of the shared engine (branch bld-engine): its show and beat read the state here,
 * `show` says which of the two to play, `base` which look an upgrade wears. Null outside a capture.
 */
export const EtatBldContext = createContext<EtatBld | null>(null);

type Params = Record<
  "bld" | "rang" | "base" | "avant" | "avantbase" | "show" | "palier" | "semaine" | "moteur",
  string | undefined
>;

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
  const avantBase = entier(p.avantbase);
  const semaine = p.semaine === "1";
  const palier = semaine ? Math.min(3, Math.max(1, entier(p.palier) ?? 1)) : 12;
  return {
    code,
    rang,
    base: base !== undefined && base >= 1 && base <= 10 ? base : undefined,
    avantBase: avantBase !== undefined && avantBase >= 0 && avantBase <= 10 ? avantBase : undefined,
    // A base-driven show leaves the upgrade's own rank where it is.
    avant: Math.min(
      avantBase === undefined ? rang - 1 : rang,
      Math.max(0, entier(p.avant) ?? rang - 1),
    ),
    show: p.show === "stade" || p.show === "rang" ? p.show : undefined,
    palier: palier as VillageTier,
    semaine,
    moteur: p.moteur === "1" ? true : undefined,
  };
}
