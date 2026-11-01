import { vueFoyer, ZOOM_MAX } from "@/components/village/iso/carteDemo";

describe("vueFoyer (?foyer= close view)", () => {
  test("keeps the asked zoom on a big area", () => {
    const v = vueFoyer("forge", 12, "jour", 4000, 4000, 1.6);
    expect(v.zoom).toBeCloseTo(1.6);
    expect(Number.isFinite(v.x + v.y)).toBe(true);
  });
  test("backs off so the whole sprite fits a small area, never past the bounds", () => {
    const v = vueFoyer("castle_wall", 12, "jour", 200, 200, 99);
    expect(v.zoom).toBeLessThan(1.6);
    expect(v.zoom).toBeLessThanOrEqual(ZOOM_MAX);
  });
});
