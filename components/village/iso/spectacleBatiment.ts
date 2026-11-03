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

/**
 * The steps of each moment: where each starts (ms) and how long it lasts. They overlap on purpose,
 * nothing waits for the previous one to be over: the scaffold rises while the anticipation lets go,
 * the dust starts before the scaffold has finished and its peak (the swap) is when the reveal's
 * bounce starts, the keeper hops at 60 % of the reveal, the mark takes its form last.
 */
export const ETAPES: Record<Genre, readonly (readonly [Etape, debut: number, ms: number])[]> = {
  stade: [
    ["anticipation", 0, 800],
    ["echafaudage", 350, 900],
    ["poussiere", 1150, 500],
    ["revelation", 1400, 600],
    ["gardien", 1760, 700],
    ["marque", 1900, 500],
  ],
  rang: [
    ["poussiere", 0, 350],
    ["revelation", 175, 500],
    ["gardien", 475, 700],
  ],
};

/** The squash of the anticipation lasts this long; the rest of its step is the release. */
const SQUASH_MS = 350;

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
  const etapes = reduit
    ? []
    : ETAPES[genre].map(([etape, debut, ms]) => ({ etape, debut, fin: debut + ms }));
  const total = Math.max(0, ...etapes.map((e) => e.fin));
  return { genre, deRang, versRang, deBase, versBase, etapes, total, reduit };
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

/** A curve through `pts` ([u, value], ascending, u from 0 to 1), eased with a cosine between neighbours. */
function croise(u: number, pts: readonly (readonly [number, number])[]): number {
  "worklet";
  let prev = pts[0];
  for (const next of pts) {
    if (!prev) break;
    if (u <= next[0]) {
      const span = next[0] - prev[0];
      const k = span <= 0 ? 1 : Math.min(1, Math.max(0, (u - prev[0]) / span));
      return prev[1] + (next[1] - prev[1]) * (0.5 - 0.5 * Math.cos(Math.PI * k));
    }
    prev = next;
  }
  return prev ? prev[1] : 1;
}

/** The reveal's bounce, u from 0 to 1: leaves 1, 8 % too big at 30 %, 2 % too small at 65 %, back on 1. */
export function rebond(u: number): number {
  "worklet";
  return croise(u, [
    [0, 1],
    [0.3, 1.08],
    [0.65, 0.98],
    [1, 1],
  ]);
}

/**
 * The body's scale at `t`, [x, y]: squashes in the anticipation (Y 0.90, X 1.04), lets go to 1.03
 * in Y over 450 ms and settles, bounces from the swap (the reveal starts there), else 1. Never below
 * 0.90: the building is on screen at every frame (scale 0 is how the map hides a stage).
 */
export function echelleCorps(plan: PlanSpectacle, t: number): readonly [x: number, y: number] {
  "worklet";
  if (plan.reduit) return [1, 1];
  for (const e of plan.etapes) {
    if (t < e.debut || t >= e.fin) continue;
    if (e.etape === "anticipation") {
      const dt = t - e.debut;
      if (dt < SQUASH_MS) {
        const k = 0.5 - 0.5 * Math.cos(Math.PI * (dt / SQUASH_MS));
        return [1 + 0.04 * k, 1 - 0.1 * k];
      }
      const u = (dt - SQUASH_MS) / (e.fin - e.debut - SQUASH_MS);
      return [
        croise(u, [
          [0, 1.04],
          [0.4, 0.99],
          [1, 1],
        ]),
        croise(u, [
          [0, 0.9],
          [0.4, 1.03],
          [1, 1],
        ]),
      ];
    }
    if (e.etape === "revelation") {
      const r = rebond((t - e.debut) / (e.fin - e.debut));
      return [r, r];
    }
  }
  return [1, 1];
}

/** How long a new piece takes to pop in after the swap, ms, and how late it starts behind the body. */
const POP_MS = 450;
const POP_DECALE_MS = 80;

/**
 * The scale of one piece the rise adds, from just after the swap on: out of nothing, a little too
 * big on the way, settling on 1. Before the swap the piece does not exist yet; with reduced
 * motion it is there at once.
 */
