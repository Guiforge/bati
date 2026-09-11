import { groupFamilies } from "@/components/village/rows";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import {
  buildingCeiling,
  formatGrown,
  isDayOne,
  isVillageComplete,
  parseGrown,
  pickNextToRise,
  type VillageBuilding,
} from "@/db/village";

/**
 * The rules the village screen is laid out by. Each one is a sentence the screen says out loud
 * ("the closest", "day one", "finished"), so each one getting quietly wrong is a screen that lies.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

function b(
  code: BuildingCode,
  level: number,
  extra: Partial<VillageBuilding> = {},
): VillageBuilding {
  const def = buildingDefinitions[code];
  return {
    code,
    emoji: "",
    tier: def.tier,
    level,
    enName: code,
    frName: code,
    unlockCondition: "",
    relatedMuscle: def.relatedMuscle,
    driver: def.tier === 1 ? "tier" : def.tier === 3 ? "prereq" : "muscle",
    metricValue: 0,
    nextTarget: null,
    ...extra,
  };
}

const starters = [b("campfire", 1), b("tent", 1), b("training_dummy", 1)];

describe("pickNextToRise", () => {
  it("picks the fewest reps away, not the fullest bar", () => {
    const forge = b("forge", 1, { metricValue: 60, nextTarget: 100 }); // 60 %, 40 reps
    const farm = b("farm", 4, { metricValue: 650, nextTarget: 1000 }); // 65 %, 350 reps
    expect(pickNextToRise([...starters, farm, forge])?.code).toBe("forge");
  });

  it("never picks an unbuilt one, which one rep would always win", () => {
    const quarry = b("quarry", 0, { metricValue: 0, nextTarget: 1 });
    const farm = b("farm", 2, { metricValue: 300, nextTarget: 600 });
    expect(pickNextToRise([...starters, quarry, farm])?.code).toBe("farm");
  });

  it("falls back to the deed with the most of its bar filled once the reps are all spent", () => {
    const farm = b("farm", 5);
    const road = b("high_road", 2, { driver: "leagues", metricValue: 30, nextTarget: 40 });
    const lair = b("dragon_lair", 1, { driver: "bosses", metricValue: 1, nextTarget: 2 });
    expect(pickNextToRise([...starters, farm, lair, road])?.code).toBe("high_road");
  });

  it("has nothing to say on day one, and a walk is enough to leave it", () => {
    const quarry = b("quarry", 0, { nextTarget: 1 });
    expect(isDayOne([...starters, quarry])).toBe(true);
    expect(pickNextToRise([...starters, quarry])).toBeNull();

    const road = b("high_road", 1, { driver: "leagues", metricValue: 3, nextTarget: 15 });
    expect(isDayOne([...starters, road])).toBe(false);
    expect(pickNextToRise([...starters, road])?.code).toBe("high_road");
  });
});

describe("the grown param", () => {
  it("round-trips what the victory screen writes", () => {
    const growth = [
      { code: "farm" as const, oldLevel: 3, newLevel: 4 },
      { code: "barn" as const, oldLevel: 0, newLevel: 1 },
    ];
    expect(formatGrown(growth)).toBe("farm:3:4,barn:0:1");
    expect(parseGrown(formatGrown(growth))).toEqual(growth);
  });

  it("drops anything it cannot trust", () => {
    expect(parseGrown("farm:3:4,nope:1:2,forge:2:2,barn:x:3,,quarry")).toEqual([
      { code: "farm", oldLevel: 3, newLevel: 4 },
    ]);
    expect(parseGrown(undefined)).toEqual([]);
  });
});

describe("families", () => {
  it("files a visit by what feeds each building, highest level first", () => {
    const families = groupFamilies(
      [...starters, b("forge", 1), b("farm", 4), b("armory", 0), b("high_road", 2)],
      false,
    );
    expect(families.map((f) => f.key)).toEqual(["muscle", "upgrade", "deed", "starter"]);
    expect(families[0]?.items.map((x) => x.code)).toEqual(["farm", "forge"]);
  });

  it("puts everything unbuilt in one list on day one", () => {
    const families = groupFamilies([...starters, b("forge", 0), b("armory", 0)], false);
    expect(families.map((f) => f.key)).toEqual(["starter", "unbuilt"]);
  });

  it("leads a finished village with the deeds and folds the rest", () => {
    const all = [...starters.map((s) => ({ ...s, level: 5 })), b("farm", 5), b("high_road", 4)];
    expect(isVillageComplete(12, all)).toBe(true);
    expect(isVillageComplete(11, all)).toBe(false);
    expect(groupFamilies(all, true).map((f) => f.key)).toEqual(["deed", "rest"]);
  });
});

it("an upgrade tops out at 3, everything else at 5", () => {
  expect(buildingCeiling(b("armory", 1))).toBe(3);
  expect(buildingCeiling(b("forge", 1))).toBe(5);
  expect(buildingCeiling(b("dragon_lair", 1))).toBe(5);
});
