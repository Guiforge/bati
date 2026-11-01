import { accessoiresDans } from "@/components/village/iso/accessoires";
import { ANIMAUX, ecranXY, etatCarte, FIGURINES } from "@/components/village/iso/carteDemo";
import { nombreHabitants, placerHabitants } from "@/components/village/iso/habitants";
import { BUCHE_DU_CAMP } from "@/components/village/iso/histoires";
import type { Carte } from "@/components/village/iso/marcheurs";
import type { VillageTier } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const JOURS = [20000, 20001, 20002, 20003, 20004];
const carteDe = (palier: VillageTier): Carte => {
  const { visible, montres } = etatCarte(palier, false);
  return {
    visible,
    montres,
    obstacles: ANIMAUX.map((a) => a.piece.case),
    occupees: FIGURINES.map((f) => f.case),
  };
};
const histoires = (palier: VillageTier, jour: number) =>
  placerHabitants(palier, carteDe(palier), jour).filter((g) => g.histoire);
const ids = (palier: VillageTier, jour: number) =>
  new Set(histoires(palier, jour).map((g) => g.histoire));

describe("the small stories (C1)", () => {
  test("the old man sleeps at the fire, the dispute stands at the forge, each from the tier its place exists", () => {
    for (const jour of JOURS)
      for (const palier of PALIERS) {
        const carte = carteDe(palier);
        const gens = histoires(palier, jour);
        expect(ids(palier, jour).has("vieux_dort")).toBe(carte.montres.includes("campfire"));
        expect(ids(palier, jour).has("dispute_forge")).toBe(carte.montres.includes("forge"));
        // Every story is on a cell next to its place, with its pose.
        const vieux = gens.find((g) => g.histoire === "vieux_dort");
        expect(vieux?.pose).toBe("dort");
        const duo = gens.filter((g) => g.histoire === "dispute_forge");
        const attendu = carte.montres.includes("forge") ? ["discutent", "discutent"] : [];
        expect(duo.map((g) => g.pose)).toEqual(attendu);
        expect(duo.filter((g) => g.compagnon)).toHaveLength(attendu.length / 2);
      }
  });

  test("the apprentice carries a load once a building beyond the starters is shown", () => {
    for (const palier of PALIERS) {
      const montres = carteDe(palier).montres;
      const attendu = montres.some((c) => !["campfire", "tent", "training_dummy"].includes(c));
      expect([palier, ids(palier, 20000).has("apprenti_panier")]).toEqual([palier, attendu]);
    }
  });

  test("a story seen at a tier is still there at the next one, whatever the day", () => {
    for (const jour of JOURS)
      for (let i = 0; i + 1 < PALIERS.length; i++) {
        const [a, b] = [PALIERS[i], PALIERS[i + 1]] as [VillageTier, VillageTier];
        const apres = ids(b, jour);
        for (const id of ids(a, jour))
          expect([a, jour, id, apres.has(id)]).toEqual([a, jour, id, true]);
      }
  });

  test("the same day tells the same stories on the same cells", () => {
    for (const palier of [3, 8, 12] as const)
      expect(placerHabitants(palier, carteDe(palier), 20001)).toEqual(
        placerHabitants(palier, carteDe(palier), 20001),
      );
  });

  test("the crowd keeps its size, one cell each, and no story shares a cell", () => {
    for (const jour of JOURS)
      for (const palier of PALIERS) {
        const gens = placerHabitants(palier, carteDe(palier), jour);
        expect(gens).toHaveLength(nombreHabitants(palier));
        expect(new Set(gens.map((g) => g.cellule.join())).size).toBe(gens.length);
        for (const g of gens.filter((x) => x.compagnon)) {
          const autre = gens.find((x) => x.id === g.avec);
          expect(autre?.avec).toBe(g.id);
          expect(autre?.pose).toBe(g.pose);
        }
      }
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a sweep over days, tiers and inhabitants, kept in one place
  test("no one sits on nothing: a sleeper has the camp's log or a building's wall beside it", () => {
    const [cx, cy] = ecranXY([BUCHE_DU_CAMP[0] + 0.5, BUCHE_DU_CAMP[1] + 0.5]);
    expect(accessoiresDans({ x: cx - 2, y: cy - 2, w: 4, h: 4 }).bois).not.toBe("");
    const [bx, by] = BUCHE_DU_CAMP;
    const faux: string[] = [];
    for (const jour of JOURS)
      for (const palier of PALIERS)
        for (const g of placerHabitants(palier, carteDe(palier), jour)) {
          if (g.pose !== "dort") continue;
          const [x, y] = g.cellule;
          const contreBuche = Math.abs(x - bx) + Math.abs(y - by) === 1;
          const soutien = g.histoire === "vieux_dort" ? contreBuche : g.lieu !== "campfire";
          if (!soutien) faux.push(`${palier}/${jour}/${g.id}`);
        }
    expect(faux).toEqual([]);
  });
});
