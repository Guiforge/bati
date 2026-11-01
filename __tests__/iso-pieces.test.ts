// L1-T07 tour 4: blender's decor and water pieces (L1-T06) on the demo map: which piece stands on
// which cell, the decor display rule (DECISIONS, 28/10), and the depth order with the buildings.
import assert from "node:assert/strict";
import {
  EMPRISES_CARTE,
  ecranXY,
  etatCarte,
  FIGURINES,
  ORDRE_CARTE,
  ombresPiece,
  PIECES,
  pieceMontree,
  posePiece,
} from "@/components/village/iso/carteDemo";
import { emplacements, type Sol, sol } from "@/components/village/iso/isoLayout";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import {
  casesSousOmbre,
  clePiece,
  DECORS,
  pieceEau,
  varianteDecor,
} from "@/components/village/iso/pieces";
import { derriere, type Emprise } from "@/components/village/iso/profondeur";
import type { VillageTier } from "@/db/village";

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** A small grid from rows of isoLayout.json's legend. */
const LEGENDE: Record<string, Sol> = { ".": "herbe", "~": "eau", "=": "pont", W: "cascade" };
const grille = (...lignes: string[]): Sol[][] =>
  lignes.map((l) => [...l].map((ch) => LEGENDE[ch] ?? "herbe"));

describe("which piece stands on a cell", () => {
  test("a decor's variant is stable for its cell and spread over the variants", () => {
    const cles = Object.keys(MAQUETTES);
    const arbres = cles.filter((c) => c.startsWith("decor/arbre_"));
    expect(arbres.length).toBeGreaterThan(1);
    const vues = new Set<string | undefined>();
    for (let gx = 0; gx < 20; gx++)
      for (let gy = 0; gy < 20; gy++) {
        const v = varianteDecor("arbre", [gx, gy], cles);
        expect(v).toBe(varianteDecor("arbre", [gx, gy], [...cles].reverse()));
        vues.add(v);
      }
    // T39: only the painted tree is accepted; arbre_b and arbre_c stay indexed, never drawn.
    expect([...vues]).toEqual(["decor/arbre_a.nuit.webp"]);
    expect(varianteDecor("arbre", [0, 0], ["eau/canal_droit.nuit.webp"])).toBeUndefined();
  });

  test("the canal's pieces follow its neighbours; along gx they are mirrored", () => {
    const le = (nom: string, miroir: boolean) => ({ cle: clePiece("eau", nom), miroir });
    // One canal along gy, as on the master grid: head, straight, bridge, lip of the cascade.
    const g = grille(".~.", ".~.", ".=.", ".~.", ".W.");
    expect(pieceEau(g, [1, 0])).toEqual(le("canal_berge", false));
    expect(pieceEau(g, [1, 1])).toEqual(le("canal_droit", false));
    expect(pieceEau(g, [1, 2])).toEqual(le("canal_pont", false));
    expect(pieceEau(g, [1, 4])).toEqual({
      ...le("cascade_bord", false),
      chute: clePiece("eau", "cascade_chute"),
    });
    expect(pieceEau(g, [0, 1])).toBeNull();
    // Along gx: the same pieces, mirrored on screen.
    const h = grille("~~=~", "....");
    expect(pieceEau(h, [0, 0])).toEqual(le("canal_berge", true));
    expect(pieceEau(h, [1, 0])).toEqual(le("canal_droit", true));
    expect(pieceEau(h, [2, 0])).toEqual(le("canal_pont", true));
    // The corner blender drew joins the +gy and +gx edges.
    expect(pieceEau(grille("~~", "~."), [0, 0])).toEqual(le("canal_angle", false));
  });

  test("every decor and water cell of the master grid has its piece, with an image", () => {
    const attendues = sol.flatMap((l, gy) =>
      l.flatMap((s, gx) => (s === "herbe" || s === "chemin" ? [] : [`${gx},${gy}`])),
    );
    expect(PIECES.map((p) => p.case.join(",")).sort()).toEqual(attendues.sort());
    for (const p of PIECES) {
      expect([p.cle, MAQUETTES[p.cle] !== undefined]).toEqual([p.cle, true]);
      expect([p.cle, p.decor]).toEqual([
        p.cle,
        DECORS.includes(sol[p.case[1]]?.[p.case[0]] ?? "herbe"),
      ]);
    }
    // The canal of the master grid runs along gy: nothing mirrored, so every piece has its shadow.
    expect(PIECES.filter((p) => p.miroir)).toEqual([]);
  });

  test("a piece's anchor lands on its cell's bottom corner", () => {
    const p = PIECES[0];
    const s = p && MAQUETTES[p.cle];
    if (!p || !s) throw new Error("no piece");
    const r = posePiece(p.case, s);
    const k = r.w / s.size[0];
    const [x, y] = ecranXY([p.case[0] + 1, p.case[1] + 1]);
    expect(r.x + s.anchor[0] * k).toBeCloseTo(x);
    expect(r.y + s.anchor[1] * k).toBeCloseTo(y);
  });
});

