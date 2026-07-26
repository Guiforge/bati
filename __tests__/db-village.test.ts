import { createTestDb } from "./helpers/testDb";

// Buildings have their own suite (db-village-buildings.test.ts). This one covers
// the rest of db/village: the two pure ladders, the boss banners they read from,
// the trophy shelf, and the one call the screen actually makes.

describe("db/village", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM boss_fights");
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
  });

  function village() {
    return require("../db/village") as typeof import("../db/village");
  }

  /** Mark a seeded boss adventure as defeated at a fixed instant. */
  function defeatBoss(adventureId: number, defeatedAt: Date | null) {
    t.sqlite
      .prepare(
        `INSERT INTO boss_fights (adventureId, totalHp, currentHp, defeatedAt)
         VALUES (?, 100, ?, ?)`,
      )
      .run(
        adventureId,
        defeatedAt ? 0 : 100,
        defeatedAt ? Math.floor(defeatedAt.getTime() / 1000) : null,
      );
  }

  test("village tier steps at its level floors, never between them", () => {
    const { getVillageTier } = village();

    // [level, expected tier] — the boundary on each side of every floor.
    const cases: [number, number][] = [
      [0, 1],
      [1, 1],
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 3],
      [14, 3],
      [15, 4],
      [19, 4],
      [20, 5],
      [99, 5],
    ];

    for (const [level, tier] of cases) {
      expect([level, getVillageTier(level)]).toEqual([level, tier]);
    }
  });

  test("the flame follows the streak table exactly", () => {
    const { getFlameLevel } = village();

    const cases: [number, number][] = [
      [0, 0],
      [2, 0],
      [3, 1],
      [6, 1],
      [7, 2],
      [13, 2],
      [14, 3],
      [29, 3],
      [30, 4],
      [99, 4],
      [100, 5],
    ];

    for (const [streak, flame] of cases) {
      expect([streak, getFlameLevel(streak)]).toEqual([streak, flame]);
    }
  });

  test("only defeated bosses become banners", async () => {
    const { getBossBanners } = village();

    expect(await getBossBanners()).toEqual([]);

    defeatBoss(2, new Date("2026-01-02T00:00:00Z"));
    defeatBoss(3, null); // still standing

    const banners = await getBossBanners();
    expect(banners).toHaveLength(1);
    expect(banners[0].adventureId).toBe(2);
    expect(banners[0].imagePath).toBeTruthy();
    expect(banners[0].defeatedAt).toEqual(new Date("2026-01-02T00:00:00Z"));
  });

  test("no training means no dominant sport overlay", async () => {
    const { getDominantSportOverlay } = village();
    expect(await getDominantSportOverlay()).toBeNull();
  });

  test("trophies merge achievements and bosses, newest first", async () => {
    const { getTrophies, getBossBanners } = village();
    const achievements = require("../db/achievements") as typeof import("../db/achievements");

    defeatBoss(2, new Date("2020-01-01T00:00:00Z"));
    await achievements.unlockAchievement("first_workout"); // unlocked "now"

    const trophies = await getTrophies(await getBossBanners());

    expect(trophies).toHaveLength(2);
    // The 2020 boss is the older of the two, so it sorts last.
    expect(trophies.map((x) => x.kind)).toEqual(["achievement", "boss"]);
    expect(trophies[0].key).toBe("achievement:first_workout");
    expect(trophies[0].emoji).toBeTruthy();
    expect(trophies[0].imagePath).toBeNull();
    expect(trophies[1].emoji).toBeNull();
    expect(trophies[1].imagePath).toBeTruthy();
  });

  test("the legendary buildings are gated on the boss count", async () => {
    const { getVillageBuildings } = village();

    const levelOf = async (code: string) =>
      (await getVillageBuildings()).find((b) => b.code === code)?.level;

    expect(await levelOf("dragon_lair")).toBe(0);

    defeatBoss(2, new Date("2026-01-02T00:00:00Z"));

    // One boss opens the lair; the hall needs 3 and the arena 10.
    expect(await levelOf("dragon_lair")).toBe(1);
    expect(await levelOf("heroes_hall")).toBe(0);
    expect(await levelOf("champion_arena")).toBe(0);
  });

  test("a fresh village scene is the tier-1 starting state", async () => {
    const { getVillageScene } = village();

    const scene = await getVillageScene();

    expect(scene.tier).toBe(1);
    expect(scene.level).toBe(1);
    expect(scene.flame).toBe(0);
    expect(scene.dominantSport).toBeNull();
    expect(scene.bossBanners).toEqual([]);
    expect(scene.trophies).toEqual([]);
    expect(scene.buildings).toHaveLength(20);
  });

  test("a defeated boss shows up in the scene as both a banner and a trophy", async () => {
    const { getVillageScene } = village();

    defeatBoss(2, new Date("2026-01-02T00:00:00Z"));

    const scene = await getVillageScene();

    expect(scene.bossBanners).toHaveLength(1);
    expect(scene.trophies.map((x) => x.key)).toEqual(["boss:2"]);
  });
});
