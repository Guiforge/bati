// The night lights of the buildings (L5-T07b), pure: which two buildings show lit windows during a
// wave, when a door glows because a villager stands at it, and how both move on the ambient clock.
// VeillesDessinees.tsx draws. Window groups and door glows are one animated node per building
// (never one per window), at most NOEUDS_FENETRES + NOEUDS_PORTES for the map; both are 0 at every
// cycle boundary and outside a wave, so a map at rest shows no light.

import { createContext } from "react";
import type { BuildingCode } from "@/db/schema";
import type { AccrochesStade } from "./feux";
import { CYCLE_MS } from "./horloge";
import { type Carte, casesDuLieu, type Segment } from "./marcheurs";

/** Buildings with blinking windows in a wave, and with a door glow: the map's added nodes. */
export const NOEUDS_FENETRES = 2;
export const NOEUDS_PORTES = 2;

/** What a wave lights: the clock value it starts at, the buildings, the door visits [from, to] ms. */
export type Veille = {
  c0: number;
  fenetres: ReadonlySet<BuildingCode>;
  portes: Readonly<Partial<Record<BuildingCode, readonly (readonly [number, number])[]>>>;
  /** The buildings that play an effect (effets.ts), set where the plan is made. */
  effets?: ReadonlySet<BuildingCode>;
};

/** The wave's lights, set where the walkers' plan lives (IsoCarteDemo `Objets`). */
export const VeilleContext = createContext<Veille | null>(null);

import { graine } from "./graine";

export { graine };

/** A lit door glows this long before a visit starts and after it ends, ms. */
const AVANT_MS = 300;
const APRES_MS = 700;

/** The door visits of the first NOEUDS_PORTES buildings a walker stands at: [from, to] ms of the wave. */
function visitesDePortes(
  carte: Carte,
  parcours: readonly (readonly Segment[])[],
  aPorte: (code: BuildingCode) => boolean,
): Veille["portes"] {
  const devant = carte.montres
    .filter(aPorte)
    .map((code) => [code, new Set(casesDuLieu(code, carte).map(([x, y]) => `${x},${y}`))] as const);
  const visites = parcours
    .flat()
    .filter((s) => s.etat === "agir")
    .flatMap((s) =>
      devant
        .filter(([, cases]) => cases.has(`${s.de[0]},${s.de[1]}`))
        .map(([code]) => [code, [s.t0, s.t0 + s.duree]] as const),
    );
  const codes = [...new Set(visites.map(([code]) => code))].slice(0, NOEUDS_PORTES);
  const portes: Partial<Record<BuildingCode, [number, number][]>> = {};
  for (const code of codes)
    portes[code] = visites.filter(([c]) => c === code).map(([, v]) => [...v]);
  return portes;
}

/**
 * The wave's lights: windows on the NOEUDS_FENETRES buildings (among those that have some) with the
 * lowest hash of the day, the wave number and their code (as the walkers' picks); a door glow on the first NOEUDS_PORTES buildings
 * (with a door) a walker stands at, for the time it acts there.
 */
export function veilleDeVague(
  c0: number,
  jour: number,
  numero: number,
  carte: Carte,
  parcours: readonly (readonly Segment[])[],
  aFenetres: (code: BuildingCode) => boolean,
  aPorte: (code: BuildingCode) => boolean,
): Veille {
  const fenetres = new Set(
    carte.montres
      .filter(aFenetres)
      .map((code) => ({ code, k: graine(`${jour}:${numero}:${code}`) }))
      .sort((a, b) => a.k - b.k || a.code.localeCompare(b.code))
      .slice(0, NOEUDS_FENETRES)
      .map((x) => x.code),
  );
  const portes = visitesDePortes(carte, parcours, aPorte);
  return { c0, fenetres, portes };
}

/**
 * The windows at clock `c`: lit (1) or dark (0), flat, in steps. `n` (0 to 2) shifts the pattern
 * between buildings. Dark for the first and last 5% of a cycle, so it is 0 at every boundary.
 */
export function fenetres(c: number, n: number): number {
  "worklet";
  const u = (c % CYCLE_MS) / CYCLE_MS;
  if (u < 0.05 || u > 0.95) return 0;
  return (u * 3 + n * 0.37) % 1 < 0.6 ? 1 : 0;
}

/** The door's glow at `t` ms into the wave: 1 around a visit, else 0. */
export function porte(t: number, visites: readonly (readonly [number, number])[]): number {
  "worklet";
  for (let i = 0; i < visites.length; i++) {
    const v = visites[i];
    if (v && t >= v[0] - AVANT_MS && t <= v[1] + APRES_MS) return 1;
  }
  return 0;
}

type Pt = readonly [number, number];
/** The box (sprite px) holding a stage's windows, with a margin for the face's slope. */
export function boiteFenetres(a: AccrochesStade): { x: number; y: number; w: number; h: number } {
  const xs = a.fenetres.flatMap((f) => [f.px[0] - f.largeur / 2, f.px[0] + f.largeur / 2]);
  const ys = a.fenetres.flatMap((f) => [
    f.px[1] - f.hauteur / 2 - f.largeur * 0.3,
    f.px[1] + f.hauteur / 2 + f.largeur * 0.3,
  ]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** One window's corners (sprite px): a parallelogram, its top and bottom edges running with its face. */
export function coinsFenetre(f: AccrochesStade["fenetres"][number]): Pt[] {
  const [cx, cy] = f.px;
  const l = f.largeur / 2;
  const h = f.hauteur / 2;
  // 30 degrees of the iso axes: the right face drops towards the right, the left one towards the left.
  const d = l * 0.577 * (f.face === "droite" ? 1 : -1);
  return [
    [cx - l, cy - h - d],
    [cx + l, cy - h + d],
    [cx + l, cy + h + d],
    [cx - l, cy + h - d],
  ];
}
