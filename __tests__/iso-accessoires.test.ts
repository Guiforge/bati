import { accessoiresDans } from "@/components/village/iso/accessoires";
import { etatCarte, HAUTEUR, LARGEUR } from "@/components/village/iso/carteDemo";
import { champsDe } from "@/components/village/iso/champs";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const carte = { x: 0, y: 0, w: LARGEUR, h: HAUTEUR };

describe("the camp's things round the fire (B2)", () => {
  test("logs, a wood pile and crates stand on the whole map, the same on each call", () => {
    const a = accessoiresDans(carte);
    for (const k of ["bois", "bout", "haut", "gauche", "droite", "encre"] as const)
      expect(a[k]).not.toBe("");
    expect(accessoiresDans(carte)).toEqual(a);
  });

  test("a tile far from the fire holds none", () => {
    const a = accessoiresDans({ x: 0, y: 0, w: 60, h: 60 });
    expect(a.encre).toBe("");
  });

  test("the fields have pale and dark furrows at tiers 1 and 6", () => {
    for (const p of [1, 6] as const) {
      const { visible } = etatCarte(p, false);
      const c = champsDe((gx, gy) => visible[gy]?.[gx] === true);
      expect(c.sillonsClairs).not.toBe("");
      expect(c.sillons).not.toBe("");
    }
  });
});
