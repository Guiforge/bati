import assert from "node:assert/strict";
import {
  ANIMAUX,
  ecranXY,
  etatCarte,
  FIGURINES,
  poseChute,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import {
  COUVERT_MAX,
  couverture,
  garderPoses,
  placerHabitants,
  TOUCHE_H,
  TOUCHE_L,
  villageoisAuPoint,
} from "@/components/village/iso/habitants";
import { type Case, emplacements } from "@/components/village/iso/isoLayout";
import type { Carte } from "@/components/village/iso/marcheurs";
import { boiteDePose, POSES_REPOS, poseDe } from "@/components/village/iso/reposTable";
import { cibles } from "@/components/village/iso/tapBatiment";
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
    ecrans: cibles(montres, (code) => stadeDemo(code, palier)),
  };
};
const poses = (palier: VillageTier, jour: number) => placerHabitants(palier, carteDe(palier), jour);

describe("the resting poses (T40)", () => {
  test("a pose per inhabitant from tier 1, by the day's seed, changing from day to day", () => {
    // Except the one wearing the trade of its building: it stands in its own sprite (qa-audit2).
    for (const p of PALIERS)
      for (const g of poses(p, 3)) expect(g.pose !== undefined || g.metier === true).toBe(true);
    expect(poses(12, 5)).toEqual(poses(12, 5));
    const jours = new Set(
      Array.from({ length: 8 }, (_, j) =>
        poses(12, j)
          .map((g) => g.pose)
          .join(),
      ),
    );
    expect(jours.size).toBeGreaterThan(3);
  });

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a sweep over days, tiers and inhabitants, kept in one place
  test("a pose is taken only from its tier and where it fits", () => {
    for (let j = 0; j < 10; j++)
      for (const p of PALIERS)
        for (const g of poses(p, j)) {
          if (g.metier && !g.pose) continue;
          // A story's scene (histoires.ts) picks its own cells, e.g. the dispute at the forge.
          if (g.histoire) continue;
          const t = POSES_REPOS.find((x) => x.id === g.pose);
          assert(t);
          expect(t.palier).toBeLessThanOrEqual(p);
          expect(t.lieux.includes(g.lieu) || t.lieux.includes("batiment")).toBe(true);
        }
  });

  test("a talking pair stands on two neighbouring cells, the first one drawing for both", () => {
    let paires = 0;
    for (let j = 0; j < 40; j++) {
      const gens = poses(12, j);
      for (const g of gens.filter((x) => x.compagnon)) {
        const autre = gens.find((x) => x.id === g.avec);
        assert(autre);
        expect(autre.avec).toBe(g.id);
        expect(autre.compagnon).toBeUndefined();
        const [dx, dy] = [autre.cellule[0] - g.cellule[0], autre.cellule[1] - g.cellule[1]];
        expect(Math.abs(dx) + Math.abs(dy)).toBe(1);
        paires++;
      }
    }
    expect(paires).toBeGreaterThan(0);
  });

  test("the cat pose is never drawn: no animal of the map is a cat since the old one left (the wall's is painted)", () => {
    for (let j = 0; j < 60; j++) {
      expect(poses(12, j).some((g) => g.pose === "joue_chat")).toBe(false);
      for (const g of placerHabitants(12, carteDe(12), j)) expect(g.pose).not.toBe("joue_chat");
    }
  });

  test("whoever the party moved stands up, and so does its partner", () => {
    for (let j = 0; j < 40; j++) {
      const gens = poses(12, j);
      const g = gens.find((x) => x.compagnon);
      if (!g) continue;
      const bouges = gens.map((x) => (x.id === g.id ? { ...x, cellule: [0, 0] as Case } : x));
      const apres = garderPoses(bouges, gens);
      expect(apres.find((x) => x.id === g.id)?.pose).toBeUndefined();
      expect(apres.find((x) => x.id === g.avec)?.pose).toBeUndefined();
      expect(garderPoses(gens, gens)).toEqual(gens);
      return;
    }
    throw new Error("no pair in 40 days");
  });
});

