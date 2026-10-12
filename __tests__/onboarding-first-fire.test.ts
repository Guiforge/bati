import { chimneyAnchor, VILLAGE_NAMES } from "@/constants/onboarding";

/**
 * The naming screen's embers leave from the hamlet's chimney, wherever `cover` puts it in the
 * band the painting gets (components/onboarding/FirstFire.tsx).
 */
describe("the chimney of the hamlet, in its band", () => {
  test("a band as wide as the painting's ratio shows it unscaled in proportion", () => {
    // 1024x861 at half size, nothing cropped: the chimney is at half its source position.
    expect(chimneyAnchor(512, 430.5, 0.5)).toEqual({ x: 197.5, y: 134 });
  });

  test("a wide, short band crops vertically and follows where the painting is held", () => {
    const top = chimneyAnchor(360, 170, 0);
    const lower = chimneyAnchor(360, 170, 0.45);
    expect(top?.x).toBeCloseTo(138.9, 1);
    expect(top?.y).toBeCloseTo(94.2, 1);
    // Held lower down the painting, the chimney moves up the band.
    expect(lower?.y).toBeCloseTo(34.5, 1);
  });

  test("no anchor when the band has folded the chimney away, or has no size yet", () => {
    expect(chimneyAnchor(360, 60, 1)).toBeNull();
    expect(chimneyAnchor(0, 0, 0.5)).toBeNull();
  });
});

test("every drawn village name is one the field accepts", () => {
  for (const name of VILLAGE_NAMES) {
    expect(name.length).toBeGreaterThanOrEqual(3);
    expect(name.length).toBeLessThanOrEqual(20);
  }
  expect(new Set(VILLAGE_NAMES).size).toBe(VILLAGE_NAMES.length);
});
