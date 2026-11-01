// FIN-MAG tour 0: the pure side of the sprite-sheet player (PlancheJeu.tsx). A sheet is a grid of
// drawings; time picks one, the player slides the sheet so that drawing shows. 12 frames a second
// with 8 drawings, some held (the attack and the peak held, the fall drawn), as in a comic's
// "on twos". Out of its time span there is no drawing at all: nothing shows at rest.

export type Planche = {
  colonnes: number;
  lignes: number;
  fps: number;
  /** The drawing shown at each tick of the clip, in order: its length over `fps` is the clip's duration. */
  tenues: readonly number[];
  /** The one drawing shown in reduced motion and in the frozen mode. */
  fixe: number;
};

/** The reveal's burst: 4 x 2 drawings, 12 ticks (1 s), 8 drawings held unevenly. */
export const PLANCHE_ECLAT: Planche = {
  colonnes: 4,
  lignes: 2,
  fps: 12,
  tenues: [0, 0, 1, 2, 2, 3, 4, 5, 5, 6, 7, 7],
  fixe: 3,
};

/**
 * Which way the reveal's burst is drawn: the Svg (false, the default) or the painted sheet. It
 * flips to true when the real sheet replaces the stand-in (planches/eclat-factice.png), once
 * qa's gfxinfo pass says the sheet costs no more than the Svg.
 */
export const EFFET_PLANCHE = false;

/** The clip's length, ms. */
export const dureePlanche = (p: Planche): number => (p.tenues.length / p.fps) * 1000;

/** The drawing at `t` ms into the clip, or -1 before it starts and once it is over (nothing shown). */
export function dessinA(t: number, p: Planche): number {
  "worklet";
  if (!(t >= 0)) return -1;
  const tic = Math.floor((t / 1000) * p.fps);
  return p.tenues[tic] ?? -1;
}

/** The translate that brings drawing `d` (w x h each) into the clip; -1 slides the whole sheet out of it. */
export function decalage(d: number, p: Planche, w: number, h: number): { x: number; y: number } {
  "worklet";
  if (d < 0) return { x: -p.colonnes * w, y: 0 };
  return { x: -(d % p.colonnes) * w, y: -Math.floor(d / p.colonnes) * h };
}
