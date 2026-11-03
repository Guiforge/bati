// A painted building's tap mask is its own stage's: legendary and mythic are taller than grand,
// so the top of the tower must be tappable. Flags forced on here (they are off under jest).
jest.mock("@/constants/isoPoc", () => {
  const actual = jest.requireActual("@/constants/isoPoc");
  return { ...actual, BLD_PEINTS: new Proxy({}, { get: () => true }) };
});

import { peintDe } from "@/components/village/iso/peints";
import { cibles } from "@/components/village/iso/tapBatiment";

describe("the tap reads the painted stage's mask", () => {
  test("mythic: its own mask, not the grand one", () => {
    const [cible] = cibles(["wizard_tower"], () => "grand", undefined, [], () => "mythic");
    expect(cible?.masque).toBe(peintDe("wizard_tower", "mythic", "nuit")?.masque);
    expect(cible?.masque).not.toBe(peintDe("wizard_tower", "grand", "nuit")?.masque);
  });

  test("without the painted stage, the map's stage keeps its mask", () => {
    const [cible] = cibles(["wizard_tower"], () => "grand");
    expect(cible?.masque).toBe(peintDe("wizard_tower", "grand", "nuit")?.masque);
  });
});