describe("inhabitants and the buildings drawn in front of them (T40)", () => {
  test("over 30 seeds at tiers 1, 6 and 12, no figure is hidden by more than the limit", () => {
    for (const palier of [1, 6, 12] as const) {
      const { ecrans } = carteDe(palier);
      assert(ecrans && ecrans.length > 0);
      for (let j = 0; j < 30; j++)
        for (const g of poses(palier, j))
          expect([palier, j, g.id, couverture(g.cellule, ecrans) <= COUVERT_MAX]).toEqual([
            palier,
            j,
            g.id,
            true,
          ]);
    }
  });

  test("cells hidden at tier 6 (behind the forge and the archery range) are caught", () => {
    const { ecrans } = carteDe(6);
    assert(ecrans);
    for (const cellule of [
      [12, 7],
      [13, 12],
    ] as const)
      expect([cellule, couverture(cellule, ecrans) > COUVERT_MAX]).toEqual([cellule, true]);
  });

  test("a sleeper lies right against its building's front wall, mirrored to that side", () => {
    let dormeurs = 0;
    for (let j = 0; j < 60; j++)
      for (const g of poses(12, j).filter((x) => x.pose === "dort" && !x.histoire)) {
        const e = emplacements[g.lieu as BuildingCode];
        const [cx, cy] = e.coin;
        const [w, d] = e.emprise;
        const x = g.cellule[0] === cx + w && g.cellule[1] >= cy && g.cellule[1] < cy + d;
        const y = g.cellule[1] === cy + d && g.cellule[0] >= cx && g.cellule[0] < cx + w;
        expect([x || y, g.miroir]).toEqual([true, x]);
        dormeurs++;
      }
    expect(dormeurs).toBeGreaterThan(0);
  });
});

describe("the touch box of a resting pose (T40)", () => {
  const cibleDe = (id: "assis_tonneau" | "dort", miroir = false) => {
    const pose = poseDe(id);
    assert(pose);
    const mi: Case = [5.5, 5.5];
    const [px, py] = ecranXY(mi);
    return {
      id: "h0",
      role: "forge",
      habitant: true,
      pied: [px, py],
      l: TOUCHE_L,
      h: TOUCHE_H,
      boite: boiteDePose(pose, poseChute(mi, pose.image), miroir, TOUCHE_L),
    } as unknown as Parameters<typeof villageoisAuPoint>[1][number];
  };

  test("every pose's figure box sits inside its canvas and holds its anchor column", () => {
    for (const p of POSES_REPOS) {
      const [x0, y0, x1, y1] = p.corps;
      expect(x0).toBeGreaterThanOrEqual(0);
      expect(y0).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(p.image.size[0]);
      expect(y1).toBeLessThanOrEqual(p.image.size[1]);
      expect(p.corps[0]).toBeLessThan(p.image.anchor[0]);
      expect(p.corps[2]).toBeGreaterThan(p.image.anchor[0]);
    }
  });

  test("a sleeper: its body is touched, the empty air a standing figure would fill is not", () => {
    const c = cibleDe("dort");
    const [x0, y0, x1, y1] = c.boite ?? [0, 0, 0, 0];
    const milieu: [number, number] = [(x0 + x1) / 2, (y0 + y1) / 2];
    expect(villageoisAuPoint(milieu, [c])).toBe(c);
    // The standing figure's box reaches TOUCHE_H above the feet; a lying one does not.
    const ciel: [number, number] = [c.pied[0], c.pied[1] - TOUCHE_H + 2];
    expect(ciel[1]).toBeLessThan(y0);
    expect(villageoisAuPoint(ciel, [{ ...c, boite: undefined }])?.id).toBe(c.id);
    expect(villageoisAuPoint(ciel, [c])).toBeNull();
  });

  test("a seated inhabitant: touched on its own box, whose bottom is not the feet's 4 dp", () => {
    const c = cibleDe("assis_tonneau");
    const [x0, y0, x1, y1] = c.boite ?? [0, 0, 0, 0];
    expect(villageoisAuPoint([(x0 + x1) / 2, (y0 + y1) / 2], [c])).toBe(c);
    expect(villageoisAuPoint([(x0 + x1) / 2, y1 + 1], [c])).toBeNull();
    expect(villageoisAuPoint([(x0 + x1) / 2, y0 - 1], [c])).toBeNull();
    expect(Math.min(x1 - x0, y1 - y0)).toBeGreaterThanOrEqual(TOUCHE_L - 1e-9);
  });

  test("turned, the box is mirrored about the canvas", () => {
    const pose = poseDe("dort");
    assert(pose);
    const rect = poseChute([5.5, 5.5], pose.image);
    const un = boiteDePose(pose, rect, false, 0);
    const autre = boiteDePose(pose, rect, true, 0);
    expect((un[0] + un[2]) / 2 + (autre[0] + autre[2]) / 2).toBeCloseTo(
      2 * (rect.x + rect.w / 2),
      5,
    );
  });
});
