import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/village buildings", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec(`DELETE FROM completed_exercises`);
    t.sqlite.exec(`DELETE FROM completed_sessions`);
    t.sqlite.exec(`DELETE FROM gps_points`);
    const { clearShortLivedQueries } =
      require("../db/queryCache") as typeof import("../db/queryCache");
    clearShortLivedQueries();
  });

  test("a fresh village has only its starter buildings", async () => {
    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const buildings = await getVillageBuildings();

    expect(buildings).toHaveLength(21);
    for (const b of buildings) {
      expect(b.level).toBe(b.tier === 1 ? 1 : 0);
    }
  });

  test("training a muscle raises its building past level 1", async () => {
    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const now = Math.floor(Date.now() / 1000);

    // Push-ups work chest and arms -> forge and archery_range.
    const pushupId =
      (
        t.sqlite.prepare(`SELECT id FROM exercises WHERE enName = 'Push-ups'`).get() as
          | { id: number }
          | undefined
      )?.id ?? 2;

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (1, ${pushupId}, 'reps', 350, ${now}, 0);
    `);

    const buildings = await getVillageBuildings();
    const forge = buildings.find((b) => b.code === "forge");
    const quarry = buildings.find((b) => b.code === "quarry");

    // 350 work units crosses the level-3 threshold (300) but not level 4 (600).
    expect(forge?.level).toBe(3);
    // And the sheet can say so: the driver, where it stands, and what the next rung costs.
    expect(forge?.driver).toBe("muscle");
    expect(forge?.metricValue).toBe(350);
    expect(forge?.nextTarget).toBe(600);
    // Back was never trained: still locked.
    expect(quarry?.level).toBe(0);
    expect(quarry?.nextTarget).toBe(1);
    // Tier 3 unlocks at prerequisite level 3, two rungs behind.
    expect(buildings.find((b) => b.code === "armory")?.level).toBe(1);
    expect(buildings.find((b) => b.code === "castle_wall")?.level).toBe(0);
  });

  // ------------------------------------------------------------
  // The High Road, and the two currencies it exists to keep apart
  // ------------------------------------------------------------

  /**
   * One league is 1000 m, and the road reads the metres the reducer credited rather than a sum
   * over the fixes: drift while the hero stood still is in `gps_points` and must never be here.
   */
  let outings = 0;
  const walkLeagues = (leagues: number) => {
    outings += 1;
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, leaguesM)
        VALUES (${10 + outings}, ${Math.floor(Date.now() / 1000)}, ${Math.round(leagues * 1000)});
    `);
  };

  /** A strength session: push-ups, which reach the forge through their muscles. */
  const liftReps = (reps: number) => {
    const pushupId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = 'Push-ups'").get() as { id: number }
    ).id;
    const now = Math.floor(Date.now() / 1000);
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (1, ${pushupId}, 'reps', ${reps}, ${now}, 0);
    `);
  };

  /** An expedition session: the walk itself, logged in seconds like every other timed row. */
  const walkSeconds = (seconds: number) => {
    const walkId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get("Warden's Walk") as {
        id: number;
      }
    ).id;
    const now = Math.floor(Date.now() / 1000);
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (2, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (2, ${walkId}, 'time', ${seconds}, ${now}, 0);
    `);
  };

  const road = async () => {
    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const found = (await getVillageBuildings()).find((b) => b.code === "high_road");
    assert(found);
    return found;
  };

  test("the road is locked until the first league, and says how far that is", async () => {
    const locked = await road();

    expect(locked.level).toBe(0);
    expect(locked.driver).toBe("leagues");
    expect(locked.metricValue).toBe(0);
    expect(locked.nextTarget).toBe(1);
  });

  // The same rule the deed counters get: a locked road counts, because "0/1 leagues" is a tally
  // the hero can act on. A locked forge does not, because "train your chest" is not a number.
  test("a locked road still shows how far along it is", async () => {
    const { getBuildingProgress } = require("../db/village") as typeof import("../db/village");

    // Half a league: real ground, not yet a rung. The tally is whole leagues, because "0.5
    // leagues covered beyond the walls" is not a sentence — but the bar has to move, or the
    // first outing a hero ever takes leaves the one building it feeds sitting at zero.
    walkLeagues(0.5);

    const partial = await road();
    expect(partial.level).toBe(0);
    expect(partial.metricValue).toBe(0);
    expect(getBuildingProgress(partial)).toBe(50);
  });

  test("walking raises the road", async () => {
    walkLeagues(35);

    const built = await road();
    // Floors are [1, 15, 40, 90, 200] leagues: 35 clears the second and not the third.
    expect(built.level).toBe(2);
    expect(built.metricValue).toBe(35);
    expect(built.nextTarget).toBe(40);
  });

  test("leagues are metres, so a part-league is floored rather than rounded up", async () => {
    walkLeagues(9.99);

    const built = await road();
    expect(built.metricValue).toBe(9);
    expect(built.level).toBe(1);
  });

  // The two currencies, made checkable. Nothing converts between them in either direction: an
  // hour of lifting must never move the road, and an hour of walking must never move anything
  // else — which is what stops a 60-minute walk from maxing a building on day one
  // (db/workUnits.ts, NON_REP_STYLE).
  describe("the two currencies never cross", () => {
    test("strength work does not raise the road", async () => {
      liftReps(350);

      const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
      const buildings = await getVillageBuildings();

      // The lift landed where it should.
      expect(buildings.find((b) => b.code === "forge")?.level).toBe(3);
      // And nowhere near the road.
      expect(buildings.find((b) => b.code === "high_road")?.level).toBe(0);
      expect(buildings.find((b) => b.code === "high_road")?.metricValue).toBe(0);
    });

    test("expedition work raises nothing but the road", async () => {
      // Twenty minutes on foot: 1200 s logged, and 1.5 leagues of ground under them.
      walkSeconds(1200);
      walkLeagues(1.5);

      const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
      const buildings = await getVillageBuildings();

      // 1200 s would be 400 rep-equivalents through the shared conversion — level 4 on any
      // volume-driven building. Every one of them is untouched.
      const raised = buildings.filter((b) => b.tier !== 1 && b.level > 0).map((b) => b.code);
      expect(raised).toEqual(["high_road"]);
      expect(buildings.find((b) => b.code === "high_road")?.metricValue).toBe(1);
    });
  });

  test("a muscle building sees a new set on the very next read", async () => {
    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const now = Math.floor(Date.now() / 1000);

    const pushupId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = 'Push-ups'").get() as {
        id: number;
      }
    ).id;

    const forgeLevel = async () =>
      (await getVillageBuildings()).find((b) => b.code === "forge")?.level;

    expect(await forgeLevel()).toBe(0);

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (1, ${pushupId}, 'reps', 350, ${now}, 0);
    `);

    // The volumes used to come from the 5 s muscle-balance memo, so saveSession()'s "after"
    // snapshot replayed the pre-session numbers unless the memos were dropped first. The
    // lifetime sum is its own unmemoized query now: nothing may stand between a set and its forge.
    expect(await forgeLevel()).toBe(3);
  });

  test("lifetime volume per muscle matches the balance card's, reps and seconds alike", async () => {
    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);
    const idOf = (name: string) =>
      (t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(name) as { id: number })
        .id;
    // A multi-muscle rep movement, a timed hold, a leg movement, and a walk that must count zero.
    const sets: [string, "reps" | "time", number][] = [
      ["Push-ups", "reps", 42],
      ["Plank", "time", 61],
      ["Plank", "time", 1],
      ["Squat", "reps", 77],
      ["Warden's Walk", "time", 1800],
    ];
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now - 86400 * 400});
      INSERT INTO completed_sessions (id, performedAt) VALUES (2, ${now});
    `);
    sets.forEach(([name, type, value], i) => {
      t.sqlite
        .prepare(
          `INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run((i % 2) + 1, idOf(name), type, value, now, i);
    });

    const balance = await getMuscleBalance("all");
    const buildings = await getVillageBuildings();
    const muscleBuildings = buildings.filter((b) => b.driver === "muscle");

    // Enough muscles to mean something: the sets above reach at least four of them.
    expect(balance.muscles.filter((m) => m.volume > 0).length).toBeGreaterThanOrEqual(4);
    expect(muscleBuildings.length).toBeGreaterThanOrEqual(4);
    for (const b of muscleBuildings) {
      const expected = balance.muscles.find((m) => m.muscle === b.relatedMuscle)?.volume;
      expect({ code: b.code, volume: b.metricValue }).toEqual({ code: b.code, volume: expected });
    }
  });

  test("diffVillageGrowth only returns buildings whose level rose", () => {
    const { diffVillageGrowth } = require("../db/village") as typeof import("../db/village");

    const make = (code: string, level: number) => ({
      code: code as never,
      emoji: "🔥",
      tier: 1 as const,
      level,
      enName: code,
      frName: code,
      deName: code,
      esName: code,
      unlockCondition: "",
      relatedMuscle: null,
      driver: "tier" as const,
      metricValue: 0,
      nextTarget: null,
    });

    const before = [make("forge", 2), make("well", 1), make("campfire", 3)];
    const after = [make("forge", 3), make("well", 1), make("campfire", 2)];

    const growth = diffVillageGrowth(before, after);

    expect(growth).toEqual([
      {
        code: "forge",
        enName: "forge",
        frName: "forge",
        deName: "forge",
        esName: "forge",
        relatedMuscle: null,
        oldLevel: 2,
        newLevel: 3,
      },
    ]);
  });

  test("diffVillageGrowth treats an unseen building as rising from 0", () => {
    const { diffVillageGrowth } = require("../db/village") as typeof import("../db/village");

    const make = (code: string, level: number) => ({
      code: code as never,
      emoji: "🔥",
      tier: 1 as const,
      level,
      enName: code,
      frName: code,
      deName: code,
      esName: code,
      unlockCondition: "",
      relatedMuscle: null,
      driver: "tier" as const,
      metricValue: 0,
      nextTarget: null,
    });

    const growth = diffVillageGrowth([], [make("dragon_lair", 1)]);

    expect(growth).toEqual([
      {
        code: "dragon_lair",
        enName: "dragon_lair",
        frName: "dragon_lair",
        deName: "dragon_lair",
        esName: "dragon_lair",
        relatedMuscle: null,
        oldLevel: 0,
        newLevel: 1,
      },
    ]);
  });

  // The village card and the detail sheet both draw their bar from this one call. The rule it
  // encodes — a locked building only counts when its condition is a tally, never when it is
  // "train your back" — is the part that would silently drift if either side recomputed it.
  describe("getBuildingProgress", () => {
    type Building = import("../db/village").VillageBuilding;

    const building = (over: Partial<Building>): Building =>
      ({
        code: "forge",
        emoji: "",
        tier: 2,
        level: 1,
        enName: "Forge",
        frName: "Forge",
        deName: "Forge",
        esName: "Forge",
        unlockCondition: "",
        relatedMuscle: "arms",
        driver: "muscle",
        metricValue: 50,
        nextTarget: 100,
        ...over,
      }) as Building;

    const progress = (over: Partial<Building>) => {
      const { getBuildingProgress } = require("../db/village") as typeof import("../db/village");
      return getBuildingProgress(building(over));
    };

    test("counts the way to the next level", () => {
      expect(progress({})).toBe(50);
    });

    test("a maxed building has nothing left to count", () => {
      expect(progress({ level: 5, nextTarget: null })).toBeNull();
    });

    test("a locked qualitative building shows no bar", () => {
      expect(progress({ level: 0, driver: "muscle" })).toBeNull();
    });

    // Unbuilt is a condition in words. "0 bosses, level 1 at 1" over an empty bar said one zero
    // three ways.
    test("an unbuilt deed shows no bar either", () => {
      expect(progress({ level: 0, driver: "bosses", metricValue: 0, nextTarget: 1 })).toBeNull();
      expect(progress({ level: 0, driver: "rematches", metricValue: 0, nextTarget: 1 })).toBeNull();
    });

    test("overshooting a target clamps instead of exceeding the bar", () => {
      expect(progress({ metricValue: 999, nextTarget: 100 })).toBe(100);
    });
  });
});
