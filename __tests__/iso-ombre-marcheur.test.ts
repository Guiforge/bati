import { ecartGrille, ombreLevee, ombreMarcheur } from "@/components/village/iso/ombreMarcheur";

describe("a villager's shadow stays on the ground", () => {
  const p = { x: 5.4, y: 7.1 };

  test("its place depends on the grid only, never on the height", () => {
    const sol = ecartGrille(p, 5, 7, 48);
    for (const levee of [0, 1, 2.5, 5, 8, 40]) {
      const o = ombreMarcheur(p, 5, 7, 48, levee);
      expect([o.dx, o.dy]).toEqual([sol.dx, sol.dy]);
    }
  });

  test("a body that rises leaves the shadow in place, smaller and fainter, two notches at most", () => {
    expect(ombreLevee(0)).toEqual({ echelle: 1, opacite: 1 });
    const un = ombreLevee(3);
    const deux = ombreLevee(8);
    expect(un.echelle).toBeLessThan(1);
    expect(deux.echelle).toBeLessThan(un.echelle);
    expect(deux.opacite).toBeLessThan(un.opacite);
    expect(ombreLevee(100)).toEqual(deux);
    expect(deux.echelle).toBeGreaterThan(0.7);
  });
});
