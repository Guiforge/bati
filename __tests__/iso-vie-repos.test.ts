// E5: what moves at rest and how the reveal's caption is placed. The cloud shadows cross the whole
// map and come back off it; the flock's path changes from one crossing to the next; the caption
// sits over the building that rose, or at the bottom when the roof is too near the top.

import { CYCLE_MS } from "@/components/village/iso/horloge";
import { placeLegende } from "@/components/village/iso/revelation";
import { NUAGE_MS, NUAGES, nuageA, VOL_H, volCorbeaux } from "@/components/village/iso/vivant";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

describe("cloud shadows", () => {
  const largeur = 1600;
  test("each crosses the map in NUAGE_MS (40 to 60 s) and is off the map when it jumps back", () => {
    expect(NUAGE_MS).toBeGreaterThanOrEqual(40000);
    expect(NUAGE_MS).toBeLessThanOrEqual(60000);
    NUAGES.forEach((n, i) => {
      // The clock where this shadow's crossing starts: its centre a full patch off the left edge.
      const debut = (1 - n.decalage) * NUAGE_MS;
      expect(nuageA(debut, i, largeur).x).toBeCloseTo(-2 * n.rx, 3);
      expect(nuageA(debut + NUAGE_MS - 1, i, largeur).x).toBeGreaterThan(largeur + 2 * n.rx - 1);
      expect(nuageA(debut + NUAGE_MS / 2, i, largeur).x).toBeCloseTo(largeur / 2, 0);
    });
  });
  test("the two never stand together", () => {
    expect(Math.abs((NUAGES[0]?.decalage ?? 0) - (NUAGES[1]?.decalage ?? 0))).toBeGreaterThan(0.3);
  });
});

describe("the flock (anim-36)", () => {
  test("its height is drawn anew at each crossing, over the frame's middle", () => {
    const h = 800;
    // Mid-cycle of every cycle a wave may play it in: the one it flies in shows.
    const vols = Array.from({ length: 12 }, (_, n) =>
      [0, 1, 2].map((k) => volCorbeaux((k + 0.5) * CYCLE_MS, { n: n + 1, c0: 0 }, 400, h)),
    )
      .flat()
      .filter((v) => v.opacite === 1);
    expect(vols).toHaveLength(12);
    const milieux = vols.map((v) => v.y + VOL_H / 2);
    expect(Math.min(...milieux)).toBeGreaterThan(h * 0.2);
    expect(Math.max(...milieux)).toBeLessThan(h * 0.7);
    expect(new Set(milieux.map(Math.round)).size).toBeGreaterThan(6);
  });
});

describe("the caption's place (anim-33)", () => {
  const aire = { w: 400, h: 800, bas: 40 };
  test("above the building's top, centred on it, inside the frame", () => {
    const b = placeLegende([200, 400], aire, 24);
    expect(b.left + b.width / 2).toBeCloseTo(200, 3);
    expect(aire.h - b.bottom).toBeLessThan(400);
    expect(placeLegende([10, 400], aire, 24).left).toBe(16);
  });
  test("at the bottom of the frame when the roof is too near the top, or unknown", () => {
    expect(placeLegende([200, 60], aire, 24).bottom).toBe(aire.bas + 16);
    expect(placeLegende(null, aire, 24).bottom).toBe(aire.bas + 16);
  });
});
