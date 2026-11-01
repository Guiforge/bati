import { ANIMAUX, etatCarte, FIGURINES } from "@/components/village/iso/carteDemo";
import {
  batimentLePlusProche,
  placerHabitants,
  ROLE_DU_BATIMENT,
} from "@/components/village/iso/habitants";
import { emplacements } from "@/components/village/iso/isoLayout";
import type { Carte } from "@/components/village/iso/marcheurs";
import { poseDe } from "@/components/village/iso/reposTable";
import type { BuildingCode } from "@/db/schema";
import type { VillageTier } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const carteDe = (palier: VillageTier): Carte => {
  const { visible, montres } = etatCarte(palier, true);
  return {
    visible,
    montres,
    obstacles: ANIMAUX.map((a) => a.piece.case),
    occupees: FIGURINES.map((f) => f.case),
  };
};

describe("the inhabitants wear the trade of their nearest building (T42)", () => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a sweep over tiers and days, kept in one place
  test("each one carries the trade of the building nearest it, else any trade", () => {
    let avecMetier = 0;
    const faux: string[] = [];
    for (const palier of PALIERS)
      for (const jour of [20001, 20002, 20003]) {
        const carte = carteDe(palier);
        for (const h of placerHabitants(palier, carte, jour)) {
          const b = batimentLePlusProche(h.cellule, carte.montres);
          const metier = b && ROLE_DU_BATIMENT[b];
          if (metier) {
            avecMetier++;
            if (h.role !== metier) faux.push(`${palier}/${jour}/${h.id}:${h.role}`);
          }
        }
      }
    expect(faux).toEqual([]);
    expect(avecMetier).toBeGreaterThan(50);
  });

  test("for a building with a trade, the inhabitant nearest it wears that trade", () => {
    const carte = carteDe(12);
    const vus = new Set<string>();
    const faux: string[] = [];
    for (const jour of [20001, 20002, 20003, 20004]) {
      const gens = placerHabitants(12, carte, jour).filter((g) => !g.compagnon);
      for (const [code, metier] of Object.entries(ROLE_DU_BATIMENT)) {
        const cases = emplacements[code as BuildingCode].cases;
        const proche = gens
          .map((g) => ({
            g,
            d: Math.min(
              ...cases.map((c) => Math.abs(c[0] - g.cellule[0]) + Math.abs(c[1] - g.cellule[1])),
            ),
          }))
          .sort((a, b) => a.d - b.d)[0];
        // Only when no other building is as near: a tie goes to the other building's trade.
        if (proche && batimentLePlusProche(proche.g.cellule, carte.montres) === code) {
          vus.add(code);
          if (proche.g.role !== metier) faux.push(`${jour}/${code}`);
        }
      }
    }
    expect(faux).toEqual([]);
    expect(vus.size).toBeGreaterThan(2);
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a sweep over tiers and days, kept in one place
  test("after pairing, each half of a talking pair wears the trade of its own nearest building", () => {
    // Chosen: roles may differ inside a pair, each half follows its own cell.
    let paires = 0;
    const faux: string[] = [];
    for (const palier of PALIERS)
      for (const jour of Array.from({ length: 60 }, (_, k) => 20001 + k)) {
        const carte = carteDe(palier);
        // placerHabitants ends in donnerPoses, which pairs (accoupler) and moves one half.
        for (const g of placerHabitants(palier, carte, jour)) {
          if (!g.avec) continue;
          paires++;
          const b = batimentLePlusProche(g.cellule, carte.montres);
          const metier = b && ROLE_DU_BATIMENT[b];
          if (metier && g.role !== metier) faux.push(`${palier}/${jour}/${g.id}`);
        }
      }
    expect(faux).toEqual([]);
    expect(paires).toBeGreaterThan(0);
  });

  test("the same journal gives the same village", () => {
    expect(placerHabitants(9, carteDe(9), 20001)).toEqual(placerHabitants(9, carteDe(9), 20001));
  });
});

// qa-audit2: every habitant of the palier 12 map had a resting pose, and the poses are anonymous
// figures (a sweeper, a sleeper), so no smith, sage or watcher was ever seen.
describe("a trade shows on the map (qa-audit2)", () => {
  test("an inhabitant with a trade keeps its sprite, except for a pose made for its own building", () => {
    let debout = 0;
    const faux: string[] = [];
    for (const jour of [20001, 20002, 20003, 20004, 20005, 20006])
      for (const g of placerHabitants(12, carteDe(12), jour).filter((x) => x.metier)) {
        const pose = poseDe(g.pose);
        if (!pose) debout++;
        else if (!pose.lieux.includes(g.lieu as never))
          faux.push(`${jour}/${g.id}:${g.role}:${g.pose}`);
      }
    expect(faux).toEqual([]);
    expect(debout).toBeGreaterThan(20);
  });

  test("on the palier 12 map a smith, a sage and a watcher stand without a pose", () => {
    const vus = new Set<string>();
    for (const jour of [20001, 20002, 20003, 20004])
      for (const g of placerHabitants(12, carteDe(12), jour)) if (!g.pose) vus.add(g.role);
    for (const role of ["smith", "sage", "watcher"]) expect(vus).toContain(role);
  });
});
