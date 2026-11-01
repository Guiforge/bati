// L4-T08a: the lisiere, decor just off the island so it does not float on the sky.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  etatCarte,
  lisiereAffichee,
  ORDRE_CARTE,
  pose,
  posePiece,
  spriteDe,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { emplacements, sol, TAILLE } from "@/components/village/iso/isoLayout";
import type { Stade } from "@/components/village/iso/isoSpec";
import {
  anneau,
  LISIERE,
  lisiereMontree,
  type PieceLisiere,
  RAYON,
} from "@/components/village/iso/lisiere";
import { choisir } from "@/components/village/iso/lisiereChoix";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { casesSousOmbre } from "@/components/village/iso/pieces";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const CHEMIN = join(__dirname, "../constants/isoLisiere.json");
const cle = (c: readonly number[]) => c.join(",");
const dansLaGrille = ([gx = 0, gy = 0]: readonly number[]) =>
  gx >= 0 && gy >= 0 && gx < TAILLE && gy < TAILLE;

/** Whether a piece's image touches a building's image. */
function recouvre(piece: PieceLisiere, code: BuildingCode, stade: (c: BuildingCode) => Stade) {
  const sp = MAQUETTES[piece.cle];
  const sb = spriteDe(code, stade(code));
  if (!sp || !sb) return false;
  const [r, b] = [posePiece(piece.case, sp), pose(code, sb)];
  return r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y;
}

