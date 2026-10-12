import {
  nextMilestone,
  pickSessionMilestone,
  type RecentFeeds,
  sessionsToGo,
} from "../db/milestone";
import type { BuildingCode } from "../db/schema";

const none: RecentFeeds = { muscle: {}, style: {}, outing: [] };

const forge = (over: Partial<Parameters<typeof nextMilestone>[0]> = {}) => ({
  code: "forge" as BuildingCode,
  tier: 2 as const,
  level: 3,
  driver: "muscle" as const,
  metricValue: 400,
  nextTarget: 600,
  ...over,
});

describe("sessionsToGo", () => {
  test("rounds up: 200 missing at 90 a session is 3, not 2", () => {
    expect(sessionsToGo(200, [90])).toBe(3);
    expect(sessionsToGo(180, [90])).toBe(2);
  });

  test("never says 0: a session that more than covers it is 1", () => {
    expect(sessionsToGo(5, [500])).toBe(1);
  });

  test("a float average that lands on a whole number does not round up past it", () => {
    expect(sessionsToGo(3, [1.5])).toBe(2);
    expect(sessionsToGo(0.9, [0.3])).toBe(3);
  });

  test("reads the latest 5, not the first 5", () => {
    // Early sessions were huge (1000), the last five small (10): 100 missing is 10, not 1.
    const history = [1000, 1000, 1000, 10, 10, 10, 10, 10];
    expect(sessionsToGo(100, history)).toBe(10);
    // And the other way round: a dormant start does not drag the recent pace down.
    expect(sessionsToGo(100, [1, 1, 1, 50, 50, 50, 50, 50])).toBe(2);
  });

  test("an average is of what is there: two sessions are averaged over two", () => {
    expect(sessionsToGo(100, [10, 30])).toBe(5);
  });

  test("nothing fed it, a zero average or nothing missing: no estimate", () => {
    expect(sessionsToGo(100, [])).toBeNull();
    expect(sessionsToGo(100, [0, 0])).toBeNull();
    expect(sessionsToGo(0, [10])).toBeNull();
  });
});

describe("nextMilestone", () => {
  test("a muscle building: the missing reps over what the chest sessions brought", () => {
    const feeds = { ...none, muscle: { chest: [100, 60] } };
    // 200 missing, an average of 80: 2.5, so 3 sessions of chest, to rank 4.
    expect(nextMilestone(forge(), feeds)).toEqual({
      rank: 4,
      count: 3,
      unit: "sessions",
      subject: { muscle: "chest" },
    });
  });

  test("a muscle building ignores what other muscles brought", () => {
    expect(nextMilestone(forge(), { ...none, muscle: { legs: [100] } })).toBeNull();
  });

  test("a style building: the tower reads calisthenics, the grove yoga", () => {
    const tower = { code: "wizard_tower" as BuildingCode, driver: "style" as const };
    const feeds = { ...none, style: { calisthenics: [50], yoga: [10] } };
    expect(nextMilestone(forge(tower), feeds)).toMatchObject({
      count: 4,
      unit: "sessions",
      subject: { style: "calisthenics" },
    });
    const grove = { code: "druid_grove" as BuildingCode, driver: "style" as const };
    expect(nextMilestone(forge(grove), feeds)).toMatchObject({
      count: 20,
      subject: { style: "yoga" },
    });
  });

  test("the road counts outings, in leagues, from the unrounded tally", () => {
    const road = {
      code: "high_road" as BuildingCode,
      driver: "leagues" as const,
      level: 3,
      metricValue: 36,
      exactValue: 36.4,
      nextTarget: 40,
    };
    // 3.6 leagues missing, outings of 1.2 leagues: 3.
    expect(nextMilestone(forge(road), { ...none, outing: [1.2, 1.2] })).toEqual({
      rank: 4,
      count: 3,
      unit: "outings",
      subject: null,
    });
    // Sessions of muscle do not move the road.
    expect(nextMilestone(forge(road), { ...none, muscle: { chest: [100] } })).toBeNull();
  });

  test("a deed building has no honest estimate: no line", () => {
    const lair = {
      code: "dragon_lair" as BuildingCode,
      driver: "bosses" as const,
      metricValue: 2,
      nextTarget: 3,
    };
    const feeds = { muscle: { chest: [100] }, style: { strength: [100] }, outing: [3] };
    expect(nextMilestone(forge(lair), feeds)).toBeNull();
    for (const driver of ["rematches", "routes", "tier", "prereq"] as const) {
      expect(nextMilestone(forge({ driver }), feeds)).toBeNull();
    }
  });

  test("a volume building has no line at rank 10, whatever feeds it", () => {
    const feeds = { ...none, muscle: { chest: [100] } };
    expect(nextMilestone(forge({ level: 10, nextTarget: null }), feeds)).toBeNull();
    // Even a stale next target cannot make a rank 11.
    expect(nextMilestone(forge({ level: 10, nextTarget: 30000 }), feeds)).toBeNull();
  });

  test("rank 5 is no longer the top: the Forge still points at rank 6", () => {
    const feeds = { ...none, muscle: { chest: [100] } };
    expect(nextMilestone(forge({ level: 5, nextTarget: 2400, metricValue: 1000 }), feeds)).toEqual({
      rank: 6,
      count: 14,
      unit: "sessions",
      subject: { muscle: "chest" },
    });
  });

  test("the road reads buildingCeiling: a line at rank 5, none at rank 10", () => {
    const road = {
      code: "high_road" as BuildingCode,
      tier: 4 as const,
      driver: "leagues" as const,
      metricValue: 200,
    };
    const feeds = { ...none, outing: [10] };
    expect(nextMilestone(forge({ ...road, level: 5, nextTarget: 400 }), feeds)).toMatchObject({
      rank: 6,
    });
    expect(nextMilestone(forge({ ...road, level: 10, nextTarget: 3000 }), feeds)).toBeNull();
  });

  test("a building whose ceiling is 5 has no line at 5, even with a stale target", () => {
    const arena = {
      code: "champion_arena" as BuildingCode,
      tier: 4 as const,
      driver: "leagues" as const,
      level: 5,
      nextTarget: 600,
    };
    // The outings did feed it (a road would answer); only the ceiling of 5 says no.
    expect(nextMilestone(forge(arena), { ...none, outing: [10] })).toBeNull();
  });

  test("a building nothing has fed yet has no line", () => {
    expect(nextMilestone(forge(), none)).toBeNull();
    expect(nextMilestone(forge(), { ...none, muscle: { chest: [] } })).toBeNull();
  });
});

