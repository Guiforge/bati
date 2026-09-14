import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

// Buildings have their own suite (db-village-buildings.test.ts). This one covers
// the rest of db/village: the two pure ladders, the boss banners they read from,
// the trophy shelf, and the one call the screen actually makes.

const RECUT_AT = new Date("2026-06-01T00:00:00Z");

describe("db/village", () => {
  const t = createTestDb();

  test("migration 0060 marks when this install started counting deeds the new way", () => {
    // Read before any beforeEach replaces it: a fresh database carries the marker on its own.
    const fresh = createTestDb();
    const row = fresh.sqlite
      .prepare("SELECT value FROM user_preferences WHERE key = 'deedsRecutAt'")
      .get() as { value: string } | undefined;
    fresh.close();
    assert(row);
    expect(Math.abs(Number(row.value) * 1000 - Date.now())).toBeLessThan(60_000);
  });

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
    // What 0060 writes on the first launch of the recut, pinned so the tests do not age.
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES ('deedsRecutAt', ?)")
      .run(String(Math.floor(RECUT_AT.getTime() / 1000)));
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

  /** Past the recut, so only the new count sees the run. */
  const postRecut = (day: number) => new Date(Date.UTC(2026, 6, day));
  /** Before it, so the old count sees the run too. */
  const preRecut = (day: number) => new Date(Date.UTC(2026, 0, day));

  test("one finished campaign feeds one deed building", async () => {
    const { getVillageBuildings } = village();
    const route = adventureIdOfKind("route");
    const boss = adventureIdOfKind("boss");

    const buildingOf = async (code: string) =>
      (await getVillageBuildings()).find((b) => b.code === code);

    finishRun(route, postRecut(2));

    const hall = await buildingOf("heroes_hall");
    expect(hall?.level).toBe(1);
    expect(hall?.driver).toBe("routes");
    expect(hall?.metricValue).toBe(1);
    expect(hall?.nextTarget).toBe(2);

    // The first victory over a boss is the lair's alone.
    finishRun(boss, postRecut(3));
    expect((await buildingOf("dragon_lair"))?.level).toBe(1);
    expect((await buildingOf("champion_arena"))?.level).toBe(0);
    expect((await buildingOf("heroes_hall"))?.metricValue).toBe(1);

    // Every later one is the arena's: two more wins over the same boss, two rematches.
    finishRun(boss, postRecut(4));
    finishRun(boss, postRecut(5));

    const arena = await buildingOf("champion_arena");
    expect(arena?.driver).toBe("rematches");
    expect(arena?.metricValue).toBe(2);
    expect(arena?.level).toBe(1);
    expect(arena?.nextTarget).toBe(3);
    expect((await buildingOf("dragon_lair"))?.level).toBe(1);
    expect((await buildingOf("heroes_hall"))?.metricValue).toBe(1);
  });

  test("the sixth boss raises the lair to its ceiling", async () => {
    const { getVillageBuildings } = village();
    const bosses = t.sqlite
      .prepare("SELECT id FROM adventures WHERE kind = 'boss' ORDER BY id")
      .all() as { id: number }[];
    expect(bosses).toHaveLength(6);

    for (const [i, boss] of bosses.entries()) defeatBoss(boss.id, postRecut(i + 2));

    const lair = (await getVillageBuildings()).find((b) => b.code === "dragon_lair");
    expect(lair?.level).toBe(5);
    expect(lair?.nextTarget).toBeNull();
  });

  test("a level the old count gave is kept, and the next rung is the new one", async () => {
    const { getVillageBuildings } = village();
    const route = adventureIdOfKind("route");
    const boss = adventureIdOfKind("boss");

    // Before the recut: three boss wins and a route. The old rules made that a hall at 2 (four
    // finished campaigns) and an arena at 1 (three boss victories).
    finishRun(boss, preRecut(2));
    finishRun(boss, preRecut(3));
    finishRun(boss, preRecut(4));
    finishRun(route, preRecut(5));

    const buildingOf = async (code: string) =>
      (await getVillageBuildings()).find((b) => b.code === code);

    const hall = await buildingOf("heroes_hall");
    expect(hall?.level).toBe(2);
    // Counted the new way it is one route, so the rung ahead asks for four.
    expect(hall?.metricValue).toBe(1);
    expect(hall?.nextTarget).toBe(4);

    const arena = await buildingOf("champion_arena");
    expect(arena?.level).toBe(1);
    expect(arena?.metricValue).toBe(2);
    expect(arena?.nextTarget).toBe(3);

    // Kept, and flagged so the sheet can say why "level 2" sits on "1 route". The arena is not:
    // its two rematches reach level 1 on the new count alone.
    expect(hall?.kept).toBe(true);
    expect(arena?.kept).toBeUndefined();

    // A run after the recut feeds only the new count: the old one stays frozen.
    finishRun(route, postRecut(2));
    finishRun(route, postRecut(3));
    expect((await buildingOf("heroes_hall"))?.level).toBe(2);
    finishRun(route, postRecut(4));
    const caughtUp = await buildingOf("heroes_hall");
    expect(caughtUp?.level).toBe(3);
    expect(caughtUp?.kept).toBeUndefined();
  });

  // The date a recut was once pinned to sat in the future, so a boss beaten before it still
  // raised the hall and the arena too. The marker is written at the first launch instead.
  test("a boss beaten today raises the lair and nothing else", async () => {
    const { getVillageBuildings } = village();
    const boss = adventureIdOfKind("boss");

    finishRun(boss, new Date());

    const buildings = await getVillageBuildings();
    const levelOf = (code: string) => buildings.find((b) => b.code === code)?.level;
    expect(levelOf("dragon_lair")).toBe(1);
    expect(levelOf("heroes_hall")).toBe(0);
    expect(levelOf("champion_arena")).toBe(0);
  });

  test("the old five-boss lair is kept at its ceiling", async () => {
    const { getVillageBuildings } = village();
    const bosses = t.sqlite
      .prepare("SELECT id FROM adventures WHERE kind = 'boss' ORDER BY id LIMIT 5")
      .all() as { id: number }[];
    for (const [i, boss] of bosses.entries()) finishRun(boss.id, preRecut(i + 2));

    const lair = (await getVillageBuildings()).find((b) => b.code === "dragon_lair");
    // Five bosses made the old lair 5 of 5. It stays there: a level already shown is not taken
    // back, and the sixth boss is the new count's to raise for everyone else.
    expect(lair?.level).toBe(5);
    expect(lair?.kept).toBe(true);
  });

  test("the tier block says which hero level changes the painting, and the XP to it", () => {
    const { getTierProgress } = village();

    // Level 8 (2800 XP) is tier 4; tier 5 arrives at level 10, 4500 XP.
    const next = getTierProgress(8, 3180, 370);
    expect(next).toMatchObject({
      final: false,
      tier: 4,
      nextLevel: 10,
      levelsAway: 2,
      targetXp: 4500,
      xpShort: 1320,
      sessionsAtPace: 4,
    });
    assert(!next.final);
    // From the tier's own floor, not from zero: (3180 - 2800) / (4500 - 2800).
    expect(next.progress).toBeCloseTo(22.35, 1);

    // No session this week, nothing to estimate from.
    expect(getTierProgress(8, 3180, null)).toMatchObject({ sessionsAtPace: null });

    // The bar's left end is where the tier began, not where the hero stands inside it.
    expect(getTierProgress(9, 3700, 370)).toMatchObject({ fromLevel: 8, fromXp: 2800 });
    // Standing exactly on a floor is an empty bar, and the last level before 12 is one away.
    expect(getTierProgress(8, 2800, 370)).toMatchObject({ progress: 0 });
    expect(getTierProgress(39, 57000, 400)).toMatchObject({ nextLevel: 40, levelsAway: 1 });

    // The last tier has no next level to name.
    expect(getTierProgress(44, 67000, 400)).toEqual({ final: true, tier: 12, reachedAt: 40 });
  });

  test("this week's pace averages the last seven days only", async () => {
    const { getWeekXpPerSession } = village();
    const now = new Date("2026-09-14T12:00:00Z");
    const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

    expect(await getWeekXpPerSession(now)).toBeNull();

    t.sqlite.exec(`
      INSERT INTO completed_sessions (performedAt, xpEarned) VALUES
        (${at("2026-09-13T10:00:00Z")}, 300),
        (${at("2026-09-10T10:00:00Z")}, 500),
        (${at("2026-09-01T10:00:00Z")}, 9000);
    `);

    expect(await getWeekXpPerSession(now)).toBe(400);
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
    expect(scene.streakDays).toBe(0);
    expect(scene.title.en).toBeTruthy();
    expect(scene.dominantSport).toBeNull();
    expect(scene.buildings).toHaveLength(21);
  });

  // The trophy wall left the village for the Journal (BossesCard reads getBossBanners, tested
  // above). What the scene still owes a victory is the lair it raises.
  test("a defeated boss raises the lair on the scene", async () => {
    const { getVillageScene } = village();

    defeatBoss(2, new Date("2026-01-02T00:00:00Z"));

    const scene = await getVillageScene();

    expect(scene.buildings.find((b) => b.code === "dragon_lair")?.level).toBe(1);
  });
});
