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
  test("the tile box holds at most two assets repeated with the same mirror", () => {
    const { visible } = etatCarte(6, false);
    const masses = massesForet(visible, []).filter((m) => {
      const [i, j] = grille(m.x, m.y);
      return i >= -12 && i <= 6 && j >= -12 && j <= 8;
    });
    const paires = masses.flatMap((a, k) =>
      masses.slice(k + 1).filter((b) => a.nom === b.nom && a.flip === b.flip),
    );
    expect(masses.length).toBeGreaterThanOrEqual(6); // r6: the lone clumps that cannot take an asset are merged into the edge
    expect(paires.length).toBeLessThanOrEqual(2); // 6 masses, 4 assets: r6 gave the clumps left alone their own asset, which costs one repeat more in this box
  });
});

describe("isolated clumps, r6", () => {
  test("no two clumps standing alone on the meadow share an asset within one screen", () => {
    for (const palier of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const) {
      const { visible } = etatCarte(palier, false);
      const seuls = massesForet(visible, []).filter((m) => m.isole);
      expect(seuls.length).toBeGreaterThan(palier === 6 ? 2 : 0);
      const jumeaux = seuls.flatMap((a, k) =>
        seuls
          .slice(k + 1)
          .filter(
            (b) => a.nom === b.nom && Math.abs(a.x - b.x) < 720 && Math.abs(a.y - b.y) < 1600,
          ),
      );
      expect(jumeaux).toEqual([]);
    }
  });

  // Round 6 judge: p06 showed tree_melangee twice (cells -6,-5 and -4,4, mirrored) and tree_dense twice
  // ((-1,-8) and (-3,-1)). The first of each pair had no `isole` flag, as the lattice counted neighbours
  // that were removed afterwards. Read from what is drawn: at most three drawn masses around it.
  test("what the eye reads as a standalone clump at p06 never repeats an asset, mirror or not", () => {
    const { visible } = etatCarte(6, false);
    const tout = massesForet(visible, []);
    const vue = (m: { x: number }) => Math.abs(m.x - LARGEUR / 2 - 24) <= 360;
    const seuls = tout.filter(
      (m) =>
        vue(m) &&
        !m.nom.startsWith("bord") &&
        Math.max(...grille(m.x, m.y)) <= 33 && // the south lisiere has its own cycle
        m.echelle <= 1.2 &&
        tout.filter((o) => o !== m && ((o.x - m.x) / 128) ** 2 + ((o.y - m.y) / 56) ** 2 < 3)
          .length <= 3,
    );
    expect(seuls.length).toBeGreaterThan(2);
    // Four assets: a fifth clump on the screen is the only repeat tolerated.
    expect(new Set(seuls.map((m) => m.nom)).size).toBeGreaterThanOrEqual(Math.min(seuls.length, 4));
    // The four masses of the judge's pairs, by cell: no asset twice among them.
    const noms = ["-6,-5", "-4,4", "-1,-8", "-3,-1"].flatMap((c) =>
      tout.filter((m) => grille(m.x, m.y).join(",") === c).map((m) => m.nom),
    );
    expect(new Set(noms).size).toBe(noms.length);
  });

  // Round 6 judge, p03 and p04: melangee 239 dp apart (cells 1,0 and -2,7), bouleaux 580 apart (-1,-4 and
  // 11,23). The ring draws other masses at the low tiers, so the lone clumps are read per tier.
  test("the lone clumps of tiers 3 and 4 never wear one asset within 300 dp", () => {
    for (const palier of [3, 4] as const) {
      const { visible } = etatCarte(palier, false);
      const anneau = massesForet(visible, []).filter(
        (m) => !m.nom.startsWith("bord") && Math.max(...grille(m.x, m.y)) <= 33,
      );
      const seuls = anneau.filter(
        (m) =>
          Math.abs(m.x - LARGEUR / 2 - 24) <= 360 &&
          m.echelle <= 1.2 &&
          anneau.filter((o) => o !== m && ((o.x - m.x) / 128) ** 2 + ((o.y - m.y) / 56) ** 2 < 3)
            .length <= 3,
      );
      const proches = seuls.flatMap((a, k) =>
        seuls
          .slice(k + 1)
          .filter((b) => a.nom === b.nom && Math.hypot(a.x - b.x, a.y - b.y) < 300)
          .filter((b) => Math.hypot(a.x - b.x, a.y - b.y) >= 160) // closer: two masses of one clump
          .map((b) => `${a.nom} ${grille(a.x, a.y)} / ${grille(b.x, b.y)}`),
      );
      expect(proches).toEqual([]);
      const noms = (c: string) =>
        anneau.filter((m) => grille(m.x, m.y).join(",") === c).map((m) => m.nom);
      expect([...noms("1,0"), ...noms("-2,7")].length).toBe(2);
      expect(noms("1,0")).not.toEqual(noms("-2,7"));
      expect(noms("-1,-4")).not.toEqual(noms("11,23"));
    }
  });
});
