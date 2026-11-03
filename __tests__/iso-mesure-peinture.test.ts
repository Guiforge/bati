import { DONNEES_BLD } from "@/components/village/iso/donneesBld";
import { zoneOmbre } from "@/components/village/iso/ombres";
import { batimentEssai } from "@/constants/buildings/essai";
import { buildingCodes } from "@/db/schema";

describe("measured painting values (new art), optional", () => {
  test("no building has measures yet, and without them zoneOmbre reads heights.json as before", () => {
    for (const code of buildingCodes) expect(DONNEES_BLD[code]?.mesure).toBeUndefined();
    expect(zoneOmbre("windmill", batimentEssai)).toEqual(zoneOmbre("windmill"));
  });

  test("when present, the measured contact wins over heights.json", () => {
    const mesure = {
      sommet: 10,
      contact: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
    } as const;
    const zone = zoneOmbre("windmill", { ...batimentEssai, mesure });
    expect(zone).toHaveLength(4);
    expect(zone).not.toEqual(zoneOmbre("windmill"));
  });
});
