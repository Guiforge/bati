// The small lives of the map, pure side (drawn and moved by petitsDetails.tsx): a flight of crows,
// fireflies, a rat. Everything is a function of the ambient clock `c` and of the wave start
// (horloge.ts `Depart`), with a seed per wave (no pure chance): same wave, same flight. A gesture
// lasts one cycle and starts and ends on a cycle boundary, hidden (opacity 0): the clock rests on
// a boundary outside a wave, with reduced motion and unfocused, so nothing is ever caught mid-way.

import { createContext } from "react";
import { CYCLE_MS, type Depart } from "./horloge";
import { type Case, lieux } from "./isoLayout";
import {
  BETES_PAR_VAGUE,
  type Bete,
  hasard as hasardGraine,
  positionA,
  rareLe,
  type Segment,
  sensEcranA,
} from "./marcheurs";
import type { Emprise } from "./profondeur";
import { type Etape, graineVie, planVie, TOTAL_MS } from "./vieAnimaux";

export const GRAINE_VIVANT = 20261030;

/** A number in [0, 1) from the seed, the wave `n` and a purpose `k`: same input, same number. */
export function hasard(n: number, k: number): number {
  "worklet";
  let x = Math.imul(
    GRAINE_VIVANT ^ Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca6b),
    0x27d4eb2d,
  );
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

/** Cycle index since the wave began, and the share of that cycle gone. */
function dansLaVague(c: number, d: Depart): { k: number; u: number } {
  "worklet";
  const t = (c - d.c0) / CYCLE_MS;
  const k = Math.floor(t);
  return { k, u: t - k };
}

/** The cycle (0 to 2, so inside the shortest wave of 3) in which wave `n` plays a gesture of kind `k`. */
const cycleDe = (n: number, k: number): number => {
  "worklet";
  return Math.floor(hasard(n, k) * 3);
};

// --- Crows -------------------------------------------------------------------------------------

/**
 * A crow seen from below, wings in a gull V, its body at (cx, cy), `s` its scale; `b` squashes it
 * vertically about its body (the wing beat, drawn in the path so a flock stays one Svg).
 */
export function corbeau(cx: number, cy: number, s: number, b = 1): string {
  "worklet";
  const w = 10 * s;
  const h = 5 * s;
  const q = (x: number, y: number) => `${x.toFixed(1)} ${(cy + (y - cy) * b).toFixed(1)}`;
  return (
    `M${q(cx - w, cy - h)}Q${q(cx - w / 2, cy - 1.3 * h)} ${q(cx, cy)}` +
    `Q${q(cx + w / 2, cy - 1.3 * h)} ${q(cx + w, cy - h)}` +
    `Q${q(cx + w / 2, cy - 0.5 * h)} ${q(cx, cy + 0.45 * h)}` +
    `Q${q(cx - w / 2, cy - 0.5 * h)} ${q(cx - w, cy - h)}Z`
  );
}

/** A loose V of four, the leader ahead (drawing box coordinates, then a scale); the flock is mirrored by `sens`. */
export const CORBEAUX = [
  [46, 16, 1],
  [25, 25, 0.9],
  [67, 26, 0.85],
  [12, 38, 0.7],
] as const;

/** The flock's drawing box, dp. */
// AUDIT-DA 33: drawn in a 92 x 44 box, shown 1.5 times larger (the Svg's viewBox does the scaling).
export const VOL_DESSIN_L = 92;
export const VOL_DESSIN_H = 44;
// H2-05: readable at the opening frame; anim-36: then 30 % smaller, they were bigger than the houses.
export const VOL_ECHELLE = 0.95;
export const VOL_L = VOL_DESSIN_L * VOL_ECHELLE;
export const VOL_H = VOL_DESSIN_H * VOL_ECHELLE;
/** Wing beats while the flock crosses. */
const BATTEMENTS = 14;

export type Vol = {
  opacite: number;
  x: number;
  y: number;
  sens: 1 | -1;
  battement: number;
  /** The share of the crossing gone (0 at rest). */
  p: number;
};

/** A crow's wing beat at crossing share `p`: its own rate and phase, so the four never flap in step. */
export function battementCorbeau(p: number, i: number): number {
  "worklet";
  return 0.8 + 0.2 * Math.cos(2 * Math.PI * (BATTEMENTS + i) * p + i * 1.7);
}

/**
 * anim-24: a crow's own small rise and fall across the crossing, drawing units (amplitude, rate and
 * phase each), so the V never flies as one rigid block. Nothing at rest (p = 0).
 */
