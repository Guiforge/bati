import { type Bande, bandes } from "@/components/village/iso/bandesBord";
import { HAUTEUR, LARGEUR } from "@/components/village/iso/carteDemo";

// The vignette's weight at a point: the sum of its strips, each linear along its axis.
const poids = (x: number, y: number, bs: readonly Bande[]) =>
  bs.reduce((s, b) => {
    // half-open on the far side so two strips that touch count once
    if (x < b.x || x >= b.x + b.w || y < b.y || y >= b.y + b.h) return s;
    const t = b.axe === "x" ? (x - b.x) / b.w : (y - b.y) / b.h;
    return s + b.de + (b.vers - b.de) * t;
  }, 0);

describe("the vignette has no inner edge (iter-02 seam)", () => {
  const bs = bandes();
  const pas = 0.5;
  // the steepest ramp is 1 over the thinnest band; a step bigger than that is a seam
  const pente = Math.max(
    ...bs.filter((b) => b.de !== b.vers).map((b) => 1 / (b.axe === "x" ? b.w : b.h)),
  );

  test("walking across the map, overflow included, the weight never jumps", () => {
    const [x0, x1, y0, y1] = [-LARGEUR, 2 * LARGEUR, -HAUTEUR, 2 * HAUTEUR];
    for (const y of [
      y0 + 1,
      -50,
      0.25,
      HAUTEUR * 0.1,
      HAUTEUR / 2,
      HAUTEUR - 0.25,
      HAUTEUR + 50,
      y1 - 1,
    ]) {
      for (let x = x0; x < x1; x += pas)
        expect(Math.abs(poids(x + pas, y, bs) - poids(x, y, bs))).toBeLessThanOrEqual(
          pente * pas + 1e-9,
        );
    }
    for (const x of [
      x0 + 1,
      -50,
      0.25,
      LARGEUR * 0.1,
      LARGEUR * 0.3,
      LARGEUR / 2,
      LARGEUR * 0.7,
      LARGEUR + 50,
      x1 - 1,
    ]) {
      for (let y = y0; y < y1; y += pas)
        expect(Math.abs(poids(x, y + pas, bs) - poids(x, y, bs))).toBeLessThanOrEqual(
          pente * pas + 1e-9,
        );
    }
  });

  test("the middle of the map is free of it", () => {
    expect(poids(LARGEUR / 2, HAUTEUR / 2, bs)).toBe(0);
  });
});
