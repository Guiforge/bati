jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

import { massesForet } from "@/components/village/iso/alentours";
import { COTE, etatCarte, LARGEUR } from "@/components/village/iso/carteDemo";

/** Loupe BC r5: rule 3 on the north edge, as `loupe_checks.py dump-check --tiles=-12,-12,6,8` reads it at p06. */
const grille = (x: number, y: number) => {
  const u = ((x - LARGEUR / 2) * 2) / COTE;
  const v = (y * 4) / COTE;
  return [Math.floor((u + v) / 2), Math.floor((v - u) / 2)] as const;
};

describe("north edge, r5", () => {
  test("the tile box holds at most one asset repeated with the same mirror", () => {
    const { visible } = etatCarte(6, false);
    const masses = massesForet(visible, []).filter((m) => {
      const [i, j] = grille(m.x, m.y);
      return i >= -12 && i <= 6 && j >= -12 && j <= 8;
    });
    const paires = masses.flatMap((a, k) =>
      masses.slice(k + 1).filter((b) => a.nom === b.nom && a.flip === b.flip),
    );
    expect(masses.length).toBeGreaterThan(5);
    expect(paires.length).toBeLessThanOrEqual(1); // 9 masses, 4 assets, 8 places: one repeat is what the lattice cannot avoid
  });
});
