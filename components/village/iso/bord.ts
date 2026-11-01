// The island's edge (AUDIT-DA 17, 18, 40): one rim for every stage, drawn from the cells alone, and
// an organic one (T18, tour 2: neither a diamond nor a staircase). Along each line of exposed sides,
// bulges of 1 to 3 cells and 10 to 24 dp rise outward as smooth lobes (hash of the line and the
// position, no randomness), zero at their ends, never inward: no cell is cropped and the contour is
// the same on every visit. FIN-CAR: no bank, no glints, no ink on the contour; the lawn simply
// carries on into the world. Pure; Tuile (IsoCarteDemo) draws the paths, static, in each ground tile.

import { ecranXY } from "./carteDemo";
import type { Case } from "./isoLayout";
import type { Point } from "./ombres";
import { hasard } from "./solVarie";

/** How far a bulge rises at most, in dp (BOSSE_MIN at least). */
export const BOSSE = 24;
/** How far the rim reaches past a cell's diamond, in dp: a bulge, and a little for the dusk's rim. */
export const PORTEE_BORD = BOSSE + 8;
const GRAINE = 31;

export type Bord = {
  /** Every cell's diamond and the bulges: the clip that keeps patches and dusk inside the island. */
  ilot: string;
  /** The bulges alone (outside the diamonds), to fill with the lawn. */
  bosses: string;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = ([x, y]: Point) => `${r1(x)},${r1(y)}`;
/** Shoelace sum: positive for the diamonds' turn (top, right, bottom, left on screen). */
const aire = (p: readonly Point[]) =>
  p.reduce((s, [x, y], i) => {
    const [u, v] = p[(i + 1) % p.length] ?? [x, y];
    return s + x * v - u * y;
  }, 0);
const suite = (pts: readonly Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${pt(p)}`).join("");

/** A bulge is at least this tall and at most BOSSE, in dp. */
export const BOSSE_MIN = 10;
const PAS = 8;

/**
 * A side `a`-`c` as a smooth lobe: PAS+1 points, pushed outward (away from `centre`) by
 * `haut * sin(pi u)^0.6`, u going from `u0` to `u1` (fractions of the whole bulge, so two sides of
 * one bulge join). Zero at the ends of the bulge, never inward.
 */
export function coteLisse(
  a: Point,
  c: Point,
  centre: Point,
  [u0, u1]: readonly [number, number],
  haut: number,
): Point[] {
  const [dx, dy] = [c[0] - a[0], c[1] - a[1]];
  const n = Math.hypot(dx, dy) || 1;
  const vers = dy * ((a[0] + c[0]) / 2 - centre[0]) - dx * ((a[1] + c[1]) / 2 - centre[1]);
  const sens = vers >= 0 ? 1 : -1;
  const [nx, ny] = [(sens * dy) / n, (-sens * dx) / n];
  return Array.from({ length: PAS + 1 }, (_, k): Point => {
    const t = k / PAS;
    const h = haut * Math.sin(Math.PI * (u0 + (u1 - u0) * t)) ** 0.6;
    return [a[0] + dx * t + nx * h, a[1] + dy * t + ny * h];
  });
}

/**
 * The bulge that covers position `w` (a cell index along a line) on the line `ligne`: pieces of 1
 * to 3 cells laid from index 0, each with its own height, clipped to the run `[d, f]` of exposed
 * cells that contains `w`. Anchored at 0 so a growing island keeps most of its contour.
 */
function lobe(ligne: number, sel: number, w: number, d: number, f: number) {
  let s = 0;
  for (let k = 0; k < 200; k++) {
    const long = 1 + Math.floor(3 * hasard(ligne, s, sel, GRAINE));
    if (w < s + long) {
      const a = Math.max(s, d);
      const e = Math.min(s + long, f + 1);
      return { a, e, haut: BOSSE_MIN + (BOSSE - BOSSE_MIN) * hasard(ligne, s, sel + 50, GRAINE) };
    }
    s += long;
  }
  return { a: w, e: w + 1, haut: BOSSE_MIN };
}

/**
 * The edge of the island whose cells `vu` tells, for the cells `cases` (a tile's): a cell with an
 * exposed side (a neighbour not shown) draws its bulge.
 */
export function bordDe(cases: readonly Case[], vu: (gx: number, gy: number) => boolean): Bord {
  const b: Bord = {
    ilot: "",
    bosses: "",
  };
  for (const [gx, gy] of cases) {
    const haut = ecranXY([gx, gy]);
    const droite = ecranXY([gx + 1, gy]);
    const fond = ecranXY([gx + 1, gy + 1]);
    const gauche = ecranXY([gx, gy + 1]);
    const centre: Point = [(haut[0] + fond[0]) / 2, (haut[1] + fond[1]) / 2];
    // One side: the lobe of the run it belongs to, along `w` (its index), `croit` if w grows from a to c.
    const cote = (
      a: Point,
      c: Point,
      sel: number,
      ligne: number,
      w: number,
      expose: (k: number) => boolean,
      croit: boolean,
    ) => {
      let d = w;
      let f = w;
      while (w - d < 64 && expose(d - 1)) d--;
      while (f - w < 64 && expose(f + 1)) f++;
      const l = lobe(ligne, sel, w, d, f);
      const u = (x: number) => (x - l.a) / (l.e - l.a);
      const pts = coteLisse(a, c, centre, croit ? [u(w), u(w + 1)] : [u(w + 1), u(w)], l.haut);
      // H0-01: every subpath turns like a diamond, so the nonzero rule unions them; a bulge turned the other way punched a hole (a pale arc under the day's wash, a dark blot under the dusk).
      b.bosses += `${suite(aire(pts) < 0 ? [...pts].reverse() : pts)}Z`;
      return pts;
    };
    b.ilot += `${suite([haut, droite, fond, gauche])}Z`;
    const ligneX = (y: number, dy: number) => (k: number) => vu(k, y) && !vu(k, y + dy);
    const ligneY = (x: number, dx: number) => (k: number) => vu(x, k) && !vu(x + dx, k);
    if (!vu(gx, gy - 1)) cote(haut, droite, 5, gy, gx, ligneX(gy, -1), true);
    if (!vu(gx - 1, gy)) cote(gauche, haut, 7, gx, gy, ligneY(gx, -1), false);
    if (!vu(gx + 1, gy)) cote(droite, fond, 1, gx, gy, ligneY(gx, 1), true);
    if (!vu(gx, gy + 1)) cote(fond, gauche, 3, gy, gx, ligneX(gy, 1), false);
  }
  b.ilot += b.bosses;
  return b;
}