export function echellePop(plan: PlanSpectacle, t: number): number {
  "worklet";
  const pic = plan.etapes.find((e) => e.etape === "poussiere");
  if (plan.reduit || !pic) return 1;
  const u = (t - (pic.debut + pic.fin) / 2 - POP_DECALE_MS) / POP_MS;
  if (u >= 1) return 1;
  if (u <= 0) return 0;
  return 1 - (1 - u) ** 3 + 0.1 * Math.sin(u * Math.PI);
}

/** The keeper's hops at `t`, dp upwards, during the `gardien` step only: 12 dp, then 6 dp. */
export function sautGardien(plan: PlanSpectacle, t: number): number {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "gardien");
  if (!e || t < e.debut || t >= e.fin) return 0;
  const u = (t - e.debut) / (e.fin - e.debut);
  return u < 0.6 ? 12 * Math.sin((Math.PI * u) / 0.6) : 6 * Math.sin((Math.PI * (u - 0.6)) / 0.4);
}

/** Each dust puff: its centre as shares of the body's rectangle, and its diameter as a share of its width. */
export const BOUFFEES: readonly (readonly [x: number, y: number, d: number])[] = [
  [0.3, 0.95, 0.95],
  [0.7, 0.95, 0.95],
  [0.5, 0.8, 1],
  [0.2, 0.62, 0.9],
  [0.8, 0.62, 0.9],
  [0.5, 0.5, 1],
  [0.5, 0.3, 0.85],
];

/**
 * One dust puff at `t` (`i` of `BOUFFEES`): it starts a little after the one before, swells to
 * full size and to a nearly opaque cloud by the swap (every puff is up by then), then keeps
 * swelling while it fades out in opacity. It never shrinks back, so it never goes through scale 0.
 */
export function bouffee(
  plan: PlanSpectacle,
  t: number,
  i: number,
): { echelle: number; opacite: number } {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "poussiere");
  if (!e || t < e.debut || t >= e.fin) return { echelle: 0.4, opacite: 0 };
  const pic = (e.debut + e.fin) / 2;
  const depart = e.debut + (i / BOUFFEES.length) * 0.4 * (pic - e.debut);
  if (t < pic) {
    const k = Math.min(1, Math.max(0, (t - depart) / (pic - depart)));
    return { echelle: 0.4 + 0.6 * (1 - (1 - k) ** 2), opacite: 0.85 * Math.min(1, k * 2) };
  }
  const k = (t - pic) / (e.fin - pic);
  return { echelle: 1 + 0.2 * k, opacite: 0.85 * (1 - k) ** 2 };
}

/** The scaffold's rise from the foot, 150 ms with an overshoot: its scaleY at `t` (1 once up). */
export function monteEchafaudage(plan: PlanSpectacle, t: number): number {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "echafaudage");
  if (!e || t >= e.debut + 150) return 1;
  return croise(Math.max(0, (t - e.debut) / 150), [
    [0, 0],
    [0.65, 1.1],
    [1, 1],
  ]);
}

/** The scaffold's slight sway once it stands, degrees. */
export function balancement(plan: PlanSpectacle, t: number): number {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "echafaudage");
  if (!e || t < e.debut + 150) return 0;
  return 1.2 * Math.sin((t - e.debut) / 140);
}

/** The build gag's fidgeting, in a loop while the scaffold stands: a tilt in degrees and a hop in dp. */
export function gesteGag(plan: PlanSpectacle, t: number): { rot: number; saut: number } {
  "worklet";
  const e = plan.etapes.find((x) => x.etape === "echafaudage");
  if (!e) return { rot: 0, saut: 0 };
  const dt = Math.max(0, t - e.debut);
  return { rot: 12 * Math.sin(dt / 90), saut: 3 * Math.abs(Math.sin(dt / 130)) };
}

/** A light's breath on the map's clock `c` (ms), `cycles` (1 to 3) a 5 s cycle so it rests at every boundary: scale 0.85 to 1.15. */
export function souffleLueur(c: number, cycles = 2): number {
  "worklet";
  const long = 5000 / cycles;
  const u = (c % long) / long;
  return 0.85 + 0.3 * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
}
