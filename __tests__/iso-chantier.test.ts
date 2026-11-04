import { echafaudageDe } from "@/components/village/iso/chantier";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { echelleEchafaudage } from "@/components/village/iso/moment";
import { buildingCodes } from "@/db/schema";

describe("the scaffold of a footprint", () => {
  test("a scaffold exists in the index for every footprint", () => {
    for (const code of buildingCodes) expect(MAQUETTES[echafaudageDe(code)]).toBeDefined();
  });

  test("a plot beyond 2 cells wears the 2 x 2 enlarged, a smaller one as it is", () => {
    for (const code of buildingCodes) expect(echelleEchafaudage(code)).toBeGreaterThanOrEqual(1);
  });
});
