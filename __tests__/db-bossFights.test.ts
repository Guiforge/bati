import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/bossFights", () => {
  const t = createTestDb();

  // Fixture ids well above the seeded range, so cleanup can target them.
  const BOSS_WITH_HP = 900; // bossTotalHp set explicitly
  const BOSS_DERIVED_HP = 901; // bossTotalHp null -> computed from its steps
  const BOSS_NO_STEPS = 902; // bossTotalHp null, no steps -> default
  const ROUTE_ADVENTURE = 903; // kind = "route"

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM boss_damage_log");
    t.sqlite.exec("DELETE FROM boss_fights");
    t.sqlite.exec("DELETE FROM adventure_steps WHERE adventureId >= 900");
    t.sqlite.exec("DELETE FROM adventures WHERE id >= 900");

    // A boss with a declared HP pool and a weakness/resistance pair.
    t.sqlite
      .prepare(
        `INSERT INTO adventures (id, questId, kind, bossTotalHp, bossWeaknessMuscle, bossResistanceMuscle, imagePath)
         VALUES (?, 1, 'boss', 100, 'chest', 'back', 'assets/boss.jpg')`,
      )
      .run(BOSS_WITH_HP);

    // No declared HP: the pool is derived from the steps' exercise targets.
    // Quest 1 appears twice on purpose — a repeated step must count twice.
    t.sqlite
      .prepare(`INSERT INTO adventures (id, questId, kind, imagePath) VALUES (?, 1, 'boss', NULL)`)
      .run(BOSS_DERIVED_HP);
    t.sqlite
      .prepare(
        `INSERT INTO adventure_steps (adventureId, stepIndex, questId) VALUES (?, 0, 1), (?, 1, 1)`,
      )
      .run(BOSS_DERIVED_HP, BOSS_DERIVED_HP);

    t.sqlite
      .prepare(`INSERT INTO adventures (id, questId, kind) VALUES (?, 1, 'boss')`)
      .run(BOSS_NO_STEPS);

    t.sqlite
      .prepare(`INSERT INTO adventures (id, questId, kind) VALUES (?, 1, 'route')`)
      .run(ROUTE_ADVENTURE);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function boss() {
    return require("../db/bossFights") as typeof import("../db/bossFights");
  }

  /**
   * One step's worth of the fallback HP pool, in the same unit as calculateBossHp: seconds
   * count as rep-equivalents (3 s = 1 rep, as dealDamage treats them) and every round counts.
   */
  function questStepDamage(questId: number): number {
    const row = t.sqlite
      .prepare(
        `SELECT coalesce(sum(
            CASE qe.targetType
              WHEN 'time' THEN max(1, round(qe.targetMax / 3.0))
              ELSE qe.targetMax
            END
          ), 0) * q.rounds AS total
         FROM quest_exercises qe
         JOIN quests q ON q.id = qe.questId
         WHERE qe.questId = ?`,
      )
      .get(questId) as { total: number };
    return row.total;
  }

  /** Crits roll Math.random() < 0.3; pin it so damage numbers are exact. */
  function noCrits() {
    jest.spyOn(Math, "random").mockReturnValue(0.99);
  }

  test("creating a fight twice returns the same one, not a second", async () => {
    noCrits();
    const b = boss();

    const first = await b.getOrCreateBossFight(BOSS_WITH_HP);
    const second = await b.getOrCreateBossFight(BOSS_WITH_HP);

    expect(first?.id).toBe(second?.id);
    expect(first?.totalHp).toBe(100);
    expect(first?.currentHp).toBe(100);
    expect(first?.weaknessMuscle).toBe("chest");
    expect(await b.getBossFightByAdventure(BOSS_WITH_HP)).toMatchObject({ id: first?.id });
  });

  test("a fight in progress is re-read at its current HP, not its total", async () => {
    noCrits();
    const b = boss();

    const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
    if (!fight) throw new Error("Expected a boss fight");
    await b.dealDamage(fight.id, { exerciseId: 1, resultValue: 30, targetValue: 100 });

    // Both read paths must agree — getOrCreate is the one the session uses on resume.
    expect((await b.getOrCreateBossFight(BOSS_WITH_HP))?.currentHp).toBe(70);
    expect((await b.getBossFightByAdventure(BOSS_WITH_HP))?.currentHp).toBe(70);
  });

  test("only boss adventures get a fight; unknown ids get nothing", async () => {
    const b = boss();

    expect(await b.getOrCreateBossFight(ROUTE_ADVENTURE)).toBeNull();
    expect(await b.getOrCreateBossFight(999_999)).toBeNull();
    expect(await b.getBossFightByAdventure(999_999)).toBeNull();
  });

  test("HP is derived from the step targets, counting a repeated quest twice", async () => {
    const b = boss();

    const perStep = questStepDamage(1);
    expect(perStep).toBeGreaterThan(0);

    // Two steps of the same quest, scaled by the expected crit rate (30 % chance of double).
    const fight = await b.getOrCreateBossFight(BOSS_DERIVED_HP);
    expect(fight?.totalHp).toBe(Math.max(50, Math.round(perStep * 2 * 1.3)));
  });

  test("a boss with no steps falls back to the default pool", async () => {
    const b = boss();
    expect((await b.getOrCreateBossFight(BOSS_NO_STEPS))?.totalHp).toBe(100);
  });

  test("a missing cover resolves to the placeholder, never null", async () => {
    const b = boss();
    expect((await b.getOrCreateBossFight(BOSS_NO_STEPS))?.imagePath).toBe("assets/placeholder.jpg");
    expect((await b.getBossFightByAdventure(BOSS_NO_STEPS))?.imagePath).toBe(
      "assets/placeholder.jpg",
    );
  });

  test("damage lowers HP and appends one history entry per hit", async () => {
    noCrits();
    const b = boss();

    const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
    if (!fight) throw new Error("Expected a boss fight");

    const first = await b.dealDamage(fight.id, { exerciseId: 1, resultValue: 20, targetValue: 25 });
    expect(first).toMatchObject({ damage: 20, newHp: 80, defeated: false, isCritical: false });

    await b.dealDamage(fight.id, { exerciseId: 1, resultValue: 5, targetValue: 25 });

    const history = await b.getBossDamageHistory(fight.id);
    expect(history.map((h) => h.damageDealt)).toEqual([20, 5]);
    expect(history.every((h) => h.isCritical === false)).toBe(true);
  });

  test("weakness multiplies damage, resistance halves it, and a hit is never free", async () => {
    noCrits();
    const b = boss();

    const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
    if (!fight) throw new Error("Expected a boss fight");

    const weak = await b.dealDamage(fight.id, {
      exerciseId: 1,
      resultValue: 10,
      targetValue: 25,
      muscle: "chest",
    });
    expect(weak).toMatchObject({ damage: 15, weaknessBonus: true, resistancePenalty: false });

    const resisted = await b.dealDamage(fight.id, {
      exerciseId: 1,
      resultValue: 10,
      targetValue: 25,
      muscle: "back",
    });
    expect(resisted).toMatchObject({ damage: 5, weaknessBonus: false, resistancePenalty: true });

    // 1 rep into a resistance rounds to 0 — the floor keeps the hit meaningful.
    const chip = await b.dealDamage(fight.id, {
      exerciseId: 1,
      resultValue: 1,
      targetValue: 25,
      muscle: "back",
    });
    expect(chip.damage).toBe(1);
  });

  test("hitting the target can crit for double", async () => {
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    const b = boss();

    const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
    if (!fight) throw new Error("Expected a boss fight");

    // Short of the target: no crit roll, even on a lucky number.
    expect(
      (await b.dealDamage(fight.id, { exerciseId: 1, resultValue: 9, targetValue: 10 })).isCritical,
    ).toBe(false);

    const crit = await b.dealDamage(fight.id, { exerciseId: 1, resultValue: 10, targetValue: 10 });
    expect(crit).toMatchObject({ isCritical: true, damage: 20 });
    expect((await b.getBossDamageHistory(fight.id)).at(-1)?.isCritical).toBe(true);
  });

  test("overkill clamps to zero, marks the boss defeated, and later hits do nothing", async () => {
    noCrits();
    const b = boss();

    const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
    if (!fight) throw new Error("Expected a boss fight");

    const killing = await b.dealDamage(fight.id, {
      exerciseId: 1,
      resultValue: 500,
      targetValue: 25,
    });
    expect(killing).toMatchObject({ newHp: 0, defeated: true });
    expect((await b.getBossFightByAdventure(BOSS_WITH_HP))?.defeatedAt).toBeInstanceOf(Date);

    const afterDeath = await b.dealDamage(fight.id, {
      exerciseId: 1,
      resultValue: 50,
      targetValue: 25,
    });
    expect(afterDeath).toMatchObject({ damage: 0, defeated: true });
    // A no-op hit must not pollute the log.
    expect(await b.getBossDamageHistory(fight.id)).toHaveLength(1);
  });

  test("resetting restores full HP and revives the boss", async () => {
    noCrits();
    const b = boss();

    const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
    if (!fight) throw new Error("Expected a boss fight");
    await b.dealDamage(fight.id, { exerciseId: 1, resultValue: 500, targetValue: 25 });

    await b.resetBossFight(fight.id);

    const revived = await b.getBossFightByAdventure(BOSS_WITH_HP);
    expect(revived?.currentHp).toBe(100);
    expect(revived?.defeatedAt).toBeNull();
    // The log is the fight's history, not its state — a reset keeps it.
    expect(await b.getBossDamageHistory(fight.id)).toHaveLength(1);
  });

  test("damaging a fight that does not exist throws instead of silently missing", async () => {
    const b = boss();
    await expect(
      b.dealDamage(999_999, { exerciseId: 1, resultValue: 10, targetValue: 10 }),
    ).rejects.toThrow();
    // Resetting a missing fight is a no-op, not an error.
    await expect(b.resetBossFight(999_999)).resolves.toBeUndefined();
    expect(await b.getBossDamageHistory(999_999)).toEqual([]);
  });

  /**
   * A live session banks its hits in memory and commits them here, once, when the session is
   * saved. This is the write path the app actually uses, so it gets the same scrutiny the
   * per-hit one has.
   */
  describe("persistSessionDamage", () => {
    const hit = (damage: number, exerciseId = 1) => ({
      roundIndex: 0,
      exerciseId,
      damage,
      isCritical: false,
      muscle: null,
    });

    /**
     * `bossDamageLog.completedSessionId` is a real foreign key, so the attribution can only be
     * written against a session that exists. In the app that is guaranteed — the hits are
     * committed just after `createCompletedSession` returns its id — so the fixture mirrors it.
     */
    const seedSession = (id: number) => {
      t.sqlite
        .prepare("INSERT OR IGNORE INTO completed_sessions (id, performedAt) VALUES (?, ?)")
        .run(id, Math.floor(Date.now() / 1000));
      return id;
    };

    test("commits every banked hit and takes their total off the boss", async () => {
      const b = boss();
      const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
      if (!fight) throw new Error("Expected a boss fight");

      await b.persistSessionDamage(fight.id, [hit(30), hit(20, 2)], seedSession(77));

      expect((await b.getBossFightByAdventure(BOSS_WITH_HP))?.currentHp).toBe(50);

      const history = await b.getBossDamageHistory(fight.id);
      expect(history).toHaveLength(2);
      // The attribution the per-hit path could never record: the session that earned them.
      expect(history.every((e) => e.completedSessionId === 77)).toBe(true);
    });

    test("commits nothing when the session landed no hits", async () => {
      const b = boss();
      const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
      if (!fight) throw new Error("Expected a boss fight");

      await b.persistSessionDamage(fight.id, [], seedSession(78));

      expect((await b.getBossFightByAdventure(BOSS_WITH_HP))?.currentHp).toBe(100);
      expect(await b.getBossDamageHistory(fight.id)).toEqual([]);
    });

    test("overkill clamps to zero and marks the boss defeated", async () => {
      const b = boss();
      const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
      if (!fight) throw new Error("Expected a boss fight");

      await b.persistSessionDamage(fight.id, [hit(80), hit(90, 2)], seedSession(79));

      const dead = await b.getBossFightByAdventure(BOSS_WITH_HP);
      expect(dead?.currentHp).toBe(0);
      expect(dead?.defeatedAt).toBeInstanceOf(Date);
    });

    test("leaves an already-dead boss alone", async () => {
      const b = boss();
      const fight = await b.getOrCreateBossFight(BOSS_WITH_HP);
      if (!fight) throw new Error("Expected a boss fight");
      await b.persistSessionDamage(fight.id, [hit(500)], seedSession(80));

      await b.persistSessionDamage(fight.id, [hit(10)], seedSession(81));

      // The second commit found the fight already over and wrote nothing.
      expect(await b.getBossDamageHistory(fight.id)).toHaveLength(1);
    });

    test("committing against a missing fight is a no-op, not a throw", async () => {
      const b = boss();
      await expect(
        b.persistSessionDamage(999_999, [hit(10)], seedSession(82)),
      ).resolves.toBeUndefined();
    });
  });
});
