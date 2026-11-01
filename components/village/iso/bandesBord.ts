import { HAUTEUR, LARGEUR } from "./carteDemo";

/** How far past the map the veil goes, so no pan can show its edge (the land is `etendue`, a few map sizes at most). */
export const DEBORD = 2 * LARGEUR;
/** The edge strips' depth, as a share of the map's width and height. */
const BANDE = 0.3;
/** One strip of the vignette: its box, and its weight (1 = the edge colour, 0 = none) at its two ends along `axe`. */
export type Bande = {
  x: number;
  y: number;
  w: number;
  h: number;
  axe: "x" | "y";
  de: number;
  vers: number;
};

/**
 * The vignette as four layers, one per edge, each a flat past the edge and a gradient inside it,
 * and each spanning the WHOLE overflow along its edge. A layer is continuous on its own, so their
 * sum is: no strip ends inside the map, where a flat meeting a gradient left a step (the vertical
 * seam at 30 % and 70 % of the width). The price is a corner where two layers add, darker and
 * smooth (iter-02; iter-01 H1-02 had cut the strips to avoid it and made the seam).
 */
export function bandes(): Bande[] {
  const [bl, bh] = [LARGEUR * BANDE, HAUTEUR * BANDE];
  const [pl, ph] = [LARGEUR + 2 * DEBORD, HAUTEUR + 2 * DEBORD];
  return [
    { x: -DEBORD, y: -DEBORD, w: DEBORD, h: ph, axe: "x", de: 1, vers: 1 },
    { x: 0, y: -DEBORD, w: bl, h: ph, axe: "x", de: 1, vers: 0 },
    { x: LARGEUR, y: -DEBORD, w: DEBORD, h: ph, axe: "x", de: 1, vers: 1 },
    { x: LARGEUR - bl, y: -DEBORD, w: bl, h: ph, axe: "x", de: 0, vers: 1 },
    { x: -DEBORD, y: -DEBORD, w: pl, h: DEBORD, axe: "y", de: 1, vers: 1 },
    { x: -DEBORD, y: 0, w: pl, h: bh, axe: "y", de: 1, vers: 0 },
    { x: -DEBORD, y: HAUTEUR, w: pl, h: DEBORD, axe: "y", de: 1, vers: 1 },
    { x: -DEBORD, y: HAUTEUR - bh, w: pl, h: bh, axe: "y", de: 0, vers: 1 },
  ];
}
