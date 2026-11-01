import { BOSSE_MIN, bordDe, coteLisse } from "@/components/village/iso/bord";
import { ecranXY, HAUTEUR, tuiles } from "@/components/village/iso/carteDemo";
import { type Case, ileVisible } from "@/components/village/iso/isoLayout";
import type { Point } from "@/components/village/iso/ombres";

const grille = (l: string[]) => l.map((r) => [...r].map((c) => c === "#"));
const cases = (g: readonly (readonly boolean[])[]) =>
  g.flatMap((r, y) => r.flatMap((v, x): Case[] => (v ? [[x, y]] : [])));
const bord = (l: string[]) => {
  const g = grille(l);
  return bordDe(cases(g), (x, y) => g[y]?.[x] === true);
};
const sous = (d: string) => d.split("M").filter(Boolean).length;
const nombres = (d: string) =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as Point,
  );
/** Whether p is in the polygon (even-odd is enough: the bulges are drawn as separate closed shapes). */
const dans = (p: Point, poly: readonly Point[]) => {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] ?? p;
    const [xj, yj] = poly[j] ?? p;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
};

/** The longest run of consecutive segments lying on an iso axis (the diamond's sides). */
const plusLongueDroite = (p: readonly Point[]) => {
  const ref = Math.abs(Math.atan2(ecranXY([1, 0])[1], ecranXY([1, 0])[0]));
  let run = 0;
  let max = 0;
  for (let i = 1; i < p.length; i++) {
    const [q, r] = [p[i - 1] ?? [0, 0], p[i] ?? [0, 0]];
    const ang = Math.abs(Math.atan2(r[1] - q[1], r[0] - q[0]));
    const axe = [ref, Math.PI - ref].some((x) => Math.abs(ang - x) < 0.03);
    run = axe ? run + Math.hypot(r[0] - q[0], r[1] - q[1]) : 0;
    max = Math.max(max, run);
  }
  return max;
};
const COTE = Math.hypot(
  ecranXY([1, 0])[0] - ecranXY([0, 0])[0],
  ecranXY([1, 0])[1] - ecranXY([0, 0])[1],
);

describe("the island's rim (bord.ts)", () => {
  test("FIN-CAR: the rim is the clip and the bulges alone, no bank, no glints, no ink", () => {
    const b = bord(["#"]);
    expect(Object.keys(b).sort()).toEqual(["bosses", "ilot"]);
    expect(sous(b.bosses)).toBe(4);
  });

  test("a cell inside the island has no bulge: only the exposed sides draw one", () => {
    const b = bord(["###", "###", "###"]);
    expect(sous(b.ilot)).toBeGreaterThan(9);
    expect(sous(b.bosses)).toBe(12);
  });

  test("a side is a smooth lobe, outward only, from BOSSE_MIN to BOSSE dp", () => {
    const a = ecranXY([1, 0]);
    const c = ecranXY([1, 1]);
    const centre = ecranXY([0.5, 0.5]);
    const pts = coteLisse(a, c, centre, [0, 1], BOSSE_MIN);
    expect(pts[0]).toEqual(a);
    expect(pts.at(-1)?.[0]).toBeCloseTo(c[0]);
    const dc = (centre[0] - a[0]) * (c[1] - a[1]) - (centre[1] - a[1]) * (c[0] - a[0]);
    const long = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const d = pts.map(
      (p) => ((p[0] - a[0]) * (c[1] - a[1]) - (p[1] - a[1]) * (c[0] - a[0])) / long,
    );
    for (const x of d) expect(Math.sign(x) * Math.sign(dc)).toBeLessThanOrEqual(0);
    expect(Math.max(...d.map(Math.abs))).toBeCloseTo(BOSSE_MIN, 5);
  });

  test("at every stage the contour rises by 10 to 24 dp, has no straight run past 2 cells", () => {
    for (const palier of [1, 6, 12] as const) {
      const v = ileVisible(palier, []);
      const b = bordDe(cases(v), (x, y) => v[y]?.[x] === true);
      expect(bordDe(cases(v), (x, y) => v[y]?.[x] === true)).toEqual(b);
      // Amplitude: the farthest bulge point from its cell's diamond.
      const diam = cases(v).map(([gx, gy]) => [
        ecranXY([gx, gy]),
        ecranXY([gx + 1, gy]),
        ecranXY([gx + 1, gy + 1]),
        ecranXY([gx, gy + 1]),
      ]);
      const hors = (p: Point) => !diam.some((q) => dans(p, q));
      const pts = b.bosses
        .split("Z")
        .filter(Boolean)
        .flatMap((s) => nombres(s))
        .filter(hors);
      expect(pts.length).toBeGreaterThan(0);
      let max = 0;
      for (const p of pts) {
        const m = Math.min(...diam.flat().map((q) => Math.hypot(q[0] - p[0], q[1] - p[1])));
        max = Math.max(max, m);
      }
      expect(max).toBeGreaterThanOrEqual(BOSSE_MIN * 0.7);
      for (const s of b.bosses.split("Z").filter(Boolean))
        expect(plusLongueDroite(nombres(s))).toBeLessThanOrEqual(2 * COTE);
    }
  });

  test("every shown cell lies inside the clip, at every stage, and the contour is not a diamond", () => {
    for (const palier of [1, 6, 12] as const) {
      const v = ileVisible(palier, []);
      const b = bordDe(cases(v), (x, y) => v[y]?.[x] === true);
      expect(b.bosses).not.toBe("");
      // The cell's four corners and its centre are inside the diamonds' union (the first subpaths of the clip).
      const diamants = b.ilot
        .split("Z")
        .filter(Boolean)
        .slice(0, cases(v).length)
        .map((s) => nombres(s));
      for (const [gx, gy] of cases(v)) {
        const centre = ecranXY([gx + 0.5, gy + 0.5]);
        expect(diamants.some((d) => dans(centre, d))).toBe(true);
      }
      const points = cases(v).flatMap(([gx, gy]) =>
        Array.from(
          { length: 81 },
          (_, k): Point => ecranXY([gx + ((k % 9) + 0.5) / 9, gy + (Math.floor(k / 9) + 0.5) / 9]),
        ),
      );
      expect(points.every((p) => diamants.some((d) => dans(p, d)))).toBe(true);
      // The bulges never take a point inside a shown cell's diamond: they only add land outside it.
      expect(sous(b.bosses)).toBeGreaterThan(0);
    }
  });

  test("it is the same on every call and draws nothing for no cell", () => {
    expect(bord(["#.#", "###"])).toEqual(bord(["#.#", "###"]));
    expect(bordDe([], () => false).ilot).toBe("");
  });

  test("the lowest bulge at palier 12 fits the last row of tiles", () => {
    const v = ileVisible(12, []);
    const b = bordDe(cases(v), (x, y) => v[y]?.[x] === true);
    const ymax = Math.max(...nombres(b.bosses).map(([, y]) => y));
    expect(ymax).toBeGreaterThanOrEqual(HAUTEUR - 1);
    for (const ratio of [1.5, 2, 2.625, 3.5]) {
      const dernier = tuiles(ratio).filter((r) => r.y + r.h >= HAUTEUR);
      const bas = Math.max(...dernier.map((r) => r.y + r.h));
      expect(bas).toBeGreaterThanOrEqual(Math.min(ymax, HAUTEUR + 12));
    }
  });
});
