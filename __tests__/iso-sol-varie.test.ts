import { emplacements, paliers, sol, TAILLE } from "@/components/village/iso/isoLayout";
import { biomes, GENRES_DECAL } from "@/components/village/iso/isoSpec";
import {
  bordsDe,
  bruit,
  choisir,
  dessinDecal,
  detail,
  detailCase,
  hasard,
  SOUS_BATIMENT,
} from "@/components/village/iso/solVarie";
import { buildingCodes } from "@/db/schema";

const V = biomes.defaut.variantes;
const cellules = Array.from(
  { length: TAILLE * TAILLE },
  (_, i) => [i % TAILLE, Math.floor(i / TAILLE)] as const,
);
const d = (x: number, y: number) => detail("defaut", x, y);
const toutVisible = Array.from({ length: TAILLE }, () => Array<boolean>(TAILLE).fill(true));

describe("the varied ground (solVarie.ts)", () => {
  test("the table is deterministic and follows the seed", () => {
    expect(cellules.map(([x, y]) => d(x, y))).toEqual(
      cellules.map(([x, y]) => detailCase(x, y, V)),
    );
    const autre = { ...V, graine: V.graine + 1 };
    const seeds = [V, autre, { ...V, graine: V.graine + 2 }];
    const teintes = seeds.map((v) => cellules.map(([x, y]) => detailCase(x, y, v).teinte));
    // Two seeds disagree on a good share of cells, and the same seed twice never.
    expect(teintes[0]).toEqual(cellules.map(([x, y]) => detailCase(x, y, V).teinte));
    for (const t of [teintes[1], teintes[2]]) {
      const diff = t?.filter((x, i) => x !== teintes[0]?.[i]).length ?? 0;
      expect(diff).toBeGreaterThan(TAILLE * TAILLE * 0.3);
    }
  });

  test("the lawn forms soft patches: neighbours mostly agree, distant cells do not", () => {
    const rang = (x: number, y: number) => V.herbe.findIndex((e) => e.couleur === d(x, y).teinte);
    const paires = cellules.filter(
      ([x, y]) => sol[y]?.[x] === "herbe" && sol[y]?.[x + 1] === "herbe",
    );
    const ecart = paires.map(([x, y]) => Math.abs(rang(x + 1, y) - rang(x, y)));
    const meme = ecart.filter((e) => e === 0).length / ecart.length;
    // Seven lawn tones now (L6-T10), so a neighbouring patch lies one or two steps off.
    const voisin = ecart.filter((e) => e <= 2).length / ecart.length;
    // Same variant for about half of the neighbours, one or two steps off for nearly all of the rest.
    expect(meme).toBeGreaterThan(0.45);
    expect(voisin).toBeGreaterThan(0.9);
    // Far apart (6 cells) the field has forgotten: they agree far less than neighbours do.
    const loin = cellules.filter(
      ([x, y]) => sol[y]?.[x] === "herbe" && sol[y]?.[x + 6] === "herbe",
    );
    const memeLoin = loin.filter(([x, y]) => rang(x + 6, y) === rang(x, y)).length / loin.length;
    expect(memeLoin).toBeLessThan(meme - 0.1);
    // Still every variant, grass and path, comes up.
    const teintes = (type: string) =>
      new Set(cellules.filter(([x, y]) => sol[y]?.[x] === type).map(([x, y]) => d(x, y).teinte));
    expect(teintes("herbe").size).toBe(V.herbe.length);
    expect(teintes("chemin").size).toBeGreaterThanOrEqual(2);
  });

  test("the noise is smooth and bounded", () => {
    for (const [x, y] of cellules) {
      const n = bruit(x, y, V.tache, V.graine);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      expect(Math.abs(bruit(x + 1, y, V.tache, V.graine) - n)).toBeLessThan(0.5 / V.tache + 0.2);
    }
  });

  test("weights are followed", () => {
    const n = 20000;
    const compte = new Map<string, number>();
    for (let i = 0; i < n; i++) {
      const c = choisir(V.herbe, hasard(i, i * 3, 1, V.graine)).couleur;
      compte.set(c, (compte.get(c) ?? 0) + 1);
    }
    const total = V.herbe.reduce((s, e) => s + e.poids, 0);
    for (const e of V.herbe)
      expect(Math.abs((compte.get(e.couleur) ?? 0) / n - e.poids / total)).toBeLessThan(0.015);
  });

  test("decals are rare, denser at the rim and the path, and never under a building or on water", () => {
    const avec = cellules.filter(([x, y]) => d(x, y).decal !== null);
    const part = avec.length / cellules.length;
    // Rates 0.15 inside, 0.24 at the rim, on cells that can hold one (about half the grid).
    expect(part).toBeGreaterThan(0.03);
    expect(part).toBeLessThan(0.2);
    for (const [x, y] of avec) {
      expect(["herbe", "chemin"]).toContain(sol[y]?.[x]);
      expect(SOUS_BATIMENT.has(y * TAILLE + x)).toBe(false);
    }
    // No building's footprint holds one, whatever its stage.
    for (const code of buildingCodes)
      for (const [x, y] of emplacements[code].cases) expect(d(x, y).decal).toBeNull();
    const taux = (liste: readonly (readonly [number, number])[]) =>
      liste.filter(([x, y]) => d(x, y).decal).length / liste.length;
    const herbe = cellules.filter(
      ([x, y]) => sol[y]?.[x] === "herbe" && !SOUS_BATIMENT.has(y * TAILLE + x),
    );
    const bord = herbe.filter(([x, y]) => d(x, y).galets.length > 0 || paliers[y]?.[x] === null);
    const loin = herbe.filter(([x, y]) => !bord.some(([a, b]) => a === x && b === y));
    expect(taux(bord)).toBeGreaterThan(taux(loin));
  });

  test("a decal on the path is a stone or a leaf, a tuft or a flower stands upright, the pose is mid-cell", () => {
    const poses = cellules.flatMap(([x, y]) => {
      const dc = d(x, y).decal;
      return dc ? [{ dc, chemin: sol[y]?.[x] === "chemin" }] : [];
    });
    expect(poses.filter((p) => p.chemin).length).toBeGreaterThan(0);
    expect(poses.filter((p) => p.chemin && !["caillou", "feuille"].includes(p.dc.genre))).toEqual(
      [],
    );
    expect(
      poses.filter(
        (p) => ["touffe", "fleur", "buisson", "herbeHaute"].includes(p.dc.genre) && p.dc.rot !== 0,
      ),
    ).toEqual([]);
    expect(
      poses.filter((p) => p.dc.a < 0.3 || p.dc.a > 0.7 || p.dc.b < 0.3 || p.dc.b > 0.7),
    ).toEqual([]);
  });

  test("a decal's pose is in its path: seven kinds, each a closed polygon set, no transform", () => {
    expect(GENRES_DECAL).toHaveLength(7);
    for (const g of GENRES_DECAL) {
      const dd = dessinDecal(g, 100, 50, 20);
      expect(dd).toMatch(/^M[-\d.,L]+Z/);
      expect(dd).not.toMatch(/[A-KN-Za-z]\s*\(/);
    }
    expect(dessinDecal("touffe", 10, 20, 0).startsWith("M7.8,20L")).toBe(true);
  });

  test("pebbles stand on grass cells that touch the path only", () => {
    const avec = cellules.filter(([x, y]) => d(x, y).galets.length > 0);
    expect(avec.length).toBeGreaterThan(5);
    for (const [x, y] of avec) {
      expect(sol[y]?.[x]).toBe("herbe");
      const voisins = [sol[y]?.[x - 1], sol[y]?.[x + 1], sol[y - 1]?.[x], sol[y + 1]?.[x]];
      expect(voisins.some((s) => s === "chemin" || s === "pont")).toBe(true);
    }
  });

  test("the rim darkens the island's land cells and the grass under a decor image, once per island", () => {
    const petite = toutVisible.map((l, gy) =>
      l.map((_, gx) => gx >= 5 && gx < 12 && gy >= 5 && gy < 12),
    );
    const bords = bordsDe(petite);
    const b = (x: number, y: number) => bords[y * TAILLE + x];
    expect(b(5, 6)).toBe(1);
    expect(b(6, 6)).toBe(2);
    expect(b(7, 8)).toBe(3);
    expect(b(8, 8)).toBe(0);
    // Off the island, nothing; a decor cell on the rim darkens like the grass beside it.
    expect(b(2, 2)).toBe(0);
    // A decor image's cell on the rim (a tree at the grid's edge) darkens like the grass beside it.
    const decors = cellules.filter(([x, y]) => sol[y]?.[x] === "arbre" && x === 0);
    expect(decors.length).toBeGreaterThan(0);
    expect(decors.filter(([x, y]) => bordsDe(toutVisible)[y * TAILLE + x] !== 1)).toEqual([]);
    // A gradient over three cells, fading toward the inside.
    const [o1 = 0, o2 = 0, o3 = 0] = V.assombri.opacites;
    expect(o1).toBeGreaterThan(o2);
    expect(o2).toBeGreaterThan(o3);
    expect(o3).toBeGreaterThan(0);
    expect(bordsDe(toutVisible)[0]).toBe(1);
    // T22: a stream cell darkens with the rim like the lawn around it (the dusk is drawn over the
    // stream): the canal's head at (2,0) is on the rim, the cell beside it too.
    expect(sol[0]?.[2]).toBe("eau");
    expect([bordsDe(toutVisible)[2], bordsDe(toutVisible)[TAILLE + 2]]).toEqual([1, 2]);
  });
});
