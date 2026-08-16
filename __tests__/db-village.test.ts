import { clientMock, createTestDb } from "./helpers/testDb";

// Buildings have their own suite (db-village-buildings.test.ts). This one covers
// the rest of db/village: the two pure ladders, the boss banners they read from,
// the trophy shelf, and the one call the screen actually makes.

describe("db/village", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM boss_fights");
    t.sqlite.exec("DELETE FROM adventure_run_steps");
    t.sqlite.exec("DELETE FROM adventure_runs");
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
      [2, 1],
      [3, 2],
      [4, 2],
      [5, 3],
      [7, 3],
      [8, 4],
      [9, 4],
      [10, 5],
      [12, 5],
      [13, 6],
      [14, 6],
      [15, 7],
      [17, 7],
      [18, 8],
      [19, 8],
      [20, 9],
      [24, 9],
      // Past 20 the hero keeps levelling at a flat 2000 XP a rung, so the scene keeps changing
      // instead of stopping at "Flourishing City" for the rest of the account's life.
      [25, 10],
      [31, 10],
      [32, 11],
      [39, 11],
      [40, 12],
      [99, 12],
    ];

    for (const [level, tier] of cases) {
      expect([level, getVillageTier(level)]).toEqual([level, tier]);
    }
  });

  test("the flame follows the streak table exactly", () => {
    // Lives in db/streaks.ts now (the widget's headless task must not drag village.ts in),
    // but the table is still the village scene's contract, so the case stays here.
    const { getFlameLevel } = require("../db/streaks") as typeof import("../db/streaks");

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
    expect(banners[0]?.adventureId).toBe(2);
    expect(banners[0]?.defeatedAt).toEqual(new Date("2026-01-02T00:00:00Z"));

    // The banner is the monster you beat, not the poster for its journey: when the adventure has
    // a boss portrait, that is what the trophy shows.
    const adventure = t.sqlite
      .prepare("SELECT imagePath, bossImagePath FROM adventures WHERE id = 2")
      .get() as { imagePath: string | null; bossImagePath: string | null };
    expect(banners[0]?.imagePath).toBe(adventure.bossImagePath ?? adventure.imagePath);
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
    expect(trophies[0]?.key).toBe("achievement:first_workout");
    expect(trophies[0]?.emoji).toBeTruthy();
    expect(trophies[0]?.imagePath).toBeNull();
    expect(trophies[1]?.emoji).toBeNull();
    expect(trophies[1]?.imagePath).toBeTruthy();
  });

  /** A finished campaign run, at a fixed instant. */
  function finishRun(adventureId: number, finishedAt: Date) {
    const at = Math.floor(finishedAt.getTime() / 1000);
    t.sqlite
      .prepare(
        `INSERT INTO adventure_runs (adventureId, status, startedAt, finishedAt)
         VALUES (?, 'finished', ?, ?)`,
      )
      .run(adventureId, at, at);
  }

  function adventureIdOfKind(kind: string): number {
    const row = t.sqlite
      .prepare("SELECT id FROM adventures WHERE kind = ? ORDER BY id LIMIT 1")
      .get(kind) as { id: number } | undefined;
    if (!row) throw new Error(`Expected a seeded '${kind}' adventure`);
    return row.id;
  }

  test("the dragon lair counts the bosses actually beaten", async () => {
    const { getVillageBuildings } = village();

    const levelOf = async (code: string) =>
      (await getVillageBuildings()).find((b) => b.code === code)?.level;

    expect(await levelOf("dragon_lair")).toBe(0);

    defeatBoss(2, new Date("2026-01-02T00:00:00Z"));

    // One boss raises the lair; the other two legendaries answer to different deeds.
    expect(await levelOf("dragon_lair")).toBe(1);
    expect(await levelOf("heroes_hall")).toBe(0);
    expect(await levelOf("champion_arena")).toBe(0);
  });

  test("the hall counts finished campaigns and the arena counts boss victories", async () => {
    const { getVillageBuildings } = village();
    const route = adventureIdOfKind("route");
    const boss = adventureIdOfKind("boss");

    const buildingOf = async (code: string) =>
      (await getVillageBuildings()).find((b) => b.code === code);

    finishRun(route, new Date("2026-01-01T00:00:00Z"));

    const hall = await buildingOf("heroes_hall");
    expect(hall?.level).toBe(1);
    expect(hall?.driver).toBe("adventures");
    expect(hall?.metricValue).toBe(1);
    expect(hall?.nextTarget).toBe(3);
    expect((await buildingOf("champion_arena"))?.level).toBe(0);

    // Three boss victories open the arena — beating the same boss again counts.
    finishRun(boss, new Date("2026-01-02T00:00:00Z"));
    finishRun(boss, new Date("2026-01-03T00:00:00Z"));
    finishRun(boss, new Date("2026-01-04T00:00:00Z"));

    const arena = await buildingOf("champion_arena");
    expect(arena?.level).toBe(1);
    expect(arena?.metricValue).toBe(3);
    // Four finished runs: past the hall's second floor, short of its third.
    expect((await buildingOf("heroes_hall"))?.level).toBe(2);
    // Three wins over one boss is still one boss defeated.
    expect((await buildingOf("dragon_lair"))?.level).toBe(1);
  });

  test("a boss replay does not erase the victory already won", async () => {
    const { getBossBanners, getVillageBuildings } = village();
    const boss = adventureIdOfKind("boss");

    finishRun(boss, new Date("2026-01-02T00:00:00Z"));
    // resetBossFight() nulls defeatedAt for the rematch; the finished campaign stands.
    defeatBoss(boss, null);

    const banners = await getBossBanners();

    expect(banners.map((b) => b.adventureId)).toEqual([boss]);
    expect(banners[0]?.defeatedAt).toEqual(new Date("2026-01-02T00:00:00Z"));
    expect((await getVillageBuildings()).find((b) => b.code === "dragon_lair")?.level).toBe(1);
  });

  test("a fresh village scene is the tier-1 starting state", async () => {
    const { getVillageScene } = village();

    const scene = await getVillageScene();

    expect(scene.tier).toBe(1);
    expect(scene.level).toBe(1);
    expect(scene.flame).toBe(0);
    expect(scene.dominantSport).toBeNull();
    expect(scene.trophies).toEqual([]);
    expect(scene.buildings).toHaveLength(20);
  });

  // Used to assert the boss arrived "as both a banner and a trophy". The banner half was never
  // rendered anywhere, so the scene stopped carrying it; the trophy is the one that reaches a
  // screen, and the lair below proves the victory still counts where it is read.
  test("a defeated boss reaches the scene as a trophy, and raises the lair", async () => {
    const { getVillageScene } = village();

    defeatBoss(2, new Date("2026-01-02T00:00:00Z"));

    const scene = await getVillageScene();

    expect(scene.trophies.map((x) => x.key)).toEqual(["boss:2"]);
    expect(scene.buildings.find((b) => b.code === "dragon_lair")?.level).toBe(1);
  });
});
