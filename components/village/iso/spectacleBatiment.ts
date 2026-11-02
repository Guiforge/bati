// The two moments of a building's growth, pure (PROMPT.md §6, §9.4). Both play on the player's tap
// and never without one; the engine only builds the plan, the parent decides when.
//   stade: anticipation, scaffold with the build gag, dust, reveal with a bounce, the keeper
//          reacts, the clan mark takes its next form.
//   rang:  dust, the new piece pops in with a bounce, the keeper reacts.
// Reduced motion has no steps at all: the plan lands on the final image and the moment stays
// (the new piece, the keeper's reaction and the new mark are all there at once).
// Update day (several ranks at once): one plan, straight to the new rank, no step in between.

import { buildingStageFor, type StageRule } from "@/constants/buildingStages";
import type { BuildingCode } from "@/db/schema";

export type Genre = "stade" | "rang";
export type Etape =
  | "anticipation"
  | "echafaudage"
  | "poussiere"
  | "revelation"
  | "gardien"
  | "marque";

/** The steps of each moment, in order, with their length in ms. */
export const ETAPES: Record<Genre, readonly (readonly [Etape, number])[]> = {
  stade: [
    ["anticipation", 350],
    ["echafaudage", 900],
    ["poussiere", 400],
    ["revelation", 600],
    ["gardien", 450],
    ["marque", 500],
  ],
  rang: [
    ["poussiere", 350],
    ["revelation", 500],
    ["gardien", 450],
  ],
};

export type PlanSpectacle = {
  genre: Genre;
  deRang: number;
  versRang: number;
  etapes: readonly { etape: Etape; debut: number; fin: number }[];
  total: number;
  reduit: boolean;
};

/** Which moment a rise plays, or null when nothing rose (the building never plays backwards). */
export function genreDe(
  code: BuildingCode,
  deRang: number,
  versRang: number,
  { deBase = 0, versBase = 0, rule }: { deBase?: number; versBase?: number; rule?: StageRule } = {},
): Genre | null {
  if (versRang < deRang || (versRang === deRang && versBase <= deBase)) return null;
  const avant = buildingStageFor(code, deRang, deBase, rule);
  const apres = buildingStageFor(code, versRang, versBase, rule);
  if (avant !== apres) return "stade";
  return versRang > deRang ? "rang" : null;
}

export function planSpectacle(
  genre: Genre,
  deRang: number,
  versRang: number,
  reduit: boolean,
): PlanSpectacle {
  let t = 0;
  const etapes = reduit
    ? []
    : ETAPES[genre].map(([etape, ms]) => {
        const e = { etape, debut: t, fin: t + ms };
        t += ms;
        return e;
      });
  return { genre, deRang, versRang, etapes, total: t, reduit };
}

/** The step running at `t` ms; null before the start, after the end, and with reduced motion. */
export function etapeA(plan: PlanSpectacle, t: number): Etape | null {
  return plan.etapes.find((e) => t >= e.debut && t < e.fin)?.etape ?? null;
}

const debutDe = (plan: PlanSpectacle, etape: Etape) =>
  plan.etapes.find((e) => e.etape === etape)?.debut;

/**
 * The ranks the building and its clan mark wear at `t`. The body (pieces, teasers, gag) takes the
 * new rank when the reveal starts; the mark one step later, in a stade moment. Past the end, and
 * with reduced motion, both are on the new rank.
 */
export function rangsA(plan: PlanSpectacle, t: number): { corps: number; marque: number } {
  const revele = debutDe(plan, "revelation");
  const marque = debutDe(plan, "marque") ?? revele;
  const sur = (debut: number | undefined) =>
    debut === undefined || t >= debut ? plan.versRang : plan.deRang;
  return { corps: sur(revele), marque: sur(marque) };
}

/** The reveal's bounce, u from 0 to 1: rises to 8 % too big at 30 %, then settles on 1. */
export function rebond(u: number): number {
  "worklet";
  if (u >= 1) return 1;
  if (u < 0.3) return 0.94 + 0.14 * (Math.max(0, u) / 0.3);
  return 1 + 0.08 * (1 - (u - 0.3) / 0.7);
}

/**
 * The body's scale at `t`: squashes a little in the anticipation, bounces at the reveal, else 1.
 * Never below 0.9: the building is on screen at every frame (scale 0 is how the map hides a stage).
 */
export function echelleCorps(plan: PlanSpectacle, t: number): number {
  "worklet";
  if (plan.reduit) return 1;
  for (const e of plan.etapes) {
    if (t < e.debut || t >= e.fin) continue;
    const u = (t - e.debut) / (e.fin - e.debut);
    if (e.etape === "anticipation") return 1 - 0.04 * u;
    if (e.etape === "revelation") return rebond(u);
  }
  return 1;
}

/** The keeper's hop at `t`, dp upwards: a small jump during the `gardien` step only. */
export function sautGardien(plan: PlanSpectacle, t: number): number {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "gardien");
  if (!e || t < e.debut || t >= e.fin) return 0;
  const u = (t - e.debut) / (e.fin - e.debut);
  return 6 * Math.sin(u * Math.PI);
}

/** The dust's swell at `t`, 0 to 1 and back to 0, during the `poussiere` step only. */
export function gonflePoussiere(plan: PlanSpectacle, t: number): number {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "poussiere");
  if (!e || t < e.debut || t >= e.fin) return 0;
  return Math.sin(((t - e.debut) / (e.fin - e.debut)) * Math.PI);
}
