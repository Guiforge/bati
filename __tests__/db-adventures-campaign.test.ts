import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/adventures campaign", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("startAdventureRun creates run steps and complete advances to next step", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const completed = require("../db/completed") as typeof import("../db/completed");

    const all = await adventures.listAdventures();
    expect(all.length).toBeGreaterThan(0);

    const adv = all.find((a) => a.frTitle === "La route du bûcheron");
    expect(adv).toBeTruthy();
    if (!adv) throw new Error("Expected seeded campaign 'La route du bûcheron'");

    const details = await adventures.getAdventureDetails(adv.id);
    expect(details).toBeTruthy();
    if (!details) throw new Error("Expected adventure details");
    expect(details.steps.length).toBeGreaterThanOrEqual(2);

    const step0QuestId = details.steps[0]?.questId;
    const step1QuestId = details.steps[1]?.questId;
    expect(step0QuestId).toBeTruthy();
    expect(step1QuestId).toBeTruthy();
    if (!step0QuestId || !step1QuestId) throw new Error("Expected at least 2 campaign steps");

    const allEx = await exercises.listExercises();
    const squat = allEx.find((e) => e.enName === "Squat");
    expect(squat).toBeTruthy();
    if (!squat) throw new Error("Expected seeded exercise 'Squat'");

    const run = await adventures.startAdventureRun({
      adventureId: adv.id,
      difficultyOverride: "medium",
    });

    expect(run.run.adventureId).toBe(adv.id);
    expect(run.steps.length).toBeGreaterThanOrEqual(2);
    expect(run.activeStep?.stepIndex).toBe(0);

    const session1 = await completed.createCompletedSession({
      questId: step0QuestId,
      userLevel: "medium",
      durationSeconds: 60,
      xpEarned: 10,
      exercises: [
        {
          exerciseId: squat.id,
          sortOrder: 0,
          result: { type: "reps", value: 10 },
          target: { type: "reps", value: 10 },
          performedAt: new Date(),
        },
      ],
      performedAt: new Date(),
    });

    const step0 = run.activeStep;
    if (!step0) throw new Error("Expected an active run step");

    const progressed = await adventures.completeAdventureRunStep({
      runStepId: step0.id,
      completedSessionId: session1,
    });

    expect(progressed.isFinished).toBe(false);
    expect(progressed.nextQuestId).toBe(step1QuestId);
    expect(progressed.nextRunStepId).toBeTruthy();

    const reloaded = await adventures.getActiveAdventureRun(adv.id);
    expect(reloaded?.activeStep?.stepIndex).toBe(1);

    const session2 = await completed.createCompletedSession({
      questId: step1QuestId,
      userLevel: "medium",
      durationSeconds: 60,
      xpEarned: 10,
      exercises: [
        {
          exerciseId: squat.id,
          sortOrder: 0,
          result: { type: "reps", value: 10 },
          target: { type: "reps", value: 10 },
          performedAt: new Date(),
        },
      ],
      performedAt: new Date(),
    });

    const finished = await adventures.completeAdventureRunStep({
      runStepId: progressed.nextRunStepId as number,
      completedSessionId: session2,
    });

    const step2QuestId = details.steps[2]?.questId ?? null;

    // Seeded campaign has 3 steps; completing step 1 should not finish yet.
    if (step2QuestId != null) {
      expect(finished.isFinished).toBe(false);
      expect(finished.nextQuestId).toBe(step2QuestId);
      expect(finished.nextRunStepId).toBeTruthy();

      const session3 = await completed.createCompletedSession({
        questId: step2QuestId,
        userLevel: "medium",
        durationSeconds: 60,
        xpEarned: 10,
        exercises: [
          {
            exerciseId: squat.id,
            sortOrder: 0,
            result: { type: "reps", value: 10 },
            target: { type: "reps", value: 10 },
            performedAt: new Date(),
          },
        ],
        performedAt: new Date(),
      });

      const final = await adventures.completeAdventureRunStep({
        runStepId: finished.nextRunStepId as number,
        completedSessionId: session3,
      });

      expect(final.isFinished).toBe(true);
      expect(await adventures.getActiveAdventureRun(adv.id)).toBeNull();
    } else {
      // If the campaign only has 2 steps, we should be finished now.
      expect(finished.isFinished).toBe(true);
      expect(await adventures.getActiveAdventureRun(adv.id)).toBeNull();
    }
  });

  /**
   * The rematch: replaying a beaten boss campaign resurrects the boss one tier up. This is the
   * wiring getBossBanners has described since before it existed — the banner survives the reset
   * because the finished run carries the victory.
   */
  test("replaying a beaten boss campaign resurrects the boss at tier 1", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");
    const bosses = require("../db/bossFights") as typeof import("../db/bossFights");

    const all = await adventures.listAdventures();
    const bossAdv = all.find((a) => a.kind === "boss");
    if (!bossAdv) throw new Error("Expected a seeded boss adventure");

    // A beaten campaign: the fight is dead, the run is finished.
    const fight = await bosses.getOrCreateBossFight(bossAdv.id, "medium");
    if (!fight) throw new Error("Expected a boss fight");
    const baseTotal = fight.totalHp;
    t.sqlite
      .prepare("UPDATE boss_fights SET currentHp = 0, defeatedAt = ? WHERE id = ?")
      .run(Date.now(), fight.id);
    t.sqlite
      .prepare("INSERT INTO adventure_runs (adventureId, status) VALUES (?, 'finished')")
      .run(bossAdv.id);

    await adventures.startAdventureRun({ adventureId: bossAdv.id, difficultyOverride: "medium" });

    const revived = await bosses.getBossFightByAdventure(bossAdv.id);
    expect(revived?.defeatedAt).toBeNull();
    expect(revived?.tier).toBe(1);
    expect(revived?.totalHp).toBe(Math.round(baseTotal * bosses.tierHpMultiplier(1)));
    expect(revived?.currentHp).toBe(revived?.totalHp);

    // A replay of a live fight must not touch it: quitting a campaign and starting again is not
    // a rematch, and resetting here would refill a half-dead boss.
    const runs = await adventures.getActiveAdventureRun(bossAdv.id);
    if (!runs) throw new Error("Expected the new run");
    t.sqlite.prepare("UPDATE boss_fights SET currentHp = 10 WHERE id = ?").run(fight.id);
    t.sqlite.prepare("DELETE FROM adventure_run_steps WHERE runId = ?").run(runs.run.id);
    t.sqlite.prepare("DELETE FROM adventure_runs WHERE id = ?").run(runs.run.id);

    await adventures.startAdventureRun({ adventureId: bossAdv.id, difficultyOverride: "medium" });
    expect((await bosses.getBossFightByAdventure(bossAdv.id))?.currentHp).toBe(10);
  });
});
