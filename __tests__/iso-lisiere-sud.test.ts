jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

import {
  ACCESSOIRES,
  accessoiresMontres,
  dansClairiere,
  type Masse,
  massesForet,
  TUILES_ROUTE_SUD,
} from "@/components/village/iso/alentours";
import { ecranXY, etatCarte } from "@/components/village/iso/carteDemo";
import { champsDe, PARCELLES } from "@/components/village/iso/champs";
import { SORTIES } from "@/components/village/iso/rues";
import tuiles from "@/docs/designs/village-loop/loupes/bc/route_tuiles.json";

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
/** The south lisiere's own masses: the world's closing border (`bord_*`) is not part of its lattice. */
const sud = (ms: readonly Masse[]) => ms.filter((m) => lisiere(m) && !m.nom.startsWith("bord_"));

describe("the south lisiere hides the grey past the painted ground (loupe BC)", () => {
  test("the same masses at every tier: nothing appears late, nothing goes", () => {
    const ref = masses(1).filter(lisiere).map(cle).toSorted();
    expect(ref.length).toBeGreaterThan(15);
    for (const p of PALIERS) expect(masses(p).filter(lisiere).map(cle).toSorted()).toEqual(ref);
  });

  test("whole masses, three size classes growing with depth, mixed species, mirrored in turn", () => {
    const ms = sud(masses(6));
    expect(new Set(ms.map((m) => m.echelle)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(ms.map((m) => m.nom)).size).toBe(4);
    // `bord_*` show their slab inside a forest: only the map's true edge carries them.
    expect(ms.some((m) => m.nom.startsWith("bord_"))).toBe(false);
    expect(new Set(ms.map((m) => m.flip === true)).size).toBe(2);
    const prof = (m: Masse) => grille(m.x, m.y).reduce((a, b) => a + b, 0);
    const moy = (e: number) => {
      const l = ms.filter((m) => m.echelle === e).map(prof);
      return l.reduce((a, b) => a + b, 0) / Math.max(1, l.length);
    };
    // Nearer the viewer than the north (0.65, 0.9, 1.2): 1.1, 1.3 and 1.5.
    expect([...new Set(ms.map((m) => m.echelle))].toSorted()).toEqual([1.1, 1.3, 1.5]);
    expect(moy(1.1)).toBeLessThan(moy(1.3));
    expect(moy(1.3)).toBeLessThan(moy(1.5));
  });

  test("an identical mass is never within 3 cells of its twin (6 on the lattice, 3 where a hole needed filling)", () => {
    const ms = sud(masses(12));
    for (const [i, a] of ms.entries())
      for (const b of ms.slice(i + 1)) {
        if (a.nom !== b.nom) continue;
        const [ax, ay] = grille(a.x, a.y);
        const [bx, by] = grille(b.x, b.y);
        expect(Math.max(Math.abs(ax - bx), Math.abs(ay - by))).toBeGreaterThanOrEqual(3);
      }
  });

  /** Whether a map point lies under a mass's crown (an ellipse over its canvas). */
  const couvert = (x: number, y: number, ms: readonly Masse[]) =>
    ms.some((m) => {
      const [w, h] = [168 * m.echelle, 144 * m.echelle];
      return ((x - m.x) / (0.45 * w)) ** 2 + ((y - (m.y - 0.5 * h)) / (0.45 * h)) ** 2 < 1;
    });

  test("no mass box, foot or crown, covers a cell of the south road down to its last, below the screen's bottom, at any tier", () => {
    const cellules = tuiles.sorties["12,19"].route;
    expect(cellules.at(-1)).toEqual([44, 44]);
    expect(cellules).toEqual(TUILES_ROUTE_SUD);
    for (const p of PALIERS)
      for (const m of masses(p)) {
        const [w, h] = [168 * m.echelle, 144 * m.echelle];
        for (const [gx = 0, gy = 0] of cellules) {
          const [x, y] = ecranXY([gx + 0.5, gy + 0.5]);
          expect([m.nom, gx, gy, Math.abs(x - m.x) < w / 2 && y > m.y - h && y < m.y]).toEqual([
            m.nom,
            gx,
            gy,
            false,
          ]);
        }
      }
  });

  test("no mass box covers a plot or a cottage either", () => {
    const rects = [
      ...Object.values(PARCELLES),
      [25.5, 21, 28, 23.5],
      [20.5, 26.5, 23.5, 29],
    ] as const;
    for (const m of masses(12)) {
      const [w, h] = [168 * m.echelle, 144 * m.echelle];
      for (const [x0, y0, x1, y1] of rects)
        for (const gx of [x0, (x0 + x1) / 2, x1])
          for (const gy of [y0, (y0 + y1) / 2, y1]) {
            const [x, y] = ecranXY([gx, gy]);
            expect(Math.abs(x - m.x) < w / 2 && y > m.y - h && y < m.y).toBe(false);
          }
    }
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one walk of the p06 window, clearer whole
  test("no grey world edge or bare dark ground shows below the forest line on the p06 screen", () => {
    const ms = masses(6);
    let gris = 0;
    let nus = 0;
    // The p06 window in map dp: x 144 to 864, from the forest line (y 735) to the screen's bottom (1001).
    // The road's corridor (1.5 cells either side of its line) is bare on purpose: the ground there is painted over the grey.
    const route = SORTIES.flatMap((s) => (s.fin[0] === 12 ? s.branches.flat() : []));
    for (let x = 144; x <= 864; x += 12)
      for (let y = 735; y <= 1001; y += 12) {
        const [gx, gy] = grille(x, y);
        if (gx <= 36.8 && gy <= 36.8) continue;
        if (route.some(([rx, ry]) => Math.hypot(gx - rx, gy - ry) < 1.5)) continue;
        gris++;
        if (!couvert(x, y, ms)) nus++;
      }
    expect(gris).toBeGreaterThan(300);
    expect(nus / gris).toBeLessThan(0.03);
  });

  test("the two dark holes of the p06 screen, at screen px (408, 2202) and (588, 2190), lie under a crown or on the road's own ground (2.2 cells of its line, painted over the grey)", () => {
    const route = SORTIES.flatMap((s) => (s.fin[0] === 12 ? s.branches.flat() : []));
    // Screen px to map dp at p06: x = (px - 504) / 1.5 + 480, y = (py - 897) / 1.5.
    for (const [px, py] of [
      [408, 2202],
      [588, 2190],
    ] as const) {
      const [x, y] = [(px - 504) / 1.5 + 480, (py - 897) / 1.5];
      const [gx, gy] = grille(x, y);
      const sol = route.some(([rx, ry]) => Math.hypot(gx - rx, gy - ry) < 2.2);
      expect(couvert(x, y, masses(6)) || sol).toBe(true);
    }
  });

  test("the glades stay bare at every tier: no mass stands over one, and the south ones lie inside the painted ground", () => {
    const centres = [
      [-8.9, -12.1],
      [25.7, 34.6],
      [34.6, 26.8],
    ] as const;
    expect(centres.map(([gx, gy]) => dansClairiere(gx, gy))).toEqual([true, true, true]);
    for (const p of PALIERS)
      for (const m of masses(p)) {
        const [w, h] = [168 * m.echelle, 144 * m.echelle];
        const sur = [
          [0, 0],
          [0, 0.45],
          [-0.2, 0.45],
          [0.2, 0.45],
        ].map(([dx = 0, dy = 0]) => dansClairiere(...grille(m.x + dx * w, m.y - dy * h)));
        expect(sur).toEqual([false, false, false, false]);
      }
    // Short of the grey (36.8) at every angle and radius a south glade can reach.
    const dehors = Array.from({ length: 72 * 48 }, (_, k) => {
      const [t, r] = [(k % 72) * 5 * (Math.PI / 180), 0.05 * Math.floor(k / 72)];
      return [25.7 + r * Math.cos(t), 34.6 + r * Math.sin(t)] as const;
    }).filter(([gx, gy]) => dansClairiere(gx, gy) && Math.max(gx, gy) >= 36.8);
    expect(dehors).toEqual([]);
  });

  test("the lone clusters of the meadow never share an asset within one viewport, whatever the tier", () => {
    for (const p of PALIERS) {
      const ms = masses(p).filter((m) => !lisiere(m) && !m.nom.startsWith("bord_"));
      const seuls = ms.filter((a) =>
        ms.every((b) => b === a || ((a.x - b.x) / 128) ** 2 + ((a.y - b.y) / 56) ** 2 >= 3),
      );
      for (const [i, a] of seuls.entries())
        for (const b of seuls.slice(i + 1))
          expect([
            a.nom === b.nom && Math.abs(a.x - b.x) < 720 && Math.abs(a.y - b.y) < 1600,
            p,
          ]).toEqual([false, p]);
    }
  });

  test("the south lisiere is not mirrored about gx = gy: a foot and its mirror rarely wear the same asset and size", () => {
    const ms = sud(masses(12));
    const cell = (m: Masse) => grille(m.x, m.y).map((v) => Math.round(v / 3));
    const noms = new Map(ms.map((m) => [cell(m).join(","), `${m.nom}${m.echelle}`]));
    const miroirs = ms.filter((m) => {
      const [a = 0, b = 0] = cell(m);
      return noms.get(`${b},${a}`) === `${m.nom}${m.echelle}`;
    });
    expect(miroirs.length / ms.length).toBeLessThan(0.4);
  });

  test("the painted ground holds no lattice block, at any tier", () => {
    for (const p of PALIERS) {
      const { visible } = etatCarte(p, false);
      const vu = (gx: number, gy: number) => visible[gy]?.[gx] === true;
      expect(champsDe(vu, true).blocs).toEqual([]);
    }
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
  const bord = (
    g: readonly [number, number],
    plots: readonly (readonly [number, number, number, number])[] = Object.values(PARCELLES),
  ) =>
    Math.min(
      ...plots.map(([x0, y0, x1, y1]) =>
        Math.hypot(Math.max(x0 - g[0], 0, g[0] - x1), Math.max(y0 - g[1], 0, g[1] - y1)),
      ),
    );

  test("the cart alone is left off the island, on the road's edge beside the wheat plot, mirrored", () => {
    expect(hors.map((a) => a.nom)).toEqual(["charrette_1"]);
    const a = hors[0];
    expect(a?.flip).toBe(true);
    const g = a?.pied ?? [0, 0];
    expect(bord(g, [PARCELLES.ble])).toBeLessThanOrEqual(1);
    for (const [rx, ry] of SORTIES.flatMap((s) => s.branches.flat()))
      expect(Math.hypot(g[0] - rx, g[1] - ry)).toBeGreaterThan(0.6); // on the road's edge, not on it
    // Its twin on the island is 6 cells or more away.
    for (const b of ACCESSOIRES.filter((o) => o.nom === a?.nom && !o.hors))
      expect(
        Math.max(...[0, 1].map((k) => Math.abs((b.case[k] ?? 0) - (a?.case[k] ?? 0)))),
      ).toBeGreaterThanOrEqual(6);
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
