// Filled bands for what the app draws on the ground (T22): the streets and the stream are outlines,
// never strokes, so their width can vary along the way and a texture can fill them later (motifs.ts).
// Pure, in grid units; `cheminRuban` turns polygons into one screen `d`. Every polygon is turned the
// same way, so the nonzero rule unions the overlaps of one `d` instead of punching holes in them.

import { ecranXY } from "./carteDemo";
import type { Point } from "./ombres";

const aire = (p: readonly Point[]) =>
  p.reduce((s, [x, y], i) => {
    const [u, v] = p[(i + 1) % p.length] ?? [x, y];
    return s + x * v - u * y;
  }, 0);
/** The polygon turned counter-clockwise in grid units (positive area), whichever way it was built. */
const sens = (p: Point[]): Point[] => (aire(p) < 0 ? p.reverse() : p);

/** A band along a polyline, `demi[i]` its half-width at `pts[i]`: left side out, right side back. */
export function ruban(pts: readonly Point[], demi: readonly number[]): Point[] {
  const cotes = pts.map((p, i): [Point, Point] => {
    const a = pts[Math.max(0, i - 1)] ?? p;
    const b = pts[Math.min(pts.length - 1, i + 1)] ?? p;
    const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const [nx, ny] = [-(b[1] - a[1]) / n, (b[0] - a[0]) / n];
    const h = demi[i] ?? 0;
    return [
      [p[0] + nx * h, p[1] + ny * h],
      [p[0] - nx * h, p[1] - ny * h],
    ];
  });
  return sens([...cotes.map(([g]) => g), ...cotes.map(([, d]) => d).reverse()]);
}

/** A round cap or join: a disc of radius `r` about `c`. */
export const disque = (c: Point, r: number, n = 10): Point[] =>
  Array.from({ length: n }, (_, k): Point => {
    const a = (2 * Math.PI * k) / n;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });

/** `n` points per span of a Catmull-Rom spline through `pts` (it passes through every one), the last point included. */
export function lisse(pts: readonly Point[], n: number): Point[] {
  const at = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))] ?? [0, 0];
  const out: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++)
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      const f = (j: 0 | 1) =>
        0.5 *
        (2 * p1[j] +
          (p2[j] - p0[j]) * t +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t +
          (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  const fin = pts.at(-1);
  return fin ? [...out, fin] : out;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Grid polygons as one screen `d` (dp, rounded to a tenth). */
export const cheminRuban = (polys: readonly (readonly Point[])[]): string =>
  polys
    .filter((p) => p.length > 2)
    .map((p) => `M${p.map((q) => ecranXY(q).map(r1).join(",")).join("L")}Z`)
    .join("");