export function remousCorbeau(p: number, i: number): number {
  "worklet";
  return p === 0 ? 0 : (1.5 + 0.7 * i) * Math.sin(2 * Math.PI * (2 + 0.6 * i) * p + i * 2.1);
}

/**
 * The flock at clock `c` over a frame of `w` x `h` dp: one crossing per wave, in one cycle (which one,
 * which way and how high are the wave's seed), an arc up and down. `x`, `y` place the box's top
 * left; `battement` is a vertical scale that suggests the beat. Hidden and off screen at rest.
 */
export function volCorbeaux(c: number, d: Depart, w: number, h: number): Vol {
  "worklet";
  const { k, u } = dansLaVague(c, d);
  const sens = hasard(d.n, 2) < 0.5 ? 1 : -1;
  const actif = d.n > 0 && k === cycleDe(d.n, 1) && u > 0;
  const p = actif ? u : 0;
  // anim-36: over the village, not the same top band every time: each crossing draws its height in
  // the frame's middle (where the island is framed) and a slant, so two passes never retrace.
  const cy = h * (0.28 + 0.3 * hasard(d.n, 3));
  const y0 = cy - VOL_H / 2;
  const pente = (hasard(d.n, 7) - 0.5) * h * 0.24;
  const x = sens === 1 ? -VOL_L + p * (w + VOL_L) : w - p * (w + VOL_L);
  return {
    opacite: actif ? 1 : 0,
    x,
    y: y0 + pente * (p - 0.5) - h * 0.05 * Math.sin(Math.PI * p),
    sens,
    battement: battementCorbeau(p, 0),
    p,
  };
}

// --- Cloud shadows ---------------------------------------------------------------------------

/** One crossing of the map, ms of the clock (bible §5: 40 to 60 s). */
export const NUAGE_MS = 50000;
/**
 * The two shadows (OmbresNuages.tsx): the height of their path as a share of the map's, their
 * half-size in dp, and where in the crossing each stands at clock 0 (half a crossing apart).
 */
export const NUAGES = [
  { y: 0.36, rx: 300, ry: 120, decalage: 0.15 },
  { y: 0.62, rx: 230, ry: 95, decalage: 0.65 },
] as const;
/** The wind: the shadows go right and a little down the screen, the way the smoke leans. */
const NUAGE_PENTE = 0.12;

/**
 * Where shadow `i` stands at clock `c` over a map `largeur` dp wide: from a full patch off its left
 * edge to a full patch off its right one, then again (the jump back happens off the map).
 */
export function nuageA(c: number, i: number, largeur: number): { x: number; y: number } {
  "worklet";
  const n = NUAGES[i] ?? NUAGES[0];
  const v = (c / NUAGE_MS + n.decalage) % 1;
  const x = -2 * n.rx + v * (largeur + 4 * n.rx);
  return { x, y: (x - largeur / 2) * NUAGE_PENTE };
}

// --- Fireflies ---------------------------------------------------------------------------------

export const NOMBRE_LUCIOLES = 10;
/** The group's drift, half-width in dp: small, a firefly stays over its cell. */
export const DERIVE_LUCIOLES = 2;
/** The patch of ground they hover over, in cells: the canal (column 2) and the trees beside it. */
export const ZONE_LUCIOLES = lieux.lucioles;

/**
 * Where the fireflies hover, in grid units; fixed. Each sits on a cell the island shows (a few
 * seeded tries per firefly, none placed if all miss), so none floats over the void.
 */
export function lucioles(
  visible: readonly (readonly boolean[])[],
): { gx: number; gy: number; r: number }[] {
  const [x0, x1] = ZONE_LUCIOLES.gx;
  const [y0, y1] = ZONE_LUCIOLES.gy;
  return Array.from({ length: NOMBRE_LUCIOLES }, (_, i) => {
    for (let t = 0; t < 8; t++) {
      const gx = x0 + (x1 - x0) * hasard(100 + i, 3 * t);
      const gy = y0 + (y1 - y0) * hasard(100 + i, 3 * t + 1);
      if (visible[Math.floor(gy)]?.[Math.floor(gx)])
        return [{ gx, gy, r: 1.6 + 0.8 * hasard(100 + i, 3 * t + 2) }];
    }
    return [];
  }).flat();
}

/**
 * The group's glow at clock `c`: two soft beats a cycle, and a drift of a few dp. Zero opacity
 * and no offset on every cycle boundary (the rest pose: out).
 */