describe("the decor display rule: all the ground under its shadow is on the island", () => {
  test("at every tier a shown decor has its shadow's ground on the island, and the rule hides some", () => {
    const decors = PIECES.filter((p) => p.decor);
    expect(decors.filter((p) => casesSousOmbre(ombresPiece(p)).length === 0)).toEqual([]);
    const etats = PALIERS.flatMap((p) =>
      [false, true].flatMap((tous) => {
        const { visible } = etatCarte(p, tous);
        const sur = ([gx, gy]: readonly [number, number]) => visible[gy]?.[gx] === true;
        return PIECES.map((piece) => ({
          ou: `${p}${tous ? "+" : ""} ${piece.case.join(",")}`,
          montre: pieceMontree(piece, visible),
          case: sur(piece.case),
          ombre: casesSousOmbre(ombresPiece(piece)).every(sur),
          decor: piece.decor,
        }));
      }),
    );
    // Shown: its cell is on the island, and for a decor all the ground under its shadow too.
    expect(
      etats.filter((e) => e.montre && !(e.case && (e.ombre || !e.decor))).map((e) => e.ou),
    ).toEqual([]);
    // Water shows as soon as its cell does.
    expect(etats.filter((e) => !e.decor && e.case && !e.montre).map((e) => e.ou)).toEqual([]);
    // DECISIONS 28/10: decor shadows fall on cells that join later, so the rule does bite.
    expect(etats.filter((e) => e.decor && e.case && !e.montre).length).toBeGreaterThan(0);
  });

  // Written out rather than recomputed with casesSousOmbre, so an offset in ombresPiece shows.
  test("the tree at (1,5): its cell joins at tier 10, its shadow's ground at 11", () => {
    const arbre = PIECES.find((p) => p.case.join(",") === "1,5");
    assert(arbre?.decor);
    for (const p of PALIERS) {
      const { visible } = etatCarte(p, false);
      expect([p, visible[5]?.[1] === true, pieceMontree(arbre, visible)]).toEqual([
        p,
        p >= 10,
        p >= 11,
      ]);
    }
  });

  test("at tier 12 every decor and every water piece shows", () => {
    const { visible } = etatCarte(12, false);
    expect(PIECES.filter((p) => !pieceMontree(p, visible))).toEqual([]);
  });

  test("the cells under a shadow cover its box", () => {
    expect(
      casesSousOmbre([
        [
          [0.2, 0.5],
          [1.4, -0.3],
        ],
      ]),
    ).toEqual([
      [0, -1],
      [0, 0],
      [1, -1],
      [1, 0],
    ]);
  });
});

describe("the standing villagers (L1-T19)", () => {
  test("three figurines stand on path cells outside every footprint, drawn at their pxScale", () => {
    expect(FIGURINES).toHaveLength(3);
    for (const f of FIGURINES) {
      const [gx, gy] = f.case;
      expect([f.case, sol[gy]?.[gx]]).toEqual([f.case, "chemin"]);
      const s = MAQUETTES[f.cle];
      assert(s);
      expect(f.cle).toMatch(/^villageois\//);
      expect(s.pxScale).toBe(2);
      // The sprite is half as large on the map as its canvas says: 768 px drawn over 384 dp.
      expect(posePiece(f.case, s).w).toBeCloseTo(posePiece(f.case, { ...s, pxScale: 1 }).w / 2);
      expect(
        Object.values(emplacements).filter((e) => e.cases.some(([x, y]) => x === gx && y === gy)),
      ).toEqual([]);
    }
    expect(new Set(FIGURINES.map((f) => f.cle)).size).toBe(3);
  });

  test("they show from tier 1, sorted in depth with the pieces and buildings", () => {
    const { visible } = etatCarte(1, false);
    expect(FIGURINES.filter((f) => !pieceMontree(f, visible))).toEqual([]);
    const figurines = ORDRE_CARTE.filter((e) => e.type === "figurine");
    expect(figurines.filter((f) => f.piece.cle.startsWith("villageois"))).toHaveLength(3);
    const vers = (e: (typeof ORDRE_CARTE)[number]): Emprise =>
      e.type === "batiment"
        ? emplacements[e.code]
        : e.type === "pan"
          ? (EMPRISES_CARTE[`pan:${e.troncon}`] ?? emplacements.castle_wall)
          : { coin: e.piece.case, emprise: [1, 1] };
    const fautes: string[] = [];
    for (const [i, a] of ORDRE_CARTE.entries()) {
      for (const [j, b] of ORDRE_CARTE.entries()) {
        const touche = a.type === "figurine" || b.type === "figurine";
        if (touche && derriere(vers(a), vers(b)) && i > j) fautes.push(`${i} after ${j}`);
      }
    }
    expect(fautes).toEqual([]);
  });
});

describe("pieces and buildings in one depth order", () => {
  test("every element lying behind another is drawn before it", () => {
    const emprise = (e: (typeof ORDRE_CARTE)[number]): Emprise =>
      e.type === "batiment"
        ? emplacements[e.code]
        : e.type === "pan"
          ? (EMPRISES_CARTE[`pan:${e.troncon}`] ?? emplacements.castle_wall)
          : { coin: e.piece.case, emprise: [1, 1] };
    const fautes: string[] = [];
    let paires = 0;
    ORDRE_CARTE.forEach((a, i) => {
      ORDRE_CARTE.forEach((b, j) => {
        if (i === j || !derriere(emprise(a), emprise(b))) return;
        paires++;
        if (i > j) fautes.push(`${JSON.stringify(a)} after ${JSON.stringify(b)}`);
      });
    });
    expect(paires).toBeGreaterThan(100);
    expect(fautes).toEqual([]);
    expect(ORDRE_CARTE.filter((e) => e.type === "piece")).toHaveLength(PIECES.length);
  });
});
