import assert from "node:assert/strict";
import { ombreSocleDe, spriteDe } from "@/components/village/iso/carteDemo";
import { batiments, DEJA_PEINTE, nomImage, type Volume } from "@/components/village/iso/isoSpec";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import {
  aire,
  CAMERA,
  LUNE,
  ombreSocle,
  type Point,
  soustraire,
} from "@/components/village/iso/ombres";
import spec from "@/constants/isoSpec.json";
import { buildingCodes } from "@/db/schema";

// L3-T01: the building's own shadow on its socle's top, which the painted sprites no longer carry
// (H1). The geometry is ombres.ts `ombreSocle`; the index holds it for the painted stages.

const boite = (x: number, y: number, w: number, d: number, z0: number, z1: number): Volume => ({
  emissive: false,
  noShadow: false,
  vertices: [x, x + w].flatMap((vx) =>
    [y, y + d].flatMap((vy) => [z0, z1].map((z): [number, number, number] => [vx, vy, z])),
  ),
});

const dedans = (p: Point, poly: readonly Point[]) =>
  poly.every((a, i) => {
    const b = poly[(i + 1) % poly.length] ?? a;
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= -1e-9;
  });

describe("ombreSocle, from the volumes", () => {
  // A 1 x 1 socle 0.1 thick, a pole 0.2 wide and 1 high standing at its centre.
  const socle = boite(0, 0, 1, 1, 0, 0.1);
  const mat = boite(0.4, 0.4, 0.2, 0.2, 0.1, 1.1);

  test("the camera looks from +gx +gy, 30 degrees up: a point and its hidden plane point share a pixel", () => {
    const [cx, cy, cz] = CAMERA;
    expect([cx, cy, cz].map((v) => Math.round(v * 1000) / 1000)).toEqual([0.612, -0.612, 0.5]);
    const h = spec.pxPerUnit * Math.sin(Math.PI / 3);
    const px = ([gx, gy, z]: readonly [number, number, number]): Point => [
      ((gx - gy) * spec.S) / 2,
      ((gx + gy) * spec.S) / 4 - z * h,
    ];
    // The pole's top corner seen from the camera hides this plane point: the plane at z 0.1.
    const sommet: [number, number, number] = [0.6, 0.6, 1.1];
    const t = (sommet[2] - 0.1) / cz;
    const cache: [number, number, number] = [sommet[0] - t * cx, sommet[1] + t * cy, 0.1];
    const [a, b] = [px(sommet), px(cache)];
    expect(a[0]).toBeCloseTo(b[0], 3);
    expect(a[1]).toBeCloseTo(b[1], 3);
  });

  test("the pole throws a shadow toward +gx and -gy, inside the socle, and not under itself", () => {
    const pieces = ombreSocle([socle, mat], 0.1, [1, 1]);
    expect(pieces.length).toBeGreaterThan(0);
    for (const p of pieces) {
      expect(aire(p)).toBeGreaterThan(0);
      for (const [x, y] of p) {
        expect(x).toBeGreaterThanOrEqual(-1e-9);
        expect(x).toBeLessThanOrEqual(1 + 1e-9);
        expect(y).toBeGreaterThanOrEqual(-1e-9);
        expect(y).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
    const sur = (p: Point) => pieces.some((q) => dedans(p, q));
    expect(sur([0.8, 0.2])).toBe(true);
    expect(sur([0.1, 0.9])).toBe(false);
    // Its own base, which the sprite draws as the pole.
    expect(sur([0.5, 0.5])).toBe(false);
  });

  test("a part lower than the socle's top casts none, and a lamp's glow (emissive) casts none", () => {
    expect(ombreSocle([socle, boite(0.4, 0.4, 0.2, 0.2, 0, 0.1)], 0.1, [1, 1])).toEqual([]);
    expect(ombreSocle([socle, { ...mat, emissive: true }], 0.1, [1, 1])).toEqual([]);
  });

  test("under the light of a higher sun the shadow is shorter", () => {
    const area = (l: readonly [number, number, number]) =>
      ombreSocle([socle, mat], 0.1, [1, 1], l).reduce((s, p) => s + aire(p), 0);
    expect(area([-0.2, -0.2, 0.96])).toBeLessThan(area(LUNE));
  });

  test("a convex polygon minus a convex one leaves disjoint pieces of the right area", () => {
    const grand: Point[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ];
    const petit: Point[] = [
      [1, 1],
      [2, 1],
      [2, 3],
      [1, 3],
    ];
    const pieces = soustraire(grand, petit);
    expect(pieces.reduce((s, p) => s + aire(p), 0)).toBeCloseTo(16 - 2, 9);
    expect(soustraire(grand, [[5, 5]])).toEqual([grand]);
  });
});

describe("the painted stages' index entries", () => {
  const peintes = Object.entries(MAQUETTES).filter(([, s]) => s.socle);

  test("every building stage has one, in both lights (F2: all painted, no mock-up left)", () => {
    expect(peintes.map(([cle]) => cle).toSorted()).toEqual(
      buildingCodes
        .flatMap((c) => batiments[c].stades.map((st) => `${c}/${st}`))
        .flatMap((c) => [`${c}.nuit.webp`, `${c}.jour.webp`])
        .toSorted(),
    );
  });

  test.each(peintes)("%s: the shadow is not empty and stays in the socle's diamond", (cle, s) => {
    const code = cle.split("/")[0];
    const b = batiments[buildingCodes.find((c) => c === code) ?? "forge"];
    assert(b.emprise && s.socle);
    const [w, d] = b.emprise;
    expect(s.socle.ombre.length).toBeGreaterThan(0);
    for (const o of s.socle.ombre) {
      expect(o.length).toBeGreaterThanOrEqual(6);
      for (let i = 0; i < o.length; i += 2) {
        expect(o[i]).toBeGreaterThanOrEqual(-1e-9);
        expect(o[i]).toBeLessThanOrEqual(w + 1e-9);
        expect(o[i + 1]).toBeGreaterThanOrEqual(-1e-9);
        expect(o[i + 1]).toBeLessThanOrEqual(d + 1e-9);
      }
    }
  });
});

describe("what the map draws", () => {
  test("the exceptions are painted images that carry the shadow: the map draws none over them", () => {
    // Empty since iter 4 (H3-15): the day sprites carry no shadow of their own.
    expect([...DEJA_PEINTE]).toEqual([]);
    for (const cle of DEJA_PEINTE) {
      const [code, stade] = cle.split(/[/.]/);
      const b = buildingCodes.find((c) => c === code);
      const st = (["rough", "solid", "grand"] as const).find((s) => s === stade);
      assert(b && st);
      expect(MAQUETTES[cle]?.socle).toBeDefined();
      expect(ombreSocleDe(b, st)).toBeNull();
      expect(nomImage(b, st, "nuit")).toBe(cle);
    }
  });

  test("every other painted stage draws it, and a mock-up draws none", () => {
    for (const code of buildingCodes)
      for (const stade of batiments[code].stades) {
        const cle = nomImage(code, stade, "nuit");
        const attendu = spriteDe(code, stade)?.socle !== undefined && !DEJA_PEINTE.has(cle);
        const o = ombreSocleDe(code, stade);
        expect([cle, o !== null]).toEqual([cle, attendu]);
        expect([
          cle,
          (o?.rect.w ?? 1) > 0 && (o?.rect.h ?? 1) > 0 && (o?.d ?? "M").startsWith("M"),
        ]).toEqual([cle, true]);
      }
  });
});
