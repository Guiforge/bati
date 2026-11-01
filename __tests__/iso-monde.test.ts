import assert from "node:assert/strict";
import {
  COTE,
  cadrageComplet,
  emprise,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  ZOOM_MAX,
} from "@/components/village/iso/carteDemo";
import { biomes } from "@/components/village/iso/isoSpec";
import * as monde from "@/components/village/iso/monde";
import {
  anneauForet,
  CELLULE,
  casesMonde,
  distIle,
  ESPECES,
  eloignement,
  etendue,
  IMAGE,
  MARGE_HAUT,
  MARGE_X,
  TUILES,
} from "@/components/village/iso/monde";
import {
  bornesPan,
  carteDepuisEcran,
  ileCentree,
  ileJouable,
  type Limites,
  limitesDe,
  PART_ILE,
} from "@/components/village/iso/navigation";
import spec from "@/constants/isoSpec.json";
import { rawColors } from "@/constants/rawColors";

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const W = 390;
const H = 600;
const G = biomes.defaut.monde.graine;
const rgb = (token: keyof typeof rawColors) => {
  const h = rawColors[token];
  return [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};

/** Screens the camera runs on: a phone upright, a phone on its side, a small one. */
const ECRANS = [
  { w: 411, h: 700 },
  { w: 800, h: 360 },
  { w: 320, h: 480 },
];
// The finished island's box, as the camera sees it (relative to the map's centre).
const BOITE = emprise(etatCarte(12, false).visible);
assert(BOITE);
const ILE = ileJouable(ileCentree(BOITE, LARGEUR, HAUTEUR));
const ZMIN = 0.43;
/** IsoVillage's game floor, isoSpec.json `zoom.min` in demo units. */
const ZOOM_MIN_JEU = (spec.zoom.min * spec.cellDp) / COTE;
/** Every pan the bounds allow, at a spread of zooms, at the corners and the middle of the range. */
/** The camera's lowest zoom on a screen: the one that frames the island (useCameraIso takes the smaller of it and the game's floor), so the island never looks smaller than the frame it keeps in view. */
const zminDe = (e: { w: number; h: number }) =>
  Math.min(e.w / (ILE.x1 - ILE.x0), e.h / (ILE.y1 - ILE.y0));
function* poses(e: { w: number; h: number }) {
  const zmin = zminDe(e);
  const l: Limites = { ile: ILE, w: e.w, h: e.h, zmin, zmax: ZOOM_MAX };
  for (let z = zmin; z <= ZOOM_MAX + 1e-9; z += (ZOOM_MAX - zmin) / 12) {
    const b = bornesPan(z, l);
    for (const x of [b.xMin, (b.xMin + b.xMax) / 2, b.xMax])
      for (const y of [b.yMin, (b.yMin + b.yMax) / 2, b.yMax]) yield { z, x, y, b };
  }
}

describe("the world around the island (L6-T10, L6-T17)", () => {
  test("the same seed gives the same world, another seed another", () => {
    const z = etendue(ZMIN, W, H);
    expect(casesMonde(z, G)).toEqual(casesMonde(z, G));
    expect(casesMonde(z, G + 1)).not.toEqual(casesMonde(z, G));
  });

  test("the pan bounds keep a piece of the village in the frame, at every zoom", () => {
    for (const e of ECRANS)
      for (const { z, x, y } of poses(e)) {
        // The island's box on screen (the area's centre is the map's centre), against the frame.
        const dx = Math.min(e.w / 2, x + z * ILE.x1) - Math.max(-e.w / 2, x + z * ILE.x0);
        const dy = Math.min(e.h / 2, y + z * ILE.y1) - Math.max(-e.h / 2, y + z * ILE.y0);
        expect(dx).toBeGreaterThanOrEqual(Math.min(e.w / 4, z * (ILE.x1 - ILE.x0)) - 1e-6);
        expect(dy).toBeGreaterThanOrEqual(Math.min(e.h / 4, z * (ILE.y1 - ILE.y0)) - 1e-6);
      }
  });

  test("the island's rim can be dragged to half of the frame (PART_ILE 0.5, audit 31/10)", () => {
    expect(PART_ILE).toBe(0.5);
    const e = { w: 411, h: 700 };
    const l: Limites = { ile: ILE, w: e.w, h: e.h, zmin: ZMIN, zmax: ZOOM_MAX };
    const b = bornesPan(1, l);
    // The island's right edge at the frame's middle, then its left edge at the middle.
    expect(b.xMin + ILE.x1).toBeCloseTo(-e.w / 2 + PART_ILE * e.w, 5);
    expect(b.xMax + ILE.x0).toBeCloseTo(e.w / 2 - PART_ILE * e.w, 5);
  });

  test("the world covers the frame at the worst pan and zoom the camera allows", () => {
    for (const e of ECRANS) {
      const zone = etendue(zminDe(e), e.w, e.h);
      for (const { z, x, y } of poses(e)) {
        // The frame in map dp: the point of the map under each side of the area.
        const gauche = LARGEUR / 2 + (-e.w / 2 - x) / z;
        const droite = LARGEUR / 2 + (e.w / 2 - x) / z;
        const haut = HAUTEUR / 2 + (-e.h / 2 - y) / z;
        const bas = HAUTEUR / 2 + (e.h / 2 - y) / z;
        expect(gauche).toBeGreaterThanOrEqual(zone.x0 + CELLULE / 2 - 1e-6);
        expect(droite).toBeLessThanOrEqual(zone.x1 - CELLULE / 2 + 1e-6);
        expect(haut).toBeGreaterThanOrEqual(zone.y0 + CELLULE / 2 - 1e-6);
        expect(bas).toBeLessThanOrEqual(zone.y1 - CELLULE / 2 + 1e-6);
      }
    }
  });

  test("at the game's real zoom floor the world stays a few dozen cells (T43 round 1)", () => {
    // The floor comes from limitesDe, as useCameraIso takes it: the game's floor, never above the whole-island fit.
    const { visible } = etatCarte(12, false);
    const ile = emprise(visible);
    assert(ile);
    const { zmin } = limitesDe(
      ile,
      { largeur: LARGEUR, hauteur: HAUTEUR },
      { w: 411, h: 700 },
      { min: ZOOM_MIN_JEU, max: ZOOM_MAX, cadre: cadrageComplet(visible, 411, 700).zoom },
    );
    const cases = casesMonde(etendue(zmin, 411, 700, visible), G, visible);
    // Measured 77 at zmin 0.394. There is no sea any more (FIN-CAR), so it
    // never shows in the game at this tier; the cap sits just above the measure.
    expect(cases.length).toBeLessThanOrEqual(80);
  });

  test("the cells tile the extent: forest only, the sea is gone (FIN-CAR)", () => {
    // dev-iso's floor (ZOOM_MIN, 0.3) on the finished island: the widest camera there is.
    const zone = etendue(0.3, 411, 700);
    const cases = casesMonde(zone, G);
    expect(cases.every((k) => k.genre === "foret")).toBe(true);
    // Forest tiles are nudged inside their margin (L6-T20).
    for (const k of cases) {
      const [dx, dy] = [k.x, k.y].map((v) => Math.abs(v - Math.round(v / CELLULE) * CELLULE));
      expect(Math.max(dx ?? 0, dy ?? 0)).toBeLessThanOrEqual(MARGE_X);
    }
    // No shore, no sea left to reach: nothing exported names them.
    expect(Object.keys(monde).filter((k) => /MER|RIVE|^mer$/.test(k))).toEqual([]);
    // Cap just above the measure.
    expect(cases.length).toBeLessThan(150);
    expect(cases.length).toBeGreaterThan(40);
  });

  test("nothing stands under the island, and only the glade tile hugs its rim", () => {
    const cases = casesMonde(etendue(ZMIN, 411, 700), G);
    const pres: string[] = [];
    for (const k of cases.filter((c) => c.genre === "foret")) {
      const pts = [0, 0.5, 1].flatMap((u) =>
        [0, 0.5, 1].map((v) => distIle(k.x + u * CELLULE, k.y + v * CELLULE)),
      );
      expect(pts.every((d) => d <= 0)).toBe(false);
      if (Math.min(...pts) < 80) pres.push(k.tuile);
    }
    expect(pres.length).toBeGreaterThan(6);
    expect(new Set(pres)).toEqual(new Set(["clairiere"]));
    // The distance is signed: negative at the island's centre, positive far out.
    expect(distIle(LARGEUR / 2, HAUTEUR / 2)).toBeLessThan(0);
    expect(distIle(-300, -300)).toBeGreaterThan(300);
  });

  test("the forest is varied: three species, groves and glades, no neighbour the same", () => {
    const cases = casesMonde(etendue(ZMIN, 411, 700), G);
    const foret = cases.filter((k) => k.genre === "foret");
    // Three species or more across the tiles, each in a good few trees.
    for (const e of ESPECES)
      expect(Object.values(TUILES).reduce((s, t) => s + t.arbres[e], 0)).toBeGreaterThan(30);
    // Every drawing is used, some thick (50 trees and more), some open (under 5).
    const utilisees = new Set<string>(foret.map((k) => k.tuile));
    for (const t of Object.keys(TUILES)) expect(utilisees.has(t)).toBe(true);
    const arbres = (t: keyof typeof TUILES) =>
      Object.values(TUILES[t].arbres).reduce((s, n) => s + n, 0);
    expect(arbres("dense")).toBeGreaterThanOrEqual(50);
    expect(arbres("clairiere")).toBeLessThan(5);
    expect(TUILES.rochers.rochers).toBeGreaterThan(10);
    // No two cells side by side or one above the other show the same drawing.
    const par = new Map(foret.map((k) => [`${k.x},${k.y}`, k]));
    const memes = foret.filter((k) =>
      [
        [-CELLULE, 0],
        [0, -CELLULE],
      ].some(([dx, dy]) => par.get(`${k.x + (dx ?? 0)},${k.y + (dy ?? 0)}`)?.tuile === k.tuile),
    );
    // Only the glade ring around the island, which has one tile, may repeat.
    expect(memes.filter((k) => k.tuile !== "clairiere")).toEqual([]);
    // Both mirrors occur.
    expect(new Set(foret.map((k) => k.miroir)).size).toBe(2);
  });

  test("the tiles weigh a handful of megabytes decoded, however far the land runs", () => {
    const px = (w: number, h: number) => Math.round(w * 1.5) * Math.round(h * 1.5) * 4;
    const octets = Object.keys(TUILES).length * px(IMAGE, IMAGE);
    expect(octets / 2 ** 20).toBeLessThan(10);
    // A forest tile's margins keep its crowns inside its image.
    expect(MARGE_X).toBeGreaterThanOrEqual(30);
    expect(MARGE_HAUT).toBeGreaterThanOrEqual(
      Math.max(...Object.values(TUILES).map((t) => t.hauteur[1] ?? 0)),
    );
  });
});

describe("the coloured night (L6-T11)", () => {
  const b = biomes.defaut;
  test("the lawn is green, the earth is ochre, the water is blue, the windows are warm", () => {
    for (const v of b.variantes.herbe) {
      const [r, g, bl] = rgb(v.couleur);
      expect(g).toBeGreaterThan(r);
      expect(g).toBeGreaterThan(bl);
    }
    for (const v of [...b.variantes.chemin, ...b.variantes.terre]) {
      const [r, g, bl] = rgb(v.couleur);
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(bl);
    }
    const [r, , bl] = rgb(b.eau.couleurs.eau);
    expect(bl).toBeGreaterThan(r + 50);
    const [lr, , lb] = rgb(b.feu.lueur);
    expect(lr).toBeGreaterThan(lb + 100);
  });

  test("T23: no sky; the night is a deep blue veil that fades to nothing", () => {
    expect(Object.keys(b)).not.toContain("ciel");
    const voile = rawColors[b.monde.couleurs.voile];
    const nul = rawColors[b.monde.couleurs.voileNul];
    const rgba = (c: string) => c.match(/[\d.]+/g)?.map(Number) ?? [];
    const [r, g, bl, a] = rgba(voile);
    expect(bl).toBeGreaterThan((r ?? 0) + 60);
    expect(bl).toBeGreaterThan((g ?? 0) + 40);
    expect(a).toBeGreaterThan(0.2);
    expect(a).toBeLessThan(0.6);
    expect(rgba(nul)).toEqual([r, g, bl, 0]);
  });

  test("no violet anywhere in the biome: blue never leads red and green both", () => {
    const tous = [
      ...Object.values(b.sol),
      ...Object.values(b.monde.couleurs),
      ...Object.values(b.eau.couleurs),
      ...Object.values(b.variantes.decals).map((d) => d.couleur),
      ...[...b.variantes.herbe, ...b.variantes.chemin, ...b.variantes.terre].map((v) => v.couleur),
    ].filter((t) => /^#[0-9A-Fa-f]{6}$/.test(rawColors[t]));
    expect(tous.length).toBeGreaterThan(40);
    for (const t of tous) {
      const [r, g, bl] = rgb(t);
      // Violet: red and blue both clearly above green.
      expect([t, r > g + 12 && bl > g + 12]).toEqual([t, false]);
    }
  });
});

// L6-T20: the world's image nodes are what costs memory. Counts measured on 2026-10-30 (411 x 700,
// the game's lowest zoom 0.8 in demo units): before, the whole map's zone at every tier, 56 nodes
// (48 forest + 8 shore); after, the island's reach only: 30/42/49 at paliers 1/6/12. T23: the land
// covers the frame's top too (no sky) and the reach spares only the tiles' nudge: 30/30/49.
describe("the world's image nodes", () => {
  const zmin = 0.8;
  const noeuds = (p: 1 | 6 | 12) => {
    const { visible } = etatCarte(p, false);
    return casesMonde(etendue(zmin, 411, 700, visible), G, visible).length;
  };
  test("a small island mounts a fraction of the finished island's", () => {
    expect(noeuds(1)).toBeLessThanOrEqual(32);
    // T23 (no sky): never more than T20's count with its sky, palier by palier.
    expect([noeuds(1), noeuds(6), noeuds(12)].map((n, i) => n <= ([30, 42, 49][i] ?? 0))).toEqual([
      true,
      true,
      true,
    ]);
    // 31/10 (PART_ILE 0.5, bounds on the island's middle half): 18 / 18 / 30 at paliers 1 / 6 / 12.
    expect(noeuds(6)).toBeLessThanOrEqual(noeuds(12));
    expect(noeuds(12)).toBeLessThanOrEqual(casesMonde(etendue(zmin, 411, 700), G).length);
  });
  test("at the tab zoom the reach stays inside the whole map and holds the island", () => {
    for (const p of [1, 6, 12] as const) {
      const z = etendue(zmin, 411, 700, etatCarte(p, false).visible);
      const t = etendue(zmin, 411, 700);
      expect(z.x0).toBeGreaterThanOrEqual(t.x0);
      expect(z.y1).toBeLessThanOrEqual(t.y1);
      expect(z.x1 - z.x0).toBeGreaterThan(411 / zmin);
    }
  });
  // Review L6-T20, important 1: at every corner of the pan range, the frame lies inside the reach,
  // so no edge of the world can show. T23: the whole frame, top included (there is no sky). Zoom
  // floors: the tab's 0.8 and dev-iso's 0.3; a phone upright and on its side.
  test("the whole frame stays inside the reach at every corner of the pan range", () => {
    const cas = (
      [
        [411, 700],
        [800, 360],
      ] as const
    ).flatMap(([w, h]) =>
      [0.3, 0.8].flatMap((plancher) =>
        [0, 120].flatMap((margeBas) =>
          ([1, 6, 12] as const).map((p) => ({ w, h, plancher, margeBas, p })),
        ),
      ),
    );
    for (const { w, h, plancher, margeBas, p } of cas) {
      const { visible } = etatCarte(p, false);
      // The camera's real floor (useCameraIso): the game's, never above the framing of the island
      // (MARGE_CADRAGE 0.92, the area less `margeBas`), which is lower than the island's own fit.
      const zmin = Math.min(plancher, cadrageComplet(visible, w, h - margeBas).zoom);
      const ile = emprise(visible);
      assert(ile);
      const l: Limites = {
        ile: ileJouable(ileCentree(ile, LARGEUR, HAUTEUR)),
        w,
        h,
        zmin,
        zmax: ZOOM_MAX,
      };
      const z = etendue(zmin, w, h, visible);
      const b = bornesPan(zmin, l);
      for (const x of [b.xMin, b.xMax])
        for (const y of [b.yMin, b.yMax]) {
          const v = { zoom: zmin, x, y };
          const carte = { largeur: LARGEUR, hauteur: HAUTEUR };
          const [ax, ay] = carteDepuisEcran([0, 0], v, { w, h }, carte);
          const [bx, by] = carteDepuisEcran([w, h], v, { w, h }, carte);
          expect([w, p, zmin, ax >= z.x0, bx <= z.x1, ay >= z.y0, by <= z.y1]).toEqual([
            w,
            p,
            zmin,
            true,
            true,
            true,
            true,
          ]);
        }
    }
  });

  test("forest cells vary in size, the same on every call (audit DA lot 3)", () => {
    const zone = { x0: 0, x1: 4 * CELLULE, y0: 0, y1: 4 * CELLULE };
    const un = casesMonde(zone, 7);
    expect(casesMonde(zone, 7)).toEqual(un);
    const foret = un.flatMap((k) => (k.genre === "foret" ? [k] : []));
    expect(new Set(foret.map((k) => k.echelle)).size).toBeGreaterThan(foret.length / 2);
    for (const k of foret) {
      expect(k.echelle).toBeGreaterThanOrEqual(0.8);
      expect(k.echelle).toBeLessThanOrEqual(1);
    }
  });
});

describe("the forest in rings of density (audit 31/10)", () => {
  const arbres = (t: keyof typeof TUILES) =>
    Object.values(TUILES[t].arbres).reduce((n, v) => n + v, 0);
  const { visible } = etatCarte(12, false);
  const zone = etendue(0.8, 411, 700, visible);
  const foret = casesMonde(zone, G, visible).flatMap((k) => (k.genre === "foret" ? [k] : []));

  test("the rings grow denser with the distance, whatever the noise", () => {
    const moyenne = (liste: readonly (keyof typeof TUILES)[]) =>
      liste.reduce((n, t) => n + arbres(t), 0) / liste.length;
    const par = [0.5, 1, 1.6, 2.8].map((d) => moyenne(anneauForet(d) as (keyof typeof TUILES)[]));
    expect(par).toEqual([...par].toSorted((a, b) => a - b));
    expect(par[3]).toBeGreaterThan(2 * (par[0] ?? 0));
  });

  test("no densest wood beside the glade: a ring lies between", () => {
    const par = new Map(
      foret.map((k) => [`${Math.round(k.x / CELLULE)},${Math.round(k.y / CELLULE)}`, k]),
    );
    for (const k of foret.filter((c) => c.tuile === "clairiere")) {
      const [c, r] = [Math.round(k.x / CELLULE), Math.round(k.y / CELLULE)];
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const v = par.get(`${c + dx},${r + dy}`);
        expect(v?.tuile).not.toBe("dense");
      }
    }
  });

  test("few trees in front, more behind, at the same distance (700 dp)", () => {
    expect(anneauForet(eloignement(700, HAUTEUR / 2 + 1.5 * CELLULE, 0.5))).not.toContain("dense");
    expect(anneauForet(eloignement(700, HAUTEUR / 2 - 1.5 * CELLULE, 0.5))).toContain("dense");
  });

  test("the density is not a straight frontier: a row of the forest changes tile along it", () => {
    const rangees = new Map<number, Set<string>>();
    for (const k of foret) {
      const r = Math.round(k.y / CELLULE);
      rangees.set(r, (rangees.get(r) ?? new Set()).add(k.tuile));
    }
    expect([...rangees.values()].some((t) => t.size >= 3)).toBe(true);
  });
});

// FIN-CAR: the rings of density met in straight lines along the 320 dp grid at the lowest zoom.
describe("the rings' frontiers are ragged (FIN-CAR)", () => {
  /** The longest run of cells whose frontier to the next cell lies on one grid line. */
  const plusLongueLigne = (zone: ReturnType<typeof etendue>, visible: boolean[][]) => {
    const grille = new Map<string, number>();
    for (const k of casesMonde(zone, G, visible))
      grille.set(`${Math.round(k.x / CELLULE)},${Math.round(k.y / CELLULE)}`, k.rang);
    const cles = [...grille.keys()].map((c) => c.split(",").map(Number) as [number, number]);
    const f = (c: number, r: number) => grille.get(`${c},${r}`);
    // The same two rings on either side, the same way round: one clean line, not a ragged strip.
    const frontiere = (
      c: number,
      r: number,
      dc: number,
      dr: number,
      paire?: [number?, number?],
    ) => {
      const [a, b] = [f(c, r), f(c + dc, r + dr)];
      return (
        a !== undefined &&
        b !== undefined &&
        a !== b &&
        (paire === undefined || (paire[0] === a && paire[1] === b))
      );
    };
    let max = 0;
    for (const [c, r] of cles)
      for (const [dc, dr] of [
        [1, 0],
        [0, 1],
      ] as const) {
        if (!frontiere(c, r, dc, dr)) continue;
        // Walk along the line (perpendicular to the step) while the frontier goes on.
        let n = 1;
        const paire: [number?, number?] = [f(c, r), f(c + dc, r + dr)];
        while (frontiere(c + dr * n, r + dc * n, dc, dr, paire)) n++;
        max = Math.max(max, n);
      }
    return max;
  };

  test("no frontier runs straight for more than 3 cells, at the game's floor and at dev's", () => {
    const { visible } = etatCarte(12, false);
    const ile = emprise(visible);
    assert(ile);
    const { zmin } = limitesDe(
      ile,
      { largeur: LARGEUR, hauteur: HAUTEUR },
      { w: 411, h: 700 },
      { min: ZOOM_MIN_JEU, max: ZOOM_MAX, cadre: cadrageComplet(visible, 411, 700).zoom },
    );
    for (const z of [zmin, 0.3]) {
      const long = plusLongueLigne(etendue(z, 411, 700, visible), visible);
      expect(long).toBeLessThanOrEqual(3);
    }
  });
});
