jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

import {
  ACCESSOIRES,
  accessoiresMontres,
  type Masse,
  massesForet,
} from "@/components/village/iso/alentours";
import { ecranXY, etatCarte } from "@/components/village/iso/carteDemo";
import { PARCELLES } from "@/components/village/iso/champs";
import { SORTIES } from "@/components/village/iso/rues";

const PALIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
/** The map point of a foot in grid cells (the inverse of `ecranXY`). */
const grille = (x: number, y: number) => {
  const u = (x - 480) / 24;
  const v = y / 12;
  return [(u + v) / 2, (v - u) / 2] as const;
};
const lisiere = (m: Masse) => {
  const [gx, gy] = grille(m.x, m.y);
  return gx > 35.2 || gy > 35.2;
};
const masses = (p: (typeof PALIERS)[number]) => {
  const { visible } = etatCarte(p, false);
  return massesForet(visible);
};
const cle = (m: Masse) =>
  `${m.nom}@${Math.round(m.x)},${Math.round(m.y)}x${m.echelle}${m.flip ? "f" : ""}`;
const route = SORTIES.find((s) => s.fin[0] === 12)?.branches[0] ?? [];
const fin = route[route.length - 1] ?? [0, 0];

describe("the south lisiere hides the grey past the painted ground (loupe BC)", () => {
  test("the same masses at every tier: nothing appears late, nothing goes", () => {
    const ref = masses(1).filter(lisiere).map(cle).toSorted();
    expect(ref.length).toBeGreaterThan(15);
    for (const p of PALIERS) expect(masses(p).filter(lisiere).map(cle).toSorted()).toEqual(ref);
  });

  test("whole masses, three size classes growing with depth, mixed species, mirrored in turn", () => {
    const ms = masses(6).filter((m) => lisiere(m) && m.flip !== undefined);
    expect(new Set(ms.map((m) => m.echelle)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(ms.map((m) => m.nom)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(ms.map((m) => m.flip === true)).size).toBe(2);
    const prof = (m: Masse) => grille(m.x, m.y).reduce((a, b) => a + b, 0);
    const moy = (e: number) => {
      const l = ms.filter((m) => m.echelle === e).map(prof);
      return l.reduce((a, b) => a + b, 0) / Math.max(1, l.length);
    };
    expect(moy(0.85)).toBeLessThan(moy(1.15));
    expect(moy(1.15)).toBeLessThan(moy(1.5));
  });

  test("an identical mass is never within 6 cells of its twin", () => {
    // The world's own closing border (never mirrored) is not part of the lisiere's lattice.
    const ms = masses(12).filter((m) => lisiere(m) && m.flip !== undefined);
    for (const [i, a] of ms.entries())
      for (const b of ms.slice(i + 1)) {
        if (a.nom !== b.nom) continue;
        const [ax, ay] = grille(a.x, a.y);
        const [bx, by] = grille(b.x, b.y);
        expect(Math.max(Math.abs(ax - bx), Math.abs(ay - by))).toBeGreaterThanOrEqual(6);
      }
  });

  test("two large masses stand either side of the road's end and close over it", () => {
    const [ex] = ecranXY([fin[0], fin[1]]);
    const flancs = masses(12).filter((m) => m.echelle === 1.7);
    expect(flancs).toHaveLength(2);
    const dx = flancs.map((m) => m.x - ex).toSorted((a, b) => a - b);
    expect(dx[0]).toBeLessThan(0);
    expect(dx[1]).toBeGreaterThan(0);
    // Each one's half width (84 dp x 1.7) reaches the road's end, give or take its own half width (6 dp).
    for (const d of dx) expect(Math.abs(d)).toBeLessThan(84 * 1.7 + 6);
  });

  test("no mass foot on the road or on a plot, at any tier", () => {
    for (const p of PALIERS)
      for (const m of masses(p)) {
        const [gx, gy] = grille(m.x, m.y);
        for (const [rx, ry] of SORTIES.flatMap((s) => s.branches.flat()))
          expect(Math.hypot(gx - rx, gy - ry)).toBeGreaterThan(0.9);
        for (const [x0, y0, x1, y1] of Object.values(PARCELLES))
          expect(gx > x0 && gx < x1 && gy > y0 && gy < y1).toBe(false);
      }
  });
});

describe("the corner's props (loupe BC)", () => {
  const hors = ACCESSOIRES.filter((a) => a.hors);
  const bord = (g: readonly [number, number]) =>
    Math.min(
      ...Object.values(PARCELLES).map(([x0, y0, x1, y1]) =>
        Math.hypot(Math.max(x0 - g[0], 0, g[0] - x1), Math.max(y0 - g[1], 0, g[1] - y1)),
      ),
    );

  test("two to four, each within 3 cells of a plot, off the grid, clear of the road, mirrored repeats", () => {
    expect(hors.length).toBeGreaterThanOrEqual(2);
    expect(hors.length).toBeLessThanOrEqual(4);
    for (const a of hors) {
      const g = a.pied ?? [a.case[0] + 0.5, a.case[1] + 0.5];
      expect(bord(g)).toBeLessThanOrEqual(3);
      expect(g[1]).toBeGreaterThan(20);
      expect(a.flip).toBe(true);
      for (const [rx, ry] of SORTIES.flatMap((s) => s.branches.flat()))
        expect(Math.hypot(g[0] - rx, g[1] - ry)).toBeGreaterThan(1);
      // Its twin on the island is 6 cells or more away.
      for (const b of ACCESSOIRES.filter((o) => o.nom === a.nom && !o.hors))
        expect(
          Math.max(...[0, 1].map((k) => Math.abs((b.case[k] ?? 0) - (a.case[k] ?? 0)))),
        ).toBeGreaterThanOrEqual(6);
    }
    expect(new Set(hors.map((a) => a.nom)).size).toBe(hors.length);
  });

  test("shown with the painted ground from tier 4, never before, and once shown they stay", () => {
    for (const p of PALIERS) {
      const { visible, montres } = etatCarte(p, false);
      const n = accessoiresMontres(visible, montres, p, true).filter((a) => a.hors).length;
      expect(n).toBe(p >= 4 ? hors.length : 0);
      expect(accessoiresMontres(visible, montres, p).filter((a) => a.hors)).toHaveLength(0);
    }
  });
});
