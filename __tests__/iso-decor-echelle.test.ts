// T39 (item 14): a rock is drawn at a villager's scale, on its own cell.
import {
  ECHELLE_ROCHER_POSE,
  ombresPiece,
  PIECES,
  posePiece,
  reduitPiece,
} from "@/components/village/iso/carteDemo";
import { MAQUETTES } from "@/components/village/iso/maquettes";

const rochers = PIECES.filter((p) => p.decor && p.cle.startsWith("decor/rochers"));

describe("rocks at the villagers' scale", () => {
  test("only rocks are reduced", () => {
    expect(reduitPiece("decor/rochers_a.nuit.webp")).toBe(ECHELLE_ROCHER_POSE);
    expect(reduitPiece("decor/arbre_a.nuit.webp")).toBe(1);
  });

  test("a rock's canvas reduced is no wider than a villager's canvas, so it is a villager's size", () => {
    const [r] = rochers;
    expect(r).toBeDefined();
    const s = r ? MAQUETTES[r.cle] : undefined;
    const v =
      MAQUETTES["villageois/farmer_face.nuit.webp"] ??
      Object.values(MAQUETTES).find((m) => m.pxScale === 2);
    expect(s && v).toBeTruthy();
    if (!r || !s || !v) return;
    const rocher = posePiece(r.case, s);
    const villageois = posePiece(r.case, v);
    expect(rocher.w * ECHELLE_ROCHER_POSE).toBeLessThanOrEqual(villageois.w);
    expect(rocher.h * ECHELLE_ROCHER_POSE).toBeLessThanOrEqual(villageois.h);
  });

  test("the shadow shrinks with the rock and stays inside its cell", () => {
    expect(rochers.length).toBeGreaterThan(0);
    for (const p of rochers) {
      for (const poly of ombresPiece(p))
        for (const [x, y] of poly) {
          expect(x).toBeGreaterThanOrEqual(p.case[0]);
          expect(x).toBeLessThanOrEqual(p.case[0] + 1);
          expect(y).toBeGreaterThanOrEqual(p.case[1]);
          expect(y).toBeLessThanOrEqual(p.case[1] + 1);
        }
    }
  });
});