describe("pickSessionMilestone", () => {
  const bld = (code: BuildingCode, over: Partial<Parameters<typeof nextMilestone>[0]> = {}) => ({
    ...forge({ code, level: 1 }),
    ...over,
  });
  const feeds: RecentFeeds = {
    muscle: { chest: [100], back: [100] },
    style: { strength: [100] },
    outing: [1],
  };
  const chest = bld("forge", { metricValue: 300, nextTarget: 600 }); // 3 sessions
  const road = bld("high_road", { driver: "leagues", metricValue: 2, nextTarget: 5 }); // 3 outings
  const none = { muscles: [], styles: [], outing: false };

  test("a strength session names the Forge, an outing names the road", () => {
    const strength = { ...none, muscles: ["chest" as const] };
    expect(pickSessionMilestone([chest, road], feeds, strength)?.building.code).toBe("forge");
    const walk = { ...none, outing: true };
    const got = pickSessionMilestone([chest, road], feeds, walk);
    expect(got?.building.code).toBe("high_road");
    expect(got?.milestone.unit).toBe("outings");
  });

  test("among the fed, the smallest estimate wins, not the top rank or the list order", () => {
    const near = bld("forge", { metricValue: 500, nextTarget: 600 }); // 1 session
    const far = bld("quarry", { metricValue: 0, nextTarget: 600 }); // 6 sessions
    const fed = { ...none, muscles: ["chest" as const, "back" as const] };
    expect(pickSessionMilestone([far, near], feeds, fed)?.building.code).toBe("forge");
  });

  test("a tie goes to the earlier building in the list", () => {
    const a = bld("forge", { metricValue: 400, nextTarget: 600 });
    const b = bld("quarry", { metricValue: 400, nextTarget: 600 });
    const fed = { ...none, muscles: ["chest" as const, "back" as const] };
    expect(pickSessionMilestone([a, b], feeds, fed)?.building.code).toBe("forge");
    expect(pickSessionMilestone([b, a], feeds, fed)?.building.code).toBe("quarry");
  });

  test("a session that fed nothing estimable gets null, for the caller's fallback", () => {
    expect(pickSessionMilestone([chest, road], feeds, none)).toBeNull();
  });
});