export function lueurLucioles(c: number): { opacite: number; dx: number; dy: number } {
  "worklet";
  const u = (c % CYCLE_MS) / CYCLE_MS;
  const s = Math.sin(2 * Math.PI * u);
  return {
    opacite: 0.9 * s * s,
    dx: DERIVE_LUCIOLES * Math.sin(2 * Math.PI * u),
    dy: (DERIVE_LUCIOLES / 2) * Math.sin(4 * Math.PI * u),
  };
}

// --- Rat ---------------------------------------------------------------------------------------

/**
 * The rat's run: along the path of row 10, in front of the farm's wall, from gx 3.5 to 6.5, one
 * row, so the rat is one footprint of 4 cells by 1 and its depth rank is computed once for the
 * whole run (IsoCarteDemo.tsx). A building in front of that row (the barn, the dummy) hides it.
 */
export const RAT = lieux.rat;
/** The whole cells under the run: from the floor of gx0 to the ceiling of gx1. */
const GX_RAT = Array.from(
  { length: Math.ceil(RAT.gx1) - Math.floor(RAT.gx0) },
  (_, i) => Math.floor(RAT.gx0) + i,
);
export const EMPRISE_RAT: Emprise = {
  coin: [Math.floor(RAT.gx0), RAT.gy],
  emprise: [GX_RAT.length, 1],
};
/** The cells of the run, to check that the island shows them all. */
export const CASES_RAT: readonly Case[] = GX_RAT.map((gx) => [gx, RAT.gy] as const);
/** Share of waves that see a rat. */
export const CHANCE_RAT = 0.5;

/**
 * The rat's wave (T31): its plan (vieAnimaux.ts) drives the run and the stops of its one drawing.
 * Null in the waves that see no rat or where `marchent` animals already walk (the cap); `force` (dev-iso) makes it run in every one. The run is the
 * plan's walk step, along the row, one way, the way drawn by the wave's seed.
 */
export function planifierRat(
  jour: number,
  numero: number,
  marchent: number,
  rang = 0,
  force = false,
): Bete | null {
  // The rat moves too: with the cap of beasts walking reached it stays in its hole.
  if (marchent >= BETES_PAR_VAGUE) return null;
  const h = hasardGraine(`${jour}:${numero}:rat`);
  const voit = h() < CHANCE_RAT;
  const sens = h() < 0.5 ? 1 : -1;
  if (!force && !voit) return null;
  const vie = planVie("rat", hasardGraine(graineVie(jour, numero, "rat")), {
    marche: true,
    rare: rareLe(jour, "rat", rang),
  });
  const marche = vie.find((e) => e.marche);
  if (!marche) return null;
  const de: Case = [sens === 1 ? RAT.gx0 : RAT.gx1, RAT.gy];
  const vers: Case = [sens === 1 ? RAT.gx1 : RAT.gx0, RAT.gy];
  return {
    nom: "rat",
    vie,
    repos: 0,
    segments: [
      { etat: "agir", de, vers: de, t0: 0, duree: marche.t0 },
      { etat: "marcher", de, vers, t0: marche.t0, duree: marche.duree },
      { etat: "agir", de: vers, vers, t0: marche.t0 + marche.duree, duree: TOTAL_MS },
    ],
  };
}

/**
 * The rat's place along its row (`g`, in gx), its facing and opacity `t` ms into the wave: seen in
 * every step but the one where it hides, standing at the run's start before it and at its end after.
 */
export function courseRat(
  t: number,
  vie: readonly Etape[],
  segments: readonly Segment[],
): { opacite: number; g: number; sens: 1 | -1 } {
  "worklet";
  let cache = true;
  for (let i = 0; i < vie.length; i++) {
    const e = vie[i];
    if (e && t >= e.t0 && t < e.t0 + e.duree) cache = e.id === "cache";
  }
  return {
    opacite: cache ? 0 : 1,
    g: positionA(segments, t).x - 0.5,
    sens: sensEcranA(segments, t),
  };
}

/** Whether the island shows every cell of the rat's run (otherwise it is not mounted). */
export const ratMontre = (visible: readonly (readonly boolean[])[]): boolean =>
  CASES_RAT.every(([gx, gy]) => visible[gy]?.[gx] === true);

/** Dev only (app/dev-iso.tsx): the rat runs in every wave, in its first cycle. Off in the tab. */
export const RatForceContext = createContext(false);