describe("the lisiere", () => {
  test("its shadow never falls on a footprint, a path, water or a decor of the grid, nor on another piece", () => {
    const pris = new Set<string>();
    for (const code of buildingCodes) for (const c of emplacements[code].cases) pris.add(cle(c));
    sol.forEach((ligne, gy) => {
      ligne.forEach((s, gx) => {
        if (s !== "herbe") pris.add(cle([gx, gy]));
      });
    });
    const cases = new Set(LISIERE.map((p) => cle(p.case)));
    const fautes = LISIERE.flatMap((p) => {
      const ombres = (MAQUETTES[p.cle]?.ombre ?? []).map((o) =>
        o.flatMap((v, i): [number, number][] =>
          i % 2 === 0 ? [[p.case[0] + v, p.case[1] + (o[i + 1] ?? 0)]] : [],
        ),
      );
      return casesSousOmbre(ombres)
        .filter((c) => cle(c) !== cle(p.case) && (pris.has(cle(c)) || cases.has(cle(c))))
        .map(() => cle(p.case));
    });
    expect(LISIERE.length).toBeGreaterThan(40);
    expect(fautes).toEqual([]);
  });

  test("one piece per cell, never on water, a bridge or a decor of the grid", () => {
    expect(new Set(LISIERE.map((p) => cle(p.case))).size).toBe(LISIERE.length);
    for (const p of LISIERE)
      expect(["herbe", "chemin"]).toContain(sol[p.case[1]]?.[p.case[0]] ?? "herbe");
  });

  test("it may stand on a plot or a path not shown yet, and goes when it shows", () => {
    const surPlot = LISIERE.filter((p) => p.batiment);
    const surChemin = LISIERE.filter((p) => sol[p.case[1]]?.[p.case[0]] === "chemin");
    expect(surPlot.length).toBeGreaterThan(0);
    expect(surChemin.length).toBeGreaterThan(0);
    // Shown at tier 1, then gone at the first tier where its plot or path cell is on the island.
    const montrees = PALIERS.map((p) => etatCarte(p, false).visible).map((v) => ({
      v,
      vues: new Set(lisiereMontree(v).map((l) => cle(l.piece.case))),
    }));
    expect(montrees[0] && surPlot.some((p) => montrees[0]?.vues.has(cle(p.case)))).toBe(true);
    expect(montrees[0] && surChemin.some((p) => montrees[0]?.vues.has(cle(p.case)))).toBe(true);
    const fautes = [...surPlot, ...surChemin].flatMap((p) =>
      montrees.flatMap(({ v, vues }) => {
        const cases = p.batiment ? emplacements[p.batiment].cases : [p.case];
        const montre = cases.some(([gx, gy]) => v[gy]?.[gx]);
        return montre && vues.has(cle(p.case)) ? [cle(p.case)] : [];
      }),
    );
    expect(fautes).toEqual([]);
  });

  test("is the same at every render, and sits in the depth order", () => {
    const { visible } = etatCarte(3, false);
    expect(lisiereMontree(visible)).toEqual(lisiereMontree(etatCarte(3, false).visible));
    const ordre = ORDRE_CARTE.flatMap((e) => (e.type === "lisiere" ? [cle(e.piece.case)] : []));
    expect([...ordre].sort()).toEqual(LISIERE.map((p) => cle(p.case)).sort());
  });

  test("none stands behind the island, where the world's forest and mountains are (L6-T10)", () => {
    for (const p of PALIERS) {
      const montrees = lisiereMontree(etatCarte(p, false).visible);
      expect(montrees.length).toBeGreaterThan(0);
      for (const { piece } of montrees)
        expect(piece.case[0] + piece.case[1]).toBeGreaterThanOrEqual(TAILLE - 2);
    }
  });

  test("shows only cells off the island, within reach, all opaque (no ghost trees)", () => {
    for (const palier of PALIERS) {
      const { visible } = etatCarte(palier, false);
      for (const { piece, opacite } of lisiereMontree(visible)) {
        const r = anneau(visible, piece.case);
        expect(visible[piece.case[1]]?.[piece.case[0]] ?? false).toBe(false);
        expect(r).not.toBeNull();
        expect(r).toBeLessThanOrEqual(RAYON);
        expect(opacite).toBe(1);
      }
    }
    const { visible } = etatCarte(8, false);
    const montrees = lisiereMontree(visible);
    const au = (r: number) =>
      montrees.find((l) => anneau(visible, l.piece.case) === r)?.opacite ?? 0;
    expect(au(1)).toBe(1);
    expect(au(RAYON)).toBe(1);
  });

  test("recedes as the tier rises: a cell that joins the island loses its piece, the outside ring is all that is left at tier 12", () => {
    const parPalier = PALIERS.map((p) => {
      const { visible } = etatCarte(p, false);
      return { visible, vues: lisiereMontree(visible).map((l) => cle(l.piece.case)) };
    });
    const rejointes = parPalier.flatMap((courant, i) => {
      const suivant = parPalier[i + 1];
      if (!suivant) return [];
      return courant.vues.filter((c) => {
        const [gx = 0, gy = 0] = c.split(",").map(Number);
        return suivant.visible[gy]?.[gx] === true && suivant.vues.includes(c);
      });
    });
    expect(rejointes).toEqual([]);
    const dernier = parPalier[11]?.vues ?? [];
    expect(dernier.length).toBeGreaterThan(0);
    expect(dernier.filter((c) => dansLaGrille(c.split(",").map(Number)))).toEqual([]);
    const dedans = (vues: readonly string[]) =>
      vues.filter((c) => dansLaGrille(c.split(",").map(Number))).length;
    expect(dedans(parPalier[0]?.vues ?? [])).toBeGreaterThan(0);
    expect(dedans(parPalier[11]?.vues ?? [])).toBe(0);
  });

  test("mounts nothing for a cell that is not drawn", () => {
    const vide = Array.from({ length: TAILLE }, () => Array.from({ length: TAILLE }, () => false));
    expect(lisiereMontree(vide)).toEqual([]);
    const { visible } = etatCarte(1, false);
    const montrees = new Set(lisiereMontree(visible).map((l) => cle(l.piece.case)));
    expect(montrees.size).toBeLessThan(LISIERE.length);
    const sansAnneau = LISIERE.filter(
      (p) => montrees.has(cle(p.case)) && anneau(visible, p.case) === null,
    );
    expect(sansAnneau).toEqual([]);
  });

  test("no shown piece covers a shown building standing behind it, at any tier", () => {
    const rang = new Map(
      ORDRE_CARTE.map((e, i) => [
        e.type === "batiment" ? e.code : e.type === "pan" ? `pan:${e.troncon}` : cle(e.piece.case),
        i,
      ]),
    );
    const parPalier = PALIERS.map((palier) => {
      const { visible, montres } = etatCarte(palier, true);
      const stade = (code: BuildingCode) => stadeDemo(code, palier);
      const affichees = lisiereAffichee(visible, montres, stade);
      const fautes = affichees.flatMap(({ piece }) =>
        montres
          .filter((code) => (rang.get(code) ?? 0) < (rang.get(cle(piece.case)) ?? 0))
          .filter((code) => recouvre(piece, code, stade))
          .map((code) => `${palier}: ${cle(piece.case)} over ${code}`),
      );
      return { fautes, retirees: lisiereMontree(visible).length - affichees.length };
    });
    const fautes = parPalier.flatMap((p) => p.fautes);
    const retirees = parPalier.reduce((n, p) => n + p.retirees, 0);
    expect(fautes).toEqual([]);
    // The filter does something: some piece was in the way.
    expect(retirees).toBeGreaterThan(0);
  });

  test("past the grid, the pieces inside it only go down as the tier rises", () => {
    const dedans = PALIERS.map(
      (p) =>
        lisiereMontree(etatCarte(p, false).visible).filter((l) => dansLaGrille(l.piece.case))
          .length,
    );
    // From tier 5 the island has the grid's middle: what stands in the grid recedes with it.
    const depuis = dedans.slice(4);
    expect(depuis.every((n, i) => i === 0 || n <= (depuis[i - 1] ?? 0))).toBe(true);
    expect(dedans[11]).toBe(0);
  });

  test("constants/isoLisiere.json is what the rules give for the grid", () => {
    const attendu = choisir(Object.keys(MAQUETTES)).map((p) => ({
      famille: p.famille,
      nom: p.nom,
      kind: p.kind,
      case: [...p.case],
      batiment: p.batiment ?? null,
    }));
    if (process.env.UPDATE_LISIERE === "1") {
      const _doc =
        "The lisiere's pieces, chosen by components/village/iso/lisiereChoix.ts from isoLayout.json and the mock-ups. Generated: UPDATE_LISIERE=1 npx jest iso-lisiere. The app reads this and never runs the choice (L4-T08a).";
      writeFileSync(CHEMIN, `${JSON.stringify({ _doc, pieces: attendu }, null, 1)}\n`);
    }
    const ecrit: unknown = JSON.parse(readFileSync(CHEMIN, "utf8")).pieces;
    // Stale when the grid, the rules or the mock-ups changed: regenerate and commit the JSON.
    expect({ commande: "UPDATE_LISIERE=1 npx jest iso-lisiere", pieces: ecrit }).toEqual({
      commande: "UPDATE_LISIERE=1 npx jest iso-lisiere",
      pieces: attendu,
    });
  });
});
