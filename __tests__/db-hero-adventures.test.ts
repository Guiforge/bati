import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The hero writes adventures (lot adventure-builder, phase 1). Foreign keys are ON in the test
 * database and OFF on a device (`db/client.ts` issues no pragma): a test that removes a quest an
 * adventure names turns them OFF first, or it asserts a cascade the phone never runs.
 */
describe("db/heroAdventures", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  afterEach(() => {
    t.sqlite.pragma("foreign_keys = ON");
  });

  const mod = () => ({
    hero: require("../db/heroAdventures") as typeof import("../db/heroAdventures"),
    adv: require("../db/adventures") as typeof import("../db/adventures"),
    boss: require("../db/bossFights") as typeof import("../db/bossFights"),
    quests: require("../db/quests") as typeof import("../db/quests"),
    journal: require("../db/journal") as typeof import("../db/journal"),
    village: require("../db/village") as typeof import("../db/village"),
  });

  const adminQuests = () =>
    (
      t.sqlite
        .prepare("SELECT id FROM quests WHERE author = 'Admin' ORDER BY id LIMIT 6")
        .all() as { id: number }[]
    ).map((r) => r.id);

  let seq = 0;
  function draft(
    questIds: number[],
    end: import("../db/heroAdventures").HeroAdventureDraft["end"] = { kind: "route" },
  ): import("../db/heroAdventures").HeroAdventureDraft {
    seq += 1;
    return {
      title: `Tale ${seq}`,
      description: "A tale",
      imagePath: "the_golem",
      end,
      voice: { name: "", lines: { idle: [], crit: [], enrage: [] } },
      steps: questIds.map((questId, i) => ({
        questId,
        narrative: `before ${i}`,
        outro: i === 0 ? `after ${i}` : "",
      })),
    };
  }

  /** A saved session on a quest, as `completeAdventureRunStep` wants one. */
  function session(questId: number): number {
    return Number(
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, unixepoch())",
        )
        .run(questId).lastInsertRowid,
    );
  }

  async function playAll(adventureId: number): Promise<void> {
    const { adv } = mod();
    let run = await adv.startAdventureRun({ adventureId, difficultyOverride: "medium" });
    for (let guard = 0; guard < 12; guard++) {
      const step = run.activeStep;
      if (!step) return;
      const done = await adv.completeAdventureRunStep({
        runStepId: step.id,
        completedSessionId: session(step.questId),
      });
      if (done.isFinished) return;
      const next = await adv.getActiveAdventureRun(adventureId);
      if (!next) return;
      run = next;
    }
  }

  test("a 3-step boss adventure is created, listed as the hero's, played to its end, at every level", async () => {
    const { hero, adv, boss } = mod();
    const [a, b, c] = adminQuests();
    if (!a || !b || !c) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(
      draft([a, b, c], { kind: "boss", monster: "shadow_serpent" }),
    );

    const listed = (await adv.listAdventures()).find((x) => x.id === id);
    expect(listed?.author).toBe("hero");
    expect(listed?.kind).toBe("boss");
    expect(listed?.stepsCount).toBe(3);
    expect(listed?.coverMissing).toBe(false);

    // The monster's stats are the seeded adventure's (abs weak, legs resists).
    const monster = await hero.monsterOf("shadow_serpent");
    expect(monster?.weakness).toBe("abs");
    expect(monster?.resistance).toBe("legs");

    for (const level of ["easy", "medium", "hard"] as const) {
      const fight = await boss.getOrCreateBossFight(id, level);
      expect(fight?.totalHp).toBe(await boss.calculateBossHp(id, level));
      expect(fight?.totalHp).toBe(await boss.bossHpForQuests([a, b, c], level));
      expect(fight?.weaknessMuscle).toBe("abs");
      expect(fight?.resistanceMuscle).toBe("legs");
      expect(fight?.author).toBe("hero");
      t.sqlite.prepare("DELETE FROM boss_fights WHERE adventureId = ?").run(id);
    }

    await playAll(id);
    const runs = t.sqlite
      .prepare("SELECT status FROM adventure_runs WHERE adventureId = ?")
      .all(id) as { status: string }[];
    expect(runs.map((r) => r.status)).toEqual(["finished"]);
  });

  test("a draft outside the limits is refused", async () => {
    const { hero } = mod();
    const [a, b] = adminQuests();
    if (!a || !b) throw new Error("seed quests expected");
    const ok = draft([a, b]);
    await expect(hero.createHeroAdventure(draft([a]))).rejects.toThrow();
    await expect(hero.createHeroAdventure(draft(Array(9).fill(a)))).rejects.toThrow();
    await expect(hero.createHeroAdventure({ ...ok, title: "   " })).rejects.toThrow();
    await expect(hero.createHeroAdventure({ ...ok, imagePath: "nope" as never })).rejects.toThrow();
    await expect(hero.createHeroAdventure(draft([a, 999999]))).rejects.toThrow();
    // Eight is the ceiling and is fine, and the texts are clamped.
    const id = await hero.createHeroAdventure({
      ...draft(Array(8).fill(a)),
      title: "x".repeat(200),
    });
    const loaded = await hero.loadHeroAdventureDraft(id);
    expect(loaded?.title).toHaveLength(60);
    expect(loaded?.steps).toHaveLength(8);
  });

  test("six monsters are selectable, whatever the account", async () => {
    const { hero } = mod();
    const monsters = await hero.listMonsters();
    expect(monsters.map((m) => m.key).sort()).toEqual([
      "fire_dragon",
      "forest_titan",
      "iron_golem",
      "shadow_serpent",
      "stone_golem",
      "wind_wraith",
    ]);
  });

  test("the farm is closed: ten finished hero adventures change no deed", async () => {
    const { hero, adv, journal, village } = mod();
    const [a, b] = adminQuests();
    if (!a || !b) throw new Error("seed quests expected");
    const kills = (await journal.getBossKills()).length;
    const standing = (await journal.getStandingBosses()).length;
    const banners = (await village.getBossBanners()).length;
    const summaries = (await adv.listFinishedRunSummaries()).length;

    const ids: number[] = [];
    for (let i = 0; i < 10; i++) {
      const id = await hero.createHeroAdventure(
        draft([a, b], i % 2 ? { kind: "boss", monster: "iron_golem" } : { kind: "route" }),
      );
      ids.push(id);
      for (let n = 0; n < 3; n++) await playAll(id);
    }

    expect((await journal.getBossKills()).length).toBe(kills);
    expect((await journal.getStandingBosses()).length).toBe(standing);
    expect((await village.getBossBanners()).length).toBe(banners);
    expect((await adv.listFinishedRunSummaries()).length).toBe(summaries);
    // The card still says how many times it was finished.
    const counts = await adv.getFinishedRunCountsByAdventure();
    for (const id of ids) expect(counts.get(id)).toBe(3);
  });

  test("with a run under way the steps and the end are frozen, the texts are not", async () => {
    const { hero, adv } = mod();
    const [a, b, c] = adminQuests();
    if (!a || !b || !c) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(draft([a, b]));
    await adv.startAdventureRun({ adventureId: id });

    const changed = {
      ...draft([c, c, c], { kind: "boss" as const, monster: "iron_golem" as const }),
      title: "Renamed",
    };
    await hero.updateHeroAdventure(id, changed);

    const loaded = await hero.loadHeroAdventureDraft(id);
    expect(loaded?.frozen).toBe(true);
    expect(loaded?.title).toBe("Renamed");
    expect(loaded?.end).toEqual({ kind: "route" });
    expect(loaded?.steps.map((s) => s.questId)).toEqual([a, b]);
    expect(loaded?.steps.map((s) => s.narrative)).toEqual(["before 0", "before 1"]);
    await expect(hero.retireHeroAdventure(id)).rejects.toThrow();
  });

  test("a step whose quest is gone (questId 0) survives an edit under a run: kept as 0, texts updated", async () => {
    const { hero, adv } = mod();
    const [a, b, c] = adminQuests();
    if (!a || !b || !c) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(draft([a, b, c]));
    await adv.startAdventureRun({ adventureId: id });
    t.sqlite.pragma("foreign_keys = OFF");
    t.sqlite
      .prepare("UPDATE adventure_steps SET questId = 0 WHERE adventureId = ? AND stepIndex = 1")
      .run(id);

    const loaded = await hero.loadHeroAdventureDraft(id);
    if (!loaded) throw new Error("draft expected");
    const { frozen: _frozen, ...rest } = loaded;
    await hero.updateHeroAdventure(id, {
      ...rest,
      title: "Edited",
      steps: rest.steps.map((s, i) => (i === 2 ? { ...s, narrative: "new words" } : s)),
    });

    const rows = t.sqlite
      .prepare(
        "SELECT questId, enNarrative AS narrative FROM adventure_steps WHERE adventureId = ? ORDER BY stepIndex",
      )
      .all(id) as { questId: number; narrative: string }[];
    expect(rows.map((r) => r.questId)).toEqual([a, 0, c]);
    expect(rows[2]?.narrative).toBe("new words");
    expect((await hero.loadHeroAdventureDraft(id))?.title).toBe("Edited");
  });

  test("reopening an adventure and saving it again keeps the way-back texts and the monster", async () => {
    const { hero } = mod();
    const [a, b] = adminQuests();
    if (!a || !b) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(
      draft([a, b], { kind: "boss", monster: "forest_titan" }),
    );
    const loaded = await hero.loadHeroAdventureDraft(id);
    if (!loaded) throw new Error("draft expected");
    expect(loaded.steps[0]?.outro).toBe("after 0");
    expect(loaded.end).toEqual({ kind: "boss", monster: "forest_titan" });

    const { frozen: _frozen, ...rest } = loaded;
    await hero.updateHeroAdventure(id, { ...rest, title: "Another name" });
    const again = await hero.loadHeroAdventureDraft(id);
    expect(again?.title).toBe("Another name");
    expect(again?.steps[0]?.outro).toBe("after 0");
    expect(again?.end).toEqual({ kind: "boss", monster: "forest_titan" });
  });

  test("an adventure of the game cannot be edited or retired by the writer", async () => {
    const { hero } = mod();
    const [a, b] = adminQuests();
    if (!a || !b) throw new Error("seed quests expected");
    const game = (
      t.sqlite.prepare("SELECT id FROM adventures WHERE author = 'Admin' LIMIT 1").get() as {
        id: number;
      }
    ).id;
    await expect(hero.updateHeroAdventure(game, draft([a, b]))).rejects.toThrow();
    await expect(hero.retireHeroAdventure(game)).rejects.toThrow();
  });

  test("a quest a live adventure names cannot be deleted, a retired one's can, and nothing is erased", async () => {
    const { hero, adv, quests, boss } = mod();
    const [a] = adminQuests();
    if (!a) throw new Error("seed quest expected");
    const q1 = await quests.createQuestTemplate({
      enTitle: "Mine A",
      frTitle: "Mine A",
      deTitle: "",
      esTitle: "",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
      author: "hero",
    });
    const id = await hero.createHeroAdventure(
      draft([q1, a], { kind: "boss", monster: "iron_golem" }),
    );
    expect((await quests.adventuresUsingQuest(q1)).map((r) => r.enTitle)).toHaveLength(1);
    await expect(quests.deleteQuest(q1)).rejects.toBeInstanceOf(quests.QuestInUseError);

    // Retired, with a finished run and a fight: the quest may go, the rest stays (the device's setting).
    await boss.getOrCreateBossFight(id, "medium");
    await playAll(id);
    await hero.retireHeroAdventure(id);
    expect(await quests.adventuresUsingQuest(q1)).toHaveLength(0);
    t.sqlite.pragma("foreign_keys = OFF");
    await quests.deleteQuest(q1);

    const row = t.sqlite.prepare("SELECT isActive FROM adventures WHERE id = ?").get(id) as {
      isActive: number;
    };
    expect(row.isActive).toBe(0);
    expect(
      (
        t.sqlite.prepare("SELECT count(*) AS n FROM boss_fights WHERE adventureId = ?").get(id) as {
          n: number;
        }
      ).n,
    ).toBe(1);
    expect(
      (
        t.sqlite
          .prepare("SELECT count(*) AS n FROM adventure_steps WHERE adventureId = ?")
          .get(id) as {
          n: number;
        }
      ).n,
    ).toBe(2);
    expect(
      (
        t.sqlite
          .prepare(
            "SELECT count(*) AS n FROM adventure_runs WHERE adventureId = ? AND status = 'finished'",
          )
          .get(id) as { n: number }
      ).n,
    ).toBe(1);
    // Retired rows are in the cache with isActive 0, and the gallery decides.
    expect((await adv.listAdventures()).find((x) => x.id === id)?.isActive).toBe(0);
    expect((await adv.getFinishedRunCountsByAdventure()).get(id)).toBe(1);
  });

  test("a step whose quest is gone refuses a run, and the cover stays listed as missing", async () => {
    const { hero, adv, quests } = mod();
    const [a, b] = adminQuests();
    if (!a || !b) throw new Error("seed quests expected");
    const mine = await quests.createQuestTemplate({
      enTitle: "Mine B",
      frTitle: "Mine B",
      deTitle: "",
      esTitle: "",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
      author: "hero",
    });
    const id = await hero.createHeroAdventure(draft([mine, a, b]));
    t.sqlite.pragma("foreign_keys = OFF");
    t.sqlite.prepare("DELETE FROM quests WHERE id = ?").run(mine);
    quests.invalidateQuestTemplates();

    expect(await adv.missingStepQuests(id)).toEqual([0]);
    await expect(adv.startAdventureRun({ adventureId: id })).rejects.toThrow(/quest missing/);
    const listed = (await adv.listAdventures()).find((x) => x.id === id);
    expect(listed?.coverMissing).toBe(true);
  });

  test("a gap in the run's step indexes never ends a run early", async () => {
    const { hero, adv } = mod();
    const [a, b, c] = adminQuests();
    if (!a || !b || !c) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(draft([a, b, c]));
    t.sqlite
      .prepare("UPDATE adventure_steps SET stepIndex = 3 WHERE adventureId = ? AND stepIndex = 2")
      .run(id);

    const run = await adv.startAdventureRun({ adventureId: id });
    const first = run.activeStep;
    if (!first) throw new Error("active step expected");
    const one = await adv.completeAdventureRunStep({
      runStepId: first.id,
      completedSessionId: session(first.questId),
    });
    expect(one.isFinished).toBe(false);
    const second = await adv.getActiveAdventureRun(id);
    expect(second?.activeStep?.stepIndex).toBe(1);
    const two = await adv.completeAdventureRunStep({
      runStepId: second?.activeStep?.id as number,
      completedSessionId: session(b),
    });
    expect(two.isFinished).toBe(false);
    const third = await adv.getActiveAdventureRun(id);
    expect(third?.activeStep?.stepIndex).toBe(3);
  });

  test("deleting the session of a step reopens that step and relocks the next real one, gap or not", async () => {
    const { hero, adv } = mod();
    const completed = require("../db/completed") as typeof import("../db/completed");
    const [a, b, c] = adminQuests();
    if (!a || !b || !c) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(draft([a, b, c]));
    t.sqlite
      .prepare("UPDATE adventure_steps SET stepIndex = 3 WHERE adventureId = ? AND stepIndex = 2")
      .run(id);
    const run = await adv.startAdventureRun({ adventureId: id });
    const firstStep = run.activeStep;
    if (!firstStep) throw new Error("active step expected");
    await adv.completeAdventureRunStep({
      runStepId: firstStep.id,
      completedSessionId: session(a),
    });
    const second = (await adv.getActiveAdventureRun(id))?.activeStep;
    if (!second) throw new Error("second step expected");
    const secondSession = session(b);
    await adv.completeAdventureRunStep({ runStepId: second.id, completedSessionId: secondSession });
    expect((await adv.getActiveAdventureRun(id))?.activeStep?.stepIndex).toBe(3);

    expect(await completed.deleteSession(secondSession)).toBe("deleted");

    const steps = (await adv.getActiveAdventureRun(id))?.steps.map((s) => [s.stepIndex, s.status]);
    expect(steps).toEqual([
      [0, "completed"],
      [1, "active"],
      [3, "locked"],
    ]);
  });

  test("the narrative follows the step's quest: a step changed under a run shows none", async () => {
    const { hero, adv } = mod();
    const narrative =
      require("../db/adventures-narrative") as typeof import("../db/adventures-narrative");
    const [a, b, c] = adminQuests();
    if (!a || !b || !c) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(draft([a, b]));
    const run = await adv.startAdventureRun({ adventureId: id });
    const step = run.activeStep;
    if (!step) throw new Error("active step expected");
    expect(await narrative.getAdventureStepNarrative(step.id)).toBe("before 0");
    expect(await narrative.getAdventureStepOutroNarrative(step.id)).toBe("after 0");

    // The same step index, now another quest (a merge replaced the steps).
    t.sqlite
      .prepare("UPDATE adventure_steps SET questId = ? WHERE adventureId = ? AND stepIndex = 0")
      .run(c, id);
    expect(await narrative.getAdventureStepNarrative(step.id)).toBeNull();
    expect(await narrative.getAdventureStepOutroNarrative(step.id)).toBeNull();
  });

  test("changing the monster gives the next fight the new monster's weakness", async () => {
    const { hero, boss } = mod();
    const [a, b] = adminQuests();
    if (!a || !b) throw new Error("seed quests expected");
    const id = await hero.createHeroAdventure(
      draft([a, b], { kind: "boss", monster: "shadow_serpent" }),
    );
    expect((await boss.getOrCreateBossFight(id, "medium"))?.weaknessMuscle).toBe("abs");
    const loaded = await hero.loadHeroAdventureDraft(id);
    if (!loaded) throw new Error("draft expected");
    const { frozen: _f, ...rest } = loaded;
    await hero.updateHeroAdventure(id, { ...rest, end: { kind: "boss", monster: "iron_golem" } });
    const iron = await hero.monsterOf("iron_golem");
    expect((await boss.getOrCreateBossFight(id, "medium"))?.weaknessMuscle).toBe(iron?.weakness);
    expect((await boss.getBossFightByAdventure(id))?.weaknessMuscle).toBe(iron?.weakness);
  });

  test("a hero quest edited under an adventure shows its new title on the detail", async () => {
    const { hero, adv, quests } = mod();
    const [a] = adminQuests();
    if (!a) throw new Error("seed quest expected");
    const mine = await quests.createQuestTemplate({
      enTitle: "Before",
      frTitle: "Before",
      deTitle: "",
      esTitle: "",
      enDescription: "",
      frDescription: "",
      deDescription: "",
      esDescription: "",
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      exercises: [],
      author: "hero",
    });
    const id = await hero.createHeroAdventure(draft([mine, a]));
    expect((await adv.getAdventureDetails(id))?.steps[0]?.quest.enTitle).toBe("Before");
    await quests.updateQuestMeta(mine, { enTitle: "After" });
    quests.invalidateQuestTemplates();
    expect((await adv.getAdventureDetails(id))?.steps[0]?.quest.enTitle).toBe("After");
  });

  test("an offered first step is the game's: a hero adventure on the on-ramp offers nothing", async () => {
    const { hero, adv } = mod();
    const onRamp = t.sqlite
      .prepare(
        "SELECT id FROM quests WHERE enTitle = 'The Squire''s Awakening' AND author = 'Admin'",
      )
      .get() as { id: number } | undefined;
    const [a] = adminQuests();
    if (!a) throw new Error("seed quest expected");
    const id = await hero.createHeroAdventure(draft([onRamp?.id ?? a, a]));
    expect(await adv.offeredFirstStep(id)).toBeNull();
  });

  test("recentSessionQuests: played order, quest-less sessions skipped, none under two, eight at most", async () => {
    const { hero } = mod();
    t.sqlite.exec("DELETE FROM completed_sessions");
    expect(await hero.recentSessionQuests()).toEqual([]);
    const ids = adminQuests();
    const [a, b] = ids;
    if (!a || !b) throw new Error("seed quests expected");
    const at = (n: number) => 1_700_000_000 + n;
    const insert = t.sqlite.prepare(
      "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 1, ?)",
    );
    insert.run(a, at(1));
    expect(await hero.recentSessionQuests()).toEqual([]);
    insert.run(null, at(2));
    insert.run(b, at(3));
    expect(await hero.recentSessionQuests()).toEqual([a, b]);
    for (let n = 4; n < 14; n++) insert.run(ids[n % ids.length], at(n));
    const last = await hero.recentSessionQuests();
    expect(last).toHaveLength(8);
    expect(last[7]).toBe(ids[13 % ids.length]);
  });

  test("worksSparedZone flags the hero's own quest and never the game's, which substitutes", () => {
    const { hero } = mod();
    const slot = { exerciseId: 7 } as never;
    const quest = (author: string) => ({ author, exercises: [slot] }) as never;
    expect(hero.worksSparedZone(quest("hero"), new Set([7]))).toBe(true);
    expect(hero.worksSparedZone(quest("hero"), new Set([8]))).toBe(false);
    expect(hero.worksSparedZone(quest("Admin"), new Set([7]))).toBe(false);
  });

  describe("the boss's voice", () => {
    const voice = (
      name: string,
      lines: Partial<Record<"idle" | "crit" | "enrage", string[]>> = {},
    ) => ({
      name,
      lines: { idle: [], crit: [], enrage: [], ...lines },
    });
    const row = (id: number) =>
      t.sqlite
        .prepare("SELECT kind, bossName, bossLinesJson FROM adventures WHERE id = ?")
        .get(id) as {
        kind: string;
        bossName: string | null;
        bossLinesJson: string | null;
      };
    const boss = { kind: "boss" as const, monster: "iron_golem" as const };

    test("a boss with a voice writes both columns, the lines in moment order", async () => {
      const { hero } = mod();
      const [a, b] = adminQuests();
      if (!a || !b) throw new Error("seed quests expected");
      const id = await hero.createHeroAdventure({
        ...draft([a, b], boss),
        voice: voice("  Night   coil ", { enrage: ["Enough."], idle: [" Again. ", "", "x"] }),
      });
      expect(row(id)).toMatchObject({
        bossName: "Night coil",
        bossLinesJson: '{"idle":["Again.","x"],"crit":[],"enrage":["Enough."]}',
      });
      const loaded = await hero.loadHeroAdventureDraft(id);
      expect(loaded?.voice).toEqual({
        name: "Night coil",
        lines: { idle: ["Again.", "x"], crit: [], enrage: ["Enough."] },
      });
    });

    test("a route with a voice in the draft writes nothing, and an empty voice is NULL", async () => {
      const { hero } = mod();
      const [a, b] = adminQuests();
      if (!a || !b) throw new Error("seed quests expected");
      const route = await hero.createHeroAdventure({
        ...draft([a, b]),
        voice: voice("Ghost", { idle: ["Boo."] }),
      });
      expect(row(route)).toMatchObject({ bossName: null, bossLinesJson: null });
      const silent = await hero.createHeroAdventure({ ...draft([a, b], boss), voice: voice("  ") });
      expect(row(silent)).toMatchObject({ kind: "boss", bossName: null, bossLinesJson: null });
    });

    test("under a run the voice is written, and the stored end decides, never the draft's", async () => {
      const { hero, adv } = mod();
      const [a, b] = adminQuests();
      if (!a || !b) throw new Error("seed quests expected");
      const bossId = await hero.createHeroAdventure({
        ...draft([a, b], boss),
        voice: voice("One"),
      });
      await adv.startAdventureRun({ adventureId: bossId });
      // A draft that says route for a frozen boss cannot erase the voice.
      await hero.updateHeroAdventure(bossId, {
        ...draft([a, b]),
        voice: voice("Two", { crit: ["Hah."] }),
      });
      expect(row(bossId)).toMatchObject({
        kind: "boss",
        bossName: "Two",
        bossLinesJson: '{"idle":[],"crit":["Hah."],"enrage":[]}',
      });
      expect((await hero.loadHeroAdventureDraft(bossId))?.steps.map((s) => s.questId)).toEqual([
        a,
        b,
      ]);

      // A draft that says boss for a frozen route cannot write one.
      const routeId = await hero.createHeroAdventure(draft([a, b]));
      await adv.startAdventureRun({ adventureId: routeId });
      await hero.updateHeroAdventure(routeId, { ...draft([a, b], boss), voice: voice("Sneaky") });
      expect(row(routeId)).toMatchObject({ kind: "route", bossName: null, bossLinesJson: null });
    });

    test("changing the monster keeps the voice", async () => {
      const { hero } = mod();
      const [a, b] = adminQuests();
      if (!a || !b) throw new Error("seed quests expected");
      const id = await hero.createHeroAdventure({
        ...draft([a, b], { kind: "boss", monster: "shadow_serpent" }),
        voice: voice("Keeper"),
      });
      const loaded = await hero.loadHeroAdventureDraft(id);
      if (!loaded) throw new Error("draft expected");
      const { frozen: _f, uuid: _u, ...rest } = loaded;
      await hero.updateHeroAdventure(id, { ...rest, end: boss });
      expect(row(id)).toMatchObject({ bossName: "Keeper" });
    });
  });
});
