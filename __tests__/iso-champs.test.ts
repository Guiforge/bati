import assert from "node:assert/strict";
import { ecranXY, etatCarte, HAUTEUR, LARGEUR } from "@/components/village/iso/carteDemo";
import { champsDe, EAU_GX, tuilesChamps } from "@/components/village/iso/champs";
import { champsDuPlan } from "@/components/village/iso/isoLayout";
import { chaineEau } from "@/components/village/iso/riviere";
import { SORTIES } from "@/components/village/iso/rues";
import { rawColors } from "@/constants/rawColors";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const vuDe = (palier: Parameters<typeof etatCarte>[0]) => {
  const { visible } = etatCarte(palier, false);
  return (gx: number, gy: number) => visible[gy]?.[gx] === true;
};

describe("fields and hedges at the village's contact (FIN-CAR)", () => {
  test.each([1, 6, 12] as const)(
    "palier %i has fields, furrows and hedges, the same on each call",
    (p) => {
      const c = champsDe(vuDe(p));
      expect(c.nombre).toBeGreaterThan(2);
      expect(c.sillons).not.toBe("");
      expect(c.haies).not.toBe("");
      expect(c.teintes.some((d) => d !== "")).toBe(true);
      expect(champsDe(vuDe(p))).toEqual(c);
    },
  );

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a walk over every block and every cell of it
  test("a field stands inside the ground tiles' box, off the island and within 3 cells of it", () => {
    for (const p of [1, 6, 12] as const) {
      const vu = vuDe(p);
      const c = champsDe(vu);
      expect(c.blocs).toHaveLength(c.nombre);
      for (const [gx, gy, w, h] of c.blocs) {
        let proche = false;
        for (let x = gx; x < gx + w; x++)
          for (let y = gy; y < gy + h; y++) {
            expect(vu(x, y)).toBe(false);
            for (let dx = -3; dx <= 3; dx++)
              for (let dy = -3; dy <= 3; dy++) if (vu(x + dx, y + dy)) proche = true;
          }
        expect(proche).toBe(true);
        for (const [x, y] of [ecranXY([gx, gy]), ecranXY([gx + w, gy + h])]) {
          expect(x).toBeGreaterThan(0);
          expect(x).toBeLessThan(LARGEUR);
          expect(y).toBeGreaterThan(0);
          expect(y).toBeLessThan(HAUTEUR);
        }
      }
    }
  });

  test("the fields' tints are colours of rawColors and none is violet", () => {
    for (const k of ["isoChampA", "isoChampB", "isoChampOcre", "isoHaie", "isoForetSol"] as const) {
      const h = rawColors[k];
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
      assert(r !== undefined && g !== undefined && b !== undefined);
      // Violet leans blue and red over green.
      expect(g).toBeGreaterThanOrEqual(Math.min(r, b));
    }
  });
});

describe("over the painted ground, every tier", () => {
  test("no field sprite stands on a river cell and the fields only grow", () => {
    const eau = new Set(chaineEau().map((c) => c.join(",")));
    let avant = new Set<string>();
    for (const p of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const) {
      const vu = vuDe(p);
      const ici = new Set(tuilesChamps(vu).map((x) => x.case.join(",")));
      expect([...ici].filter((c) => eau.has(c))).toEqual([]);
      expect([...avant].filter((c) => !ici.has(c))).toEqual([]);
      expect(champsDe(vu, true).blocs).toEqual([]);
      avant = ici;
    }
    expect(avant.size).toBeGreaterThan(0);
  });
});

describe("the roads leave the village (FIN-CAR, FIN-DIS)", () => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one assertion list over the three exits, clearer whole
  test("three exits, west, east and south, the west and east ones forking into a second track, the south one a single line", () => {
    expect(SORTIES).toHaveLength(3);
    expect(SORTIES.map((s) => s.fin.join(","))).toEqual(["0,10", "19,10", "12,19"]);
    for (const s of SORTIES) {
      expect(s.branches).toHaveLength(s.fin[0] === 12 ? 1 : 2);
      for (const b of s.branches) expect(b.length).toBeGreaterThan(3);
      expect(s.d).not.toBe("");
      // It leaves the grid: some point lies past the island's cells.
      const hors = s.branches
        .flat()
        .some(([gx, gy]) => (s.fin[0] === 0 ? gx < -2 : s.fin[0] === 19 ? gx > 21 : gy > 21));
      expect(hors).toBe(true);
      // And it stays inside the map's box, which the ground tiles cover (the south road runs on out of
      // the frame, to gx + gy = 88, 2480 px at p06: iso-route-sud.test.tsx).
      const pts = s.branches.flat();
      for (const [gx, gy] of pts)
        expect(gx + gy).toBeLessThanOrEqual(s.fin[0] === 12 ? 88.001 : 72.001);
      for (const [gx, gy] of s.fin[0] === 12 ? [] : pts) {
        const [x, y] = ecranXY([gx, gy]);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(LARGEUR);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(HAUTEUR);
      }
    }
  });

  test("no field stands within a cell of a road that leaves", () => {
    const c = champsDe(vuDe(12));
    expect(c.nombre).toBeGreaterThan(0);
    for (const [gx, gy, w, h] of c.blocs)
      for (const [x, y] of SORTIES.flatMap((s) => s.branches.flat()))
        expect(x > gx - 1 && x < gx + w + 1 && y > gy - 1 && y < gy + h + 1).toBe(false);
  });

  test("F4: the plan's fields are painted tiles, the hedge on the back row, and never go", () => {
    let avant = new Set<string>();
    for (const p of [1, 6, 12] as const) {
      const vu = vuDe(p);
      const t = tuilesChamps(vu);
      const ici = new Set(t.map((x) => x.case.join(",")));
      expect([...avant].filter((c) => !ici.has(c))).toEqual([]);
      avant = ici;
      // With the painted tiles on, nothing is drawn (A7 H4-04: the off-island blocks are tiles too), the blocks stay listed.
      const peint = champsDe(vu, true);
      expect(peint.blocs).toEqual([]);
      expect(peint.teintes.join("")).toBe("");
    }
    const t = tuilesChamps(vuDe(12));
    // Over the painted ground the fields on the river or against the south road are not kept.
    const gardes = champsDuPlan.filter(({ coin }) => coin[0] >= EAU_GX[1]);
    expect(t).toHaveLength(gardes.reduce((n, f) => n + f.taille[0] * f.taille[1], 0));
    for (const { coin, taille } of gardes) {
      const champ = t.filter(
        (x) =>
          x.case[0] >= coin[0] &&
          x.case[0] < coin[0] + taille[0] &&
          x.case[1] >= coin[1] &&
          x.case[1] < coin[1] + taille[1],
      );
      expect(new Set(champ.map((x) => x.culture)).size).toBe(1);
      for (const x of champ) expect(x.haie).toBe(x.case[1] === coin[1]);
    }
    // Back to front, each on its cell's bottom corner.
    const rangs = t.map((x) => x.case[0] + x.case[1]);
    expect(rangs).toEqual(rangs.toSorted((a, b) => a - b));
    for (const x of t)
      expect([x.rect.x + 32, x.rect.y + 41]).toEqual(ecranXY([x.case[0] + 1, x.case[1] + 1]));
  });
});
