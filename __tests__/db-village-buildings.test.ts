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
    const { clearShortLivedQueries } =
      require("../db/queryCache") as typeof import("../db/queryCache");
    clearShortLivedQueries();
  });

  test("a fresh village has only its starter buildings", async () => {
    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const buildings = await getVillageBuildings();

    expect(buildings).toHaveLength(20);
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
    // Back was never trained: still locked.
    expect(quarry?.level).toBe(0);
    // Tier 3 unlocks at prerequisite level 3, two rungs behind.
    expect(buildings.find((b) => b.code === "armory")?.level).toBe(1);
    expect(buildings.find((b) => b.code === "castle_wall")?.level).toBe(0);
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
      unlockCondition: "",
      relatedMuscle: null,
    });

    const before = [make("forge", 2), make("well", 1), make("campfire", 3)];
    const after = [make("forge", 3), make("well", 1), make("campfire", 2)];

    const growth = diffVillageGrowth(before, after);

    expect(growth).toEqual([
      {
        code: "forge",
        enName: "forge",
        frName: "forge",
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
      unlockCondition: "",
      relatedMuscle: null,
    });

    const growth = diffVillageGrowth([], [make("dragon_lair", 1)]);

    expect(growth).toEqual([
      {
        code: "dragon_lair",
        enName: "dragon_lair",
        frName: "dragon_lair",
        relatedMuscle: null,
        oldLevel: 0,
        newLevel: 1,
      },
    ]);
  });

  test("trophies merge achievements and defeated bosses, newest first", async () => {
    const { getTrophies } = require("../db/village") as typeof import("../db/village");

    const trophies = await getTrophies([
      {
        adventureId: 1,
        enTitle: "Fire Dragon",
        frTitle: "Dragon de feu",
        imagePath: "assets/x.jpg",
        defeatedAt: new Date("2026-01-02"),
      },
    ]);

    expect(trophies.map((x) => x.kind)).toEqual(["boss"]);
    expect(trophies[0].imagePath).toBe("assets/x.jpg");
  });
});
