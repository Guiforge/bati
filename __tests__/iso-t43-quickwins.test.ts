// T43 round 1, the quick wins of the code side: thickets, lamp post, street stones, night pools.
import {
  ECHELLE_LANTERNE_POSE,
  etatCarte,
  LANTERNES,
  ombresPiece,
  posePiece,
  reduitPiece,
  stadeDemo,
} from "@/components/village/iso/carteDemo";
import { emplacements } from "@/components/village/iso/isoLayout";
import { LISIERE } from "@/components/village/iso/lisiere";
import { BOSQUETS, RAYON_BOSQUET } from "@/components/village/iso/lisiereChoix";
import { flaquesDe } from "@/components/village/iso/lueurs";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { bornePath, bornesDeRue } from "@/components/village/iso/rues";
import { ZONE_LUCIOLES } from "@/components/village/iso/vivant";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));

describe("decor in thickets", () => {
  const dist = ([gx, gy]: readonly number[]) =>
    Math.min(...BOSQUETS.map(([bx = 0, by = 0]) => Math.hypot((gx ?? 0) - bx, (gy ?? 0) - by)));

  test("three groves, and fewer pieces than the even sowing (156 before)", () => {
    expect(BOSQUETS).toHaveLength(3);
    expect(LISIERE.length).toBeLessThan(100);
    expect(LISIERE.length).toBeGreaterThan(40);
  });

  test("the pieces gather in the groves: dense inside, thin between", () => {
    const dedans = LISIERE.filter((p) => dist(p.case) <= RAYON_BOSQUET + 1).length;
    const dehors = LISIERE.length - dedans;
    // The groves' area is a small share of the ring, yet they hold a third of the pieces or more.
    expect(dedans / LISIERE.length).toBeGreaterThan(0.3);
    expect(dehors).toBeGreaterThan(0);
  });
});

describe("the tier-1 lamp post", () => {
  test("is drawn at 0.6 of its size, and its shadow with it", () => {
    expect(reduitPiece("decor/lanterne.nuit.webp")).toBe(ECHELLE_LANTERNE_POSE);
    expect(ECHELLE_LANTERNE_POSE).toBeLessThan(1);
    const l = LANTERNES[0];
    const s = l && MAQUETTES[l.cle];
    expect(l && s).toBeTruthy();
    if (!l || !s) return;
    const h = posePiece(l.case, s).h * ECHELLE_LANTERNE_POSE;
    // A tent's canvas is 168 dp high at stage 1; the post, reduced, stays well under it.
    expect(h).toBeLessThan(0.5 * 168);
    for (const poly of ombresPiece(l))
      for (const [x, y] of poly) {
        expect(x).toBeGreaterThanOrEqual(l.case[0] - 1e-6);
        expect(y).toBeGreaterThanOrEqual(l.case[1] - 1e-6);
      }
  });
});

describe("street arms end on a stone", () => {
  test("tier 1: every street cell that carries on past the rim gets a stone, none once the island is whole", () => {
    const v1 = etatCarte(1, false).visible;
    const bornes1 = bornesDeRue((gx, gy) => v1[gy]?.[gx] === true);
    expect(bornes1.length).toBeGreaterThan(0);
    const v12 = etatCarte(12, false).visible;
    expect(bornesDeRue((gx, gy) => v12[gy]?.[gx] === true)).toEqual([]);
  });

  test("a stone is a small closed outline, the same on every call", () => {
    const [p] = bornesDeRue(() => false);
    expect(p).toBeUndefined();
    const v1 = etatCarte(1, false).visible;
    const [q] = bornesDeRue((gx, gy) => v1[gy]?.[gx] === true);
    expect(q).toBeDefined();
    if (!q) return;
    expect(bornePath(q)).toBe(bornePath(q));
    expect(bornePath(q)).toMatch(/^M.*Z$/);
  });
});

describe("the night's warm pools", () => {
  const stade = (code: BuildingCode) => stadeDemo(code, 12);

  test("the campfire and the lit houses make pools, a ruin or nothing makes none", () => {
    const { montres } = etatCarte(12, false);
    const f = flaquesDe(montres, stade);
    expect(f.length).toBeGreaterThan(3);
    expect(flaquesDe(["campfire"], stade)).toHaveLength(1);
    expect(flaquesDe([], stade)).toEqual([]);
  });

  test("the colours bake their alpha, no violet", () => {
    for (const c of [
      rawColors.isoFlaqueNuit,
      rawColors.isoFlaqueNuitCoeur,
      rawColors.isoFlaqueFoyer,
      rawColors.isoFlaqueFoyerCoeur,
    ]) {
      const m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(c);
      expect(m).not.toBeNull();
      const [r, g, b] = [Number(m?.[1]), Number(m?.[2]), Number(m?.[3])];
      expect(r).toBeGreaterThan(g);
      expect(g).toBeGreaterThan(b);
      expect(Number(m?.[4])).toBeLessThan(0.36);
    }
  });
});

describe("the fireflies' patch", () => {
  test("no cell of it falls on a building's footprint, whatever the tier", () => {
    const { gx, gy } = ZONE_LUCIOLES;
    const pris = new Set(
      Object.values(emplacements).flatMap((e) => e.cases.map((c) => c.join(","))),
    );
    const cases = [];
    for (let x = gx[0]; x < gx[1]; x++) for (let y = gy[0]; y < gy[1]; y++) cases.push(`${x},${y}`);
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.filter((c) => pris.has(c))).toEqual([]);
  });
});
