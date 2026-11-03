// The night's warm pools on the ground (audit T43 round 1: "night is a tint; the fire does not light
// the ground"). One flat pool in front of every shown building whose stage has lit windows or a
// hearth, and a wider one round the campfire. Pure and fixed: the shapes are ellipses in the iso
// plane, drawn by AmbianceCarte (under the sprites) as soft radial gradients (rawColors isoFlaque*):
// no view opacity, no animation, nothing by day.

import type { BuildingCode } from "@/db/schema";
import { COTE, ecranXY } from "./carteDemo";
import { accrochesDe } from "./feux";
import { emplacements } from "./isoLayout";
import type { Stade } from "./isoSpec";
import { PEINTS } from "./peints";
import { porteSol } from "./rues";
import { hasard } from "./solVarie";

/** A pool on the map: its centre and half-width, dp (its half-height is half of that, as the ground's). */
export type Flaque = { x: number; y: number; rx: number };

/** Half-widths, dp: the pool of a lit house, the pool of a hearth, the campfire's. */
const R_FENETRES = COTE * 0.7;
const R_FOYER = COTE * 0.85;
const R_FEU = COTE * 1.2;
// The last answer, kept: IsoCarte asks at every render (each walker's step is one) with a `stade`
// that is a new function each time, and a new array would re-render all of the ground tiles for
// the same pools. One entry, so nothing grows.
let derniere: { cle: string; flaques: Flaque[] } | null = null;

/** The pools of the shown buildings, by their current stage: a lit window or a hearth makes one. The same array while the buildings and their stages are the same. */
export function flaquesDe(
  montres: readonly BuildingCode[],
  stade: (code: BuildingCode) => Stade,
): Flaque[] {
  const cle = montres.map((code) => `${code}:${stade(code)}`).join(",");
  if (derniere?.cle !== cle) derniere = { cle, flaques: calculer(montres, stade) };
  return derniere.flaques;
}

/**
 * A pool's centre along one axis, in cells: always in the first half of a cell, 0.22 to 0.38 past
 * its edge and never at its middle (0.5), so a pool is never wedged on a path cell (M4-07).
 */
export const horsCentre = (g: number, h: number): number => Math.floor(g) + 0.22 + 0.16 * h;

/** A cell point moved off the cell's middle by a hash of the cell (sel tells the light's kind apart). */
const decaler = (gx: number, gy: number, sel: number): [number, number] => [
  horsCentre(gx, hasard(Math.floor(gx), Math.floor(gy), sel, 7)),
  horsCentre(gy, hasard(Math.floor(gx), Math.floor(gy), sel + 2, 7)),
];

function calculer(
  montres: readonly BuildingCode[],
  stade: (code: BuildingCode) => Stade,
): Flaque[] {
  return montres.flatMap((code): Flaque[] => {
    // A painted building lights its own night (constants/buildings/<code>.ts `lights`, on what the painting lights): the old
    // door-side pool belonged to the old art and gave a painted house a halo with no source.
    if (PEINTS[code]) return [];
    if (code === "campfire") {
      const { coin, emprise } = emplacements.campfire;
      const [x, y] = ecranXY(
        decaler(coin[0] + emprise[0] / 2 - 0.3, coin[1] + emprise[1] / 2 - 0.3, 1),
      );
      return [{ x, y, rx: R_FEU }];
    }
    const a = accrochesDe(code, stade(code));
    const porte = porteSol(code);
    if (!a || !porte || (a.fenetres.length === 0 && !a.foyer)) return [];
    const [x, y] = ecranXY(decaler(porte[0], porte[1], 2));
    return [{ x, y, rx: a.foyer ? R_FOYER : R_FENETRES }];
  });
}

/** The day's light bands (M4-10, AmbianceCarte.tsx): centre across the map (share of its width), width dp, strength against the 10 % peak. */
export const RAIS: readonly { x: number; w: number; force: number }[] = [
  { x: 0.2, w: 70, force: 0.8 },
  { x: 0.48, w: 120, force: 1 },
  { x: 0.78, w: 84, force: 0.7 },
];
/** Their slant, degrees: the light falls from the upper left to the lower right. */
export const PENTE_RAIS = -28;

/** A hearth's or the campfire's pool, the hotter ones (AmbianceCarte.tsx). */
export const estChaude = (f: Flaque): boolean => f.rx >= R_FOYER;
