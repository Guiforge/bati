import { cadrage, ecranXY, etatCarte } from "@/components/village/iso/carteDemo";
import { CELLULE, casesMonde, clairiere, etendue } from "@/components/village/iso/monde";
import type { VillageTier } from "@/db/village";

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const GRAINE = 20261030;
const visible = (p: number) => etatCarte(p as VillageTier, false).visible;
const monde = (p: number) => casesMonde(etendue(0.3, 411, 700), GRAINE, visible(p));
const boisee = (p: number) =>
  monde(p).filter((k) => k.genre === "foret" && k.tuile !== "clairiere");

describe("the clearing follows the tier (L6-T19)", () => {
  test("the clearing widens with the island and the forest backs off", () => {
    const largeurs = [1, 3, 6, 9, 12].map((p) => clairiere(visible(p)));
    expect(largeurs).toEqual(largeurs.toSorted((a, b) => a - b));
    expect(largeurs[0]).toBeLessThan(largeurs[4] ?? 0);
    const n = [1, 6, 12].map((p) => boisee(p).length);
    expect(n[0]).toBeGreaterThan(n[2] ?? 0);
    expect(n[1]).toBeGreaterThanOrEqual(n[2] ?? 0);
  });

  test("at no tier does an island cell stand in a forest cell, and there is always ground round it", () => {
    for (const p of [1, 2, 4, 8, 12]) {
      const bois = boisee(p);
      for (const [gy, ligne] of visible(p).entries())
        for (const [gx, on] of ligne.entries()) {
          if (!on) continue;
          const [cx, cy] = ecranXY([gx + 0.5, gy + 0.5]);
          const dedans = bois.filter(
            (c) => cx >= c.x && cx <= c.x + CELLULE && cy >= c.y && cy <= c.y + CELLULE,
          );
          expect(dedans).toEqual([]);
        }
      expect(monde(p).length).toBeGreaterThan(0);
    }
  });

  test("the starting zoom falls as the tier grows, and the hamlet is framed tight", () => {
    const zooms = [1, 2, 3, 4, 6, 8, 12].map((p) => cadrage(visible(p), 411, 700).zoom);
    expect(zooms).toEqual(zooms.toSorted((a, b) => b - a));
    expect(zooms[0]).toBeGreaterThan((zooms[6] ?? 0) * 1.5);
  });
});
