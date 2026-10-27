import assert from "node:assert/strict";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * What the adventures gallery reads for the runs under way: every run, newest first, one entry
 * per adventure. `getAnyActiveAdventureRun` answers for one run only, which is what Home wants.
 */
describe("db/adventures activeRunProgress", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("reads every run under way, and only the one that moved moves", async () => {
    const adventures = require("../db/adventures") as typeof import("../db/adventures");
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const completed = require("../db/completed") as typeof import("../db/completed");

    expect(await adventures.activeRunProgress()).toEqual([]);

    const playable = (await adventures.listAdventures()).filter((a) => !a.coverMissing);
    const [older, newer] = playable;
    assert(older && newer, "the seed holds two playable adventures");

    const olderRun = await adventures.startAdventureRun({ adventureId: older.id });
    await adventures.startAdventureRun({ adventureId: newer.id });

    expect(await adventures.activeRunProgress()).toEqual([
      { adventureId: newer.id, completedCount: 0, currentIndex: 0 },
      { adventureId: older.id, completedCount: 0, currentIndex: 0 },
    ]);

    // One step of the OLDER run: the newest run is not the one that moves. `currentIndex` follows
    // the active step and `completedCount` the done ones; they coincide because steps unlock in order.
    const squat = (await exercises.listExercises()).find((e) => e.enName === "Squat");
    assert(squat, "seeded Squat");
    const runStep = olderRun.activeStep;
    assert(runStep, "an active step on the older run");
    const questId = runStep.questId;
    assert(questId != null, "the step names a quest");
    const sessionId = await completed.createCompletedSession({
      questId,
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
    await adventures.completeAdventureRunStep({
      runStepId: runStep.id,
      completedSessionId: sessionId,
      questId,
    });

    expect(await adventures.activeRunProgress()).toEqual([
      { adventureId: newer.id, completedCount: 0, currentIndex: 0 },
      { adventureId: older.id, completedCount: 1, currentIndex: 1 },
    ]);

    // A run that was left is no longer under way.
    await adventures.leaveAdventureRun(newer.id);
    expect(await adventures.activeRunProgress()).toEqual([
      { adventureId: older.id, completedCount: 1, currentIndex: 1 },
    ]);
  });
});
