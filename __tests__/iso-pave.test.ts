jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

import { emplacements } from "@/components/village/iso/isoLayout";
import { estPave, pavageCase, RAYON_PAVE } from "@/components/village/iso/pave";
import { dessinGalet } from "@/components/village/iso/solVarie";

describe("the paving of the square (AUDIT-DA 8)", () => {
  test("ten stones a cell, deterministic, tints a subset of the joints", () => {
    const p = pavageCase(10, 8);
    expect(p.joints.match(/Z/g)).toHaveLength(10);
    expect(pavageCase(10, 8)).toEqual(p);
    expect(p.clairs.length).toBeLessThanOrEqual(p.joints.length);
    expect(p.sombres.length).toBeLessThanOrEqual(p.joints.length);
    expect(p.clairs).not.toBe(pavageCase(11, 8).clairs);
  });

  test("only the cells near the campfire hold paving", () => {
    const [x, y] = emplacements.campfire.coin;
    expect(estPave(x, y)).toBe(true);
    expect(estPave(x + RAYON_PAVE, y)).toBe(true);
    expect(estPave(x + RAYON_PAVE + 1, y)).toBe(false);
  });
});

describe("the pebbles (AUDIT-DA 9)", () => {
  test("an irregular seven-corner pebble, the same every time", () => {
    const d = dessinGalet(100, 50, 2, 1);
    expect(d.match(/L/g)).toHaveLength(6);
    expect(dessinGalet(100, 50, 2, 1)).toBe(d);
    expect(dessinGalet(104, 50, 2, 1)).not.toBe(d);
  });
});
