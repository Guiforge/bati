jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

import { emplacements, paliers, sol } from "@/components/village/iso/isoLayout";
import { batiments, type Stade } from "@/components/village/iso/isoSpec";
import { type Construction, construire } from "@/components/village/iso/quartiers";
import { buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const satisfies readonly VillageTier[];
const GRAINES = [0, 1, 7, 42];

/** Every building whose tier is reached, at the stage `stade`. */
const etat = (palier: VillageTier, graine: number, stade: Stade = "solid") => ({
  palier,
  graine,
  montres: buildingCodes
    .filter((c) => (batiments[c].tier ?? 99) <= palier)
    .map((code) => ({ code, stade })),
});
const cle = (c: Construction) => `${c.case[0]},${c.case[1]}`;

describe("quartiers", () => {
  test("same state, same pieces", () => {
    expect(construire(etat(8, 3))).toEqual(construire(etat(8, 3)));
  });

  test("nothing recedes over the 12 tiers, whatever the seed", () => {
    for (const g of GRAINES)
      for (const t of TIERS.slice(1)) {
        const avant = new Map(construire(etat((t - 1) as VillageTier, g)).map((c) => [cle(c), c]));
        const apres = new Map(construire(etat(t, g)).map((c) => [cle(c), c]));
        for (const [k, c] of avant) {
          const d = apres.get(k);
          expect(d?.famille).toBe(c.famille);
          expect(d?.taille ?? 0).toBeGreaterThanOrEqual(c.taille);
        }
      }
  });

  test("an anchor taken away between N and N+1 moves and shrinks nothing", () => {
    for (const g of GRAINES)
      for (const t of TIERS.slice(1)) {
        const avant = construire(etat((t - 1) as VillageTier, g));
        const sans = {
          ...etat(t, g),
          montres: etat(t, g).montres.filter((m) => m.code !== "forge" && m.code !== "tent"),
        };
        const apres = new Map(construire(sans).map((c) => [cle(c), c]));
        for (const c of avant) {
          expect(apres.get(cle(c))?.taille ?? 0).toBeGreaterThanOrEqual(c.taille);
          expect(apres.get(cle(c))?.ancre).toBe(c.ancre);
        }
      }
  });

  test("a stage that falls never shrinks a piece", () => {
    for (const t of TIERS) {
      const haut = construire(etat(t, 1, "grand"));
      const bas = new Map(construire(etat(t, 1, "rough")).map((c) => [cle(c), c]));
      expect(bas.size).toBe(haut.length);
      for (const c of haut) expect(bas.get(cle(c))?.taille).toBe(c.taille);
    }
  });

  test("no collision: free grass, no footprint, one piece per cell", () => {
    const pris = new Set(
      Object.values(emplacements).flatMap((e) => e.cases.map((c) => `${c[0]},${c[1]}`)),
    );
    for (const g of GRAINES) {
      const vus = new Set<string>();
      for (const c of construire(etat(12, g))) {
        expect(sol[c.case[1]]?.[c.case[0]]).toBe("herbe");
        expect(pris.has(cle(c))).toBe(false);
        expect(vus.has(cle(c))).toBe(false);
        vus.add(cle(c));
      }
    }
  });

  test("a piece stands on the island of its tier", () => {
    for (const t of TIERS)
      for (const c of construire(etat(t, 2)))
        expect(paliers[c.case[1]]?.[c.case[0]] ?? 99).toBeLessThanOrEqual(t);
  });

  test("a wall section is on the island's edge when it is built", () => {
    for (const g of GRAINES)
      for (const c of construire(etat(12, g)).filter((x) => x.genre === "rempart")) {
        const [gx, gy] = c.case;
        const bord = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx = 0, dy = 0]) => {
          const p = paliers[gy + dy]?.[gx + dx] ?? null;
          return p === null || p > c.nee;
        });
        expect(bord).toBe(true);
      }
  });

  test("density per tier", () => {
    const n = (t: VillageTier) => construire(etat(t, 5)).length;
    expect(n(1)).toBeGreaterThanOrEqual(4);
    expect(n(1)).toBeLessThanOrEqual(8);
    expect(n(6)).toBeGreaterThanOrEqual(20);
    expect(n(6)).toBeLessThanOrEqual(30);
    expect(n(12)).toBeGreaterThanOrEqual(42);
    expect(n(12)).toBeLessThanOrEqual(58);
  });
});
