// The crows perched on roofs (L5-T10), pure side (drawn and flown by CorbeauxToits.tsx). A crow
// stands on a ridge point read by eye on the painted sprite (isoLayout.json `toits`), drawn still:
// no animated node while it perches. A touch of the map that lands near it (horloge.ts `Effroi`)
// startles it: it flies off in an arc for DUREE_ENVOL_MS, one node for that long, then is gone
// until a touch lands far from its roof (it is back on its perch then). Nothing here draws and
// nothing is random: the side it flies to is the side away from the finger.

import type { BuildingCode } from "@/db/schema";
import { pose, spriteDe } from "./carteDemo";
import { toits } from "./isoLayout";
import type { Ambiance, Stade } from "./isoSpec";

/** A touch within this many dp of the crow, on the map, startles it. */
export const RAYON_EFFROI = 56;
/** The flight, ms of the ambient clock. */
export const DUREE_ENVOL_MS = 2600;
/** The perched crow's drawing box and the flying one's, dp. */
// T39 (qa-peinture 14): a crow as big as a villager read as a toy; 0.8 of its drawing (was 1.4, AUDIT-DA 24).
export const POSE_L = 11.2;
export const POSE_H = 8;
export const VOL_CORBEAU_DESSIN_L = 22;
export const VOL_CORBEAU_DESSIN_H = 12;
export const VOL_CORBEAU_L = VOL_CORBEAU_DESSIN_L * 0.8;
export const VOL_CORBEAU_H = VOL_CORBEAU_DESSIN_H * 0.8;
/** How far and how high the crow goes, dp. */
const PORTEE = 150;
const HAUTEUR_ENVOL = 130;
const BATTEMENTS = 8;

/** The buildings that have a perch at some stage. */
export const CODES_A_CORBEAU: ReadonlySet<string> = new Set(
  [...toits.keys()].map((cle) => cle.slice(0, cle.lastIndexOf("_"))),
);

/** Whether a startled crow takes wing: never at night (audit T43 round 1, qa-audit3: no bird in flight at night). */
export const peutEnvoler = (ambiance: Ambiance): boolean => ambiance !== "nuit";

/** Where the crow of a building's stage stands on the map, dp (its feet), or null: no sprite or no point. */
export function perchoirDe(
  code: BuildingCode,
  stade: Stade,
  ambiance: Ambiance = "nuit",
): { x: number; y: number } | null {
  const s = spriteDe(code, stade, ambiance);
  const p = toits.get(`${code}_${stade}`);
  if (!s || !p) return null;
  const r = pose(code, s);
  return { x: r.x + (p[0] / s.size[0]) * r.w, y: r.y + (p[1] / s.size[1]) * r.h };
}

/** Whether a touch at (tx, ty) is near enough to the crow at (x, y). */
export function toucheProche(x: number, y: number, tx: number, ty: number): boolean {
  "worklet";
  return Math.hypot(x - tx, y - ty) <= RAYON_EFFROI;
}

/** The side a crow flies to: away from the finger (1 right, -1 left on screen). */
export function sensEnvol(x: number, tx: number): 1 | -1 {
  "worklet";
  return x >= tx ? 1 : -1;
}

/**
 * The flight `t` ms after the startle, from the crow's perch: an arc up and away, wings beating
 * (a vertical squash, as the flock's), fading out at the end. Nothing before it or after it.
 */
export function envolCorbeau(
  t: number,
  sens: 1 | -1,
): { opacite: number; dx: number; dy: number; battement: number } {
  "worklet";
  const p = Math.min(1, Math.max(0, t / DUREE_ENVOL_MS));
  const monte = 1 - (1 - p) * (1 - p);
  return {
    opacite: p >= 1 ? 0 : p < 0.7 ? 1 : (1 - p) / 0.3,
    dx: sens * PORTEE * p,
    dy: -HAUTEUR_ENVOL * monte - 18 * Math.sin(Math.PI * p),
    battement: 0.72 + 0.28 * Math.cos(2 * Math.PI * BATTEMENTS * p),
  };
}
