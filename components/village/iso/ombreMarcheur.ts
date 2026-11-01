// A villager's shadow stays on the ground (Guillaume, 30/10): it follows the walker's place on the
// grid and never its height. The body node adds a step's bounce and a gesture's lift to that place;
// the shadow takes the place alone, and only shrinks and fades a notch or two while the body is up.
// Pure, worklet-safe: the clock's frame reads them.

/** A walker's place on the grid, cells (positionA's x and y). */
type PlaceGrille = { readonly x: number; readonly y: number };

/** Half a cell's width on screen: the grid's x-axis step. COTE = 48 (carteDemo.ts), passed in to keep this file free of imports. */
export function ecartGrille(
  p: PlaceGrille,
  cx: number,
  cy: number,
  cote: number,
): { dx: number; dy: number } {
  "worklet";
  return {
    dx: ((p.x - p.y - (cx - cy)) * cote) / 2,
    dy: ((p.x + p.y - (cx + cy + 1)) * cote) / 4,
  };
}

/** Lift, in dp, past which the shadow takes its first notch and its second. */
export const CRANS_OMBRE = [1.5, 4] as const;

/** The shadow's scale and opacity for a body lifted `levee` dp: two notches at most, never a position. */
export function ombreLevee(levee: number): { echelle: number; opacite: number } {
  "worklet";
  const cran = levee > CRANS_OMBRE[1] ? 2 : levee > CRANS_OMBRE[0] ? 1 : 0;
  return { echelle: 1 - 0.12 * cran, opacite: 1 - 0.18 * cran };
}

/** Everything the shadow's node shows: the ground place, then the notch. `levee` only picks the notch. */
export function ombreMarcheur(p: PlaceGrille, cx: number, cy: number, cote: number, levee: number) {
  "worklet";
  return { ...ecartGrille(p, cx, cy, cote), ...ombreLevee(levee) };
}
