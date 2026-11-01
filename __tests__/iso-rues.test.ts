jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

import { ecranXY } from "@/components/village/iso/carteDemo";
import { emplacements, sol, TAILLE } from "@/components/village/iso/isoLayout";
import {
  ARETES,
  classeDe,
  LARGEURS,
  noeud,
  PLACE,
  SENTIERS,
  SORTIES,
} from "@/components/village/iso/rues";
import { blob } from "@/components/village/iso/solOrganique";
import { densite } from "@/components/village/iso/solVarie";
import { buildingCodes } from "@/db/schema";

const estRue = (x: number, y: number) => sol[y]?.[x] === "chemin" || sol[y]?.[x] === "pont";
const points = (d: string) =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as const,
  );
const cases = Array.from(
  { length: TAILLE * TAILLE },
  (_, i) => [i % TAILLE, Math.floor(i / TAILLE)] as const,
);

describe("the streets (L6-T18)", () => {
  test("the street edges join every street cell into one network", () => {
    const rues = cases.filter(([x, y]) => estRue(x, y));
    const voisins = new Map<string, string[]>();
    for (const a of ARETES) {
      const [p, q] = [a.de.join(","), a.vers.join(",")];
      voisins.set(p, [...(voisins.get(p) ?? []), q]);
      voisins.set(q, [...(voisins.get(q) ?? []), p]);
    }
    const vus = new Set<string>();
    const pile = [rues[0]?.join(",") ?? ""];
    for (let c = pile.pop(); c !== undefined; c = pile.pop()) {
      if (vus.has(c)) continue;
      vus.add(c);
      pile.push(...(voisins.get(c) ?? []));
    }
    expect(vus.size).toBe(rues.length);
  });

  test("the rank climbs towards the square and the bands widen with it", () => {
    expect(classeDe([12, 9])).toBe(2);
    expect(classeDe([16, 10])).toBe(1);
    expect(classeDe([0, 10])).toBe(0);
    expect(LARGEURS[0]).toBeLessThan(LARGEURS[1]);
    expect(LARGEURS[1]).toBeLessThan(LARGEURS[2]);
    expect(new Set(ARETES.map((a) => a.classe))).toEqual(new Set([0, 1, 2]));
  });

  test("every building reaches a street: its door is on its footprint and a footpath ends on a street cell", () => {
    for (const code of buildingCodes) {
      expect(emplacements[code].acces.length).toBeGreaterThan(0);
      if (code === "campfire") continue;
      const s = SENTIERS.find((e) => e.code === code);
      expect(s).toBeDefined();
      if (!s) continue;
      const [x, y] = emplacements[code].coin;
      const [w, d] = emplacements[code].emprise;
      expect(s.porte[0]).toBeGreaterThanOrEqual(x);
      expect(s.porte[0]).toBeLessThanOrEqual(x + w);
      expect(s.porte[1]).toBeGreaterThanOrEqual(y);
      expect(s.porte[1]).toBeLessThanOrEqual(y + d);
      expect(estRue(...s.fin)).toBe(true);
      // The footpath is short: the street is within three cells of the door.
      expect(Math.hypot(s.fin[0] + 0.5 - s.porte[0], s.fin[1] + 0.5 - s.porte[1])).toBeLessThan(3);
    }
  });

  // T22: a band is a filled outline (no stroke, so no ink and no dashes), its width wavers.
  test("a street is not a ruler line: its edges bow and its width wavers", () => {
    expect(ARETES.every((a) => /^(M[-\d.,L]+Z)+$/.test(a.d))).toBe(true);
    expect(new Set(ARETES.map((a) => a.d)).size).toBe(ARETES.length);
    // Two straight edges of one rank and one direction differ in shape, not just in place.
    const largeur = (d: string) => {
      const xs = points(d).map(([x]) => x);
      return Math.max(...xs) - Math.min(...xs);
    };
    const meme = ARETES.filter((a) => a.classe === 0 && a.de[1] === a.vers[1]);
    expect(new Set(meme.map((a) => Math.round(largeur(a.d)))).size).toBeGreaterThan(2);
  });

  // FIN-DIS: the plan draws long straight streets (the main road, the wall walk, the quarter
  // streets); on the map no five street cells in a line keep their nodes on one ruled line.
  test("five street cells in a line never read straight: their nodes sway off the axis", () => {
    const droites: string[] = [];
    for (const [gx, gy] of cases)
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as const) {
        const run = [0, 1, 2, 3, 4].map((k) => [gx + dx * k, gy + dy * k] as const);
        if (!run.every(([x, y]) => estRue(x, y))) continue;
        // Across the axis: gy for a row, gx for a column.
        const travers = run.map((c) => noeud(c)[dx === 1 ? 1 : 0]);
        if (Math.max(...travers) - Math.min(...travers) < 0.15) droites.push(`${gx},${gy} ${dx}`);
      }
    expect(droites).toEqual([]);
  });

  test("the roads leave by the grand-route's two ends and the south gate", () => {
    expect(SORTIES.map((s) => s.fin)).toEqual([
      [0, 10],
      [TAILLE - 1, 10],
      [12, TAILLE - 1],
    ]);
  });
});

describe("the ground has no cell outline (L6-T18)", () => {
  const diamant = (gx: number, gy: number) => [
    ecranXY([gx, gy]),
    ecranXY([gx + 1, gy]),
    ecranXY([gx + 1, gy + 1]),
    ecranXY([gx, gy + 1]),
  ];

  test("a blob is a curve, not a cell's four corners, and it leaves the diamond", () => {
    const d = blob(10, 5, 0.82);
    expect(d).toMatch(/^M[-\d.,]+(Q[-\d.,]+ [-\d.,]+)+Z$/);
    expect(d).not.toContain("L");
    const [a, b, c, e] = diamant(10, 5);
    const dedans = ([x, y]: readonly [number, number]) => {
      const cx = ((a?.[0] ?? 0) + (c?.[0] ?? 0)) / 2;
      const cy = ((b?.[1] ?? 0) + (e?.[1] ?? 0)) / 2;
      return (
        Math.abs(x - cx) / ((b?.[0] ?? 0) - cx) + Math.abs(y - cy) / ((c?.[1] ?? 0) - cy) <= 1.0001
      );
    };
    expect(points(d).some((p) => !dedans(p))).toBe(true);
    expect(points(d).some((p) => dedans(p))).toBe(true);
    expect(blob(10, 5, 0.82)).toBe(d);
    expect(blob(11, 5, 0.82)).not.toBe(d);
  });

  test("the square is a blob too", () => {
    expect(PLACE).toContain("Q");
  });

  test("decals thin out from the middle of the grid towards the rim", () => {
    expect(densite(9, 9)).toBeCloseTo(1, 1);
    expect(densite(0, 0)).toBeLessThan(0.5);
    expect(densite(0, 9)).toBeLessThan(densite(5, 9));
    expect(densite(5, 9)).toBeLessThan(densite(9, 9));
  });
});
