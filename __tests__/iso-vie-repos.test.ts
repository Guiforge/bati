// E5: what moves at rest and how the reveal's caption is placed. The cloud shadows cross the whole
// map and come back off it; the caption
// sits over the building that rose, or at the bottom when the roof is too near the top.

import { placeLegende } from "@/components/village/iso/revelation";
import { NUAGE_MS, NUAGES, nuageA } from "@/components/village/iso/vivant";

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
