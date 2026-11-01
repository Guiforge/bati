import type { CrestShape } from "@/components/village/Crest";
import { BANNIERES_MAX, bannieres, tissuBlason } from "@/components/village/iso/fierte";
import { batiments } from "@/components/village/iso/isoSpec";
import { rawColors } from "@/constants/rawColors";
import { type BuildingCode, buildingCodes } from "@/db/schema";

const ours: CrestShape = {
  animal: "bear",
  manual: false,
  quarters: null,
  longestFlame: 0,
  rings: 0,
  second: null,
};
const cerf: CrestShape = { ...ours, animal: "stag" };

describe("the banner cloth", () => {
  test("a banner takes its animal's colour, nothing before the reveal", () => {
    expect(tissuBlason(null)).toBeNull();
    expect(tissuBlason(ours)).toBe(rawColors.animalBear);
    expect(tissuBlason(cerf)).toBe(rawColors.animalStag);
    expect(tissuBlason(ours)).not.toBe(tissuBlason(cerf));
  });
});

describe("bannieres", () => {
  const dernier = (c: BuildingCode) => batiments[c].stades.at(-1) ?? "solid";
  test("three at most, the heroes hall and the castle first", () => {
    const tous = bannieres(buildingCodes, dernier);
    expect(tous.size).toBe(BANNIERES_MAX);
    expect(tous.has("heroes_hall")).toBe(true);
    expect(tous.has("castle_wall")).toBe(true);
  });
  test("only a legendary building on its last stage flies one", () => {
    expect(bannieres([], dernier).size).toBe(0);
    expect(bannieres(["forge"], () => "solid").size).toBe(0);
    expect(bannieres(["campfire", "high_road"], dernier).size).toBe(0);
    expect([...bannieres(["forge"], dernier)]).toEqual(["forge"]);
  });
});
