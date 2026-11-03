// The two moments of a building's growth, pure (PROMPT.md §6, §9.4). Both play on the player's tap
// and never without one; the engine only builds the plan, the parent decides when.
//   stade: anticipation, scaffold with the build gag, dust, reveal with a bounce, the keeper
//          reacts, the clan mark takes its next form.
//   rang:  dust, the new piece pops in with a bounce, the keeper reacts.
// The swap itself (the new rank's pieces, the next stage's painting, the scaffold leaving) happens
// at the dust's peak, when the cloud hides it. Reduced motion has no steps at all: the plan lands
// on the final image and the moment stays (the new piece, the keeper's reaction and the new mark
// are all there at once). Update day (several ranks at once): one plan, straight to the new rank,
// no step in between.

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
  /** The base building's rank before and after, for an upgrade under rule B (0 for the others). */
  deBase: number;
  versBase: number;
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
  // The first rank is a building going up, not a rank inside a stage.
  if (deRang <= 0 && versRang > 0) return "stade";
  const avant = buildingStageFor(code, deRang, deBase, rule);
  const apres = buildingStageFor(code, versRang, versBase, rule);
  // A base that rose inside a stage (5 to 6) is a beat as well: the upgrade gets a piece.
  return avant !== apres ? "stade" : "rang";
}

export function planSpectacle(
  genre: Genre,
  deRang: number,
  versRang: number,
  reduit: boolean,
  { deBase = 0, versBase = 0 }: { deBase?: number; versBase?: number } = {},
): PlanSpectacle {
  let t = 0;
  const etapes = reduit
    ? []
    : ETAPES[genre].map(([etape, ms]) => {
        const e = { etape, debut: t, fin: t + ms };
        t += ms;
        return e;
      });
  return { genre, deRang, versRang, deBase, versBase, etapes, total: t, reduit };
}

const debutDe = (plan: PlanSpectacle, etape: Etape) =>
  plan.etapes.find((e) => e.etape === etape)?.debut;

/** The dust's peak, ms: when the swap happens behind the cloud. Undefined with reduced motion. */
export function picPoussiere(plan: PlanSpectacle): number | undefined {
  const e = plan.etapes.find((x) => x.etape === "poussiere");
  return e ? (e.debut + e.fin) / 2 : undefined;
}

/** When the body takes the new rank, and when the mark takes its new form (undefined: at once). */
function bascules(plan: PlanSpectacle) {
  const corps = picPoussiere(plan);
  return { corps, marque: debutDe(plan, "marque") ?? corps };
}

const aPartirDe = (t: number, quand: number | undefined) => quand === undefined || t >= quand;

/**
 * The ranks the building and its clan mark wear at `t`. The body (pieces, teasers, gag) takes the
 * new rank at the dust's peak; the mark one step later, in a stade moment. Past the end, and with
 * reduced motion, both are on the new rank.
 */
export function rangsA(plan: PlanSpectacle, t: number): { corps: number; marque: number } {
  const q = bascules(plan);
  const sur = (quand: number | undefined) => (aPartirDe(t, quand) ? plan.versRang : plan.deRang);
  return { corps: sur(q.corps), marque: sur(q.marque) };
}

/** The same switch for the base rank an upgrade's look follows (rule B): one source of "when". */
export function basesA(plan: PlanSpectacle, t: number): { corps: number; marque: number } {
  const q = bascules(plan);
  const sur = (quand: number | undefined) => (aPartirDe(t, quand) ? plan.versBase : plan.deBase);
  return { corps: sur(q.corps), marque: sur(q.marque) };
}

/** True while the scaffold stands: from its step to the dust's peak, which hides it leaving. */
export function chantierA(plan: PlanSpectacle, t: number): boolean {
  const debut = debutDe(plan, "echafaudage");
  const pic = picPoussiere(plan);
  return debut !== undefined && pic !== undefined && t >= debut && t < pic;
}

/** The reveal's bounce, u from 0 to 1: leaves 1, rises to 8 % too big at 30 %, then settles on 1. */
export function rebond(u: number): number {
  "worklet";
  if (u >= 1) return 1;
  if (u < 0.3) return 1 + 0.08 * (Math.max(0, u) / 0.3);
  return 1 + 0.08 * (1 - (u - 0.3) / 0.7);
}

/**
 * The body's scale at `t`: squashes a little in the anticipation (back to 1 at its end), bounces
 * at the reveal, else 1. Never below 0.96: the building is on screen at every frame (scale 0 is
 * how the map hides a stage).
 */
export function echelleCorps(plan: PlanSpectacle, t: number): number {
  "worklet";
  if (plan.reduit) return 1;
  for (const e of plan.etapes) {
    if (t < e.debut || t >= e.fin) continue;
    const u = (t - e.debut) / (e.fin - e.debut);
    if (e.etape === "anticipation") return 1 - 0.04 * Math.sin(u * Math.PI);
    if (e.etape === "revelation") return rebond(u);
  }
  return 1;
}

/** How long the new piece takes to pop in, after the swap, ms. */
const POP_MS = 450;

/**
 * The scale of the group of pieces the rise adds, from the swap on: out of nothing, a little too
 * big on the way, settling on 1. Before the swap the group does not exist yet; with reduced
 * motion it is there at once.
 */
export function echellePop(plan: PlanSpectacle, t: number): number {
  "worklet";
  const pic = plan.etapes.find((e) => e.etape === "poussiere");
  if (plan.reduit || !pic) return 1;
  const u = (t - (pic.debut + pic.fin) / 2) / POP_MS;
  if (u >= 1) return 1;
  if (u <= 0) return 0;
  return 1 - (1 - u) ** 3 + 0.1 * Math.sin(u * Math.PI);
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

/** A light's breath on the map's clock `c` (ms), two a 5 s cycle so it rests at every boundary: scale 0.85 to 1.15. */
export function souffleLueur(c: number): number {
  "worklet";
  const u = (c % 2500) / 2500;
  return 0.85 + 0.3 * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
}
