import assert from "node:assert/strict";
import { CYCLE_MS } from "@/components/village/iso/horloge";
import { TAILLE } from "@/components/village/iso/isoLayout";
import { casesDuLieu, type Segment } from "@/components/village/iso/marcheurs";
import { coinsFenetre, fenetres, porte, veilleDeVague } from "@/components/village/iso/veilleuses";

jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

describe("night lights", () => {
  test("windows are dark on every cycle boundary, lit and dark inside a cycle", () => {
    for (const n of [0, 1, 2]) {
      expect(fenetres(0, n)).toBe(0);
      expect(fenetres(3 * CYCLE_MS, n)).toBe(0);
      expect(fenetres(4 * CYCLE_MS - 1, n)).toBe(0);
      const vus = new Set<number>();
      for (let c = 0; c < CYCLE_MS; c += 100) vus.add(fenetres(c, n));
      expect([...vus].sort()).toEqual([0, 1]);
    }
  });

  test("a door glows around a visit only", () => {
    const visites = [[2000, 3000]] as const;
    expect(porte(0, visites)).toBe(0);
    expect(porte(1800, visites)).toBe(1);
    expect(porte(3500, visites)).toBe(1);
    expect(porte(4000, visites)).toBe(0);
  });

  test("the pick is seeded by the day and the wave number, and capped", () => {
    const carte = { visible: [], montres: ["forge", "farm", "well", "armory"] } as never;
    const tout = () => true;
    const rien = () => false;
    const a = veilleDeVague(5000, 20000, 7, carte, [], tout, rien);
    expect(a.fenetres.size).toBe(2);
    expect(veilleDeVague(9999, 20000, 7, carte, [], tout, rien).fenetres).toEqual(a.fenetres);
    expect(veilleDeVague(5000, 20000, 7, carte, [], rien, rien).fenetres.size).toBe(0);
    const autres = [8, 9, 10, 11].map((n) =>
      [...veilleDeVague(5000, 20000, n, carte, [], tout, rien).fenetres].join(),
    );
    expect(new Set(autres).size).toBeGreaterThan(1);
  });

  test("a door is tied to a real visit at a real building", () => {
    const visible = Array.from({ length: TAILLE }, () =>
      Array.from({ length: TAILLE }, () => true),
    );
    const carte = { visible, montres: ["forge", "well"] } as never;
    const devant = casesDuLieu("forge", carte)[0];
    assert(devant);
    const seg = (etat: Segment["etat"], de: Segment["de"], t0: number): Segment => ({
      etat,
      de,
      vers: de,
      t0,
      duree: 1500,
    });
    const v = veilleDeVague(
      0,
      1,
      1,
      carte,
      [[seg("marcher", devant, 0), seg("agir", devant, 4000), seg("agir", [0, 0], 9000)]],
      () => false,
      () => true,
    );
    expect(v.portes).toEqual({ forge: [[4000, 5500]] });
  });

  test("a window is a flat parallelogram sloping with its face", () => {
    const f = { px: [10, 10], largeur: 10, hauteur: 6, face: "droite" } as const;
    const [hg, hd] = coinsFenetre(f);
    expect(hd?.[1]).toBeGreaterThan(hg?.[1] ?? 0);
    const [lg, ld] = coinsFenetre({ ...f, face: "gauche" });
    expect(ld?.[1]).toBeLessThan(lg?.[1] ?? 0);
  });
});
