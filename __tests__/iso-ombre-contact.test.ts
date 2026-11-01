import { ombreContactDe } from "@/components/village/iso/carteDemo";
import { emplacements } from "@/components/village/iso/isoLayout";
import { aire } from "@/components/village/iso/ombres";
import { buildingCodes } from "@/db/schema";

describe("ombreContactDe (AUDIT-DA 26, T39)", () => {
  it("is one polygon under a building with a sprite", () => {
    const o = ombreContactDe("wizard_tower", "solid", "nuit");
    expect(o).toHaveLength(1);
    expect(o[0]?.length).toBeGreaterThanOrEqual(3);
  });
  it("is empty for a plot with no sprite at that stage", () => {
    expect(ombreContactDe("castle_wall", "grand", "jour")).toEqual([]);
  });
  it("follows the socle: within the footprint, never wider than the socle", () => {
    let vus = 0;
    for (const code of buildingCodes) {
      const [w, h] = emplacements[code].emprise;
      const [p] = ombreContactDe(code, "rough", "nuit");
      if (!p) continue;
      vus++;
      expect(aire(p)).toBeGreaterThan(w * h * 0.4);
      expect(aire(p)).toBeLessThan(w * h * 1.01);
    }
    expect(vus).toBeGreaterThan(5);
  });
});
