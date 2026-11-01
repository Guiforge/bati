// The ground's organic shapes (L6-T18): the grid stays inside, the eye never sees its cells. A cell's
// "blob" is a closed quadratic curve about its centre, with a radius that wobbles from one knot to the
// next, so a patch of lawn or the island's rim has no straight diamond edge. Pure: every wobble is a
// hash of the cell (solVarie.ts `hasard`), so the same ground is drawn on every visit.

import { ecranXY } from "./carteDemo";
import { estTerre, hasard } from "./solVarie";

const KNOTS = 6;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The `d` of a blob about the centre of cell (gx, gy), mean radius `r` in cells. The curve is a
 * quadratic B-spline of the knots, so it stays inside their hull (about 0.93 r); `sel` makes two
 * blobs on one cell differ.
 */
export function blob(gx: number, gy: number, r: number, sel = 0, graine = 7, n = KNOTS): string {
  const h = (k: number) => hasard(gx, gy, 40 + sel * 24 + k, graine);
  const pts = Array.from({ length: n }, (_, i) => {
    const a = ((i + (h(i) - 0.5) * 0.5) * 2 * Math.PI) / n;
    const rr = r * (0.87 + 0.26 * h(n + i));
    return ecranXY([gx + 0.5 + rr * Math.cos(a), gy + 0.5 + rr * Math.sin(a)]);
  });
  const at = (i: number) => pts[i % n] ?? [0, 0];
  const mid = (i: number) =>
    `${r1((at(i)[0] + at(i + 1)[0]) / 2)},${r1((at(i)[1] + at(i + 1)[1]) / 2)}`;
  const q = (i: number) => `Q${r1(at(i)[0])},${r1(at(i)[1])} ${mid(i)}`;
  return `M${mid(0)}${Array.from({ length: n }, (_, i) => q(i + 1)).join("")}Z`;
}

/** Radius of a lawn patch: wide when land lies all around (patches overlap), tight beside water or the rim. */
export function rayonPlaque(visible: (gx: number, gy: number) => boolean, gx: number, gy: number) {
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++)
      if (!visible(gx + dx, gy + dy) || !estTerre(gx + dx, gy + dy)) return 0.82;
  return 1.1;
}
