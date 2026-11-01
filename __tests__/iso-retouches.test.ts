import { MAQUETTES } from "@/components/village/iso/maquettes";
import { RETOUCHES } from "@/components/village/iso/retouches";

describe("Retouches (AUDIT-DA 39)", () => {
  test("campfire_rough polygons are in the px of a 512 x 768 sprite: repaint the sprite, redo the polygons", () => {
    const s = MAQUETTES["campfire/rough.nuit.webp"];
    expect(s?.size).toEqual([512, 768]);
    for (const f of RETOUCHES.campfire_rough ?? []) {
      for (const pt of f.points.split(" ")) {
        const [x = Number.NaN, y = Number.NaN] = pt.split(",").map(Number);
        expect(x).toBeLessThanOrEqual(512);
        expect(y).toBeLessThanOrEqual(768);
      }
    }
  });
});
