import { createTestDb } from "./helpers/testDb";

const getDbModules = () => {
  const adventures = require("../src/db/adventures") as typeof import("../src/db/adventures");
  const exercises = require("../src/db/exercises") as typeof import("../src/db/exercises");
  const completed = require("../src/db/completed") as typeof import("../src/db/completed");
  const quests = require("../src/db/quests") as typeof import("../src/db/quests");

  return { adventures, exercises, completed, quests };
};

const expectSeededCampaign = async (adventures: typeof import("../src/db/adventures")) => {
  const all = await adventures.listAdventures();
  expect(all.length).toBeGreaterThan(0);

  const adv = all.find((a) => a.frTitle === "La route du bûcheron");
  expect(adv).toBeTruthy();
  if (!adv) throw new Error("Expected seeded campaign 'La route du bûcheron'");

  return adv;
};

const createQuickCompletedSession = async (
  completed: typeof import("../src/db/completed"),
  {
    questId,
    exerciseId,
  }: {
    questId: number;
    exerciseId: number;
  }
) => {
  return completed.createCompletedSession({
    questId,
    userLevel: "medium",
    durationSeconds: 60,
    xpEarned: 10,
    exercises: [
      {
        exerciseId,
        sortOrder: 0,
        result: { type: "reps", value: 10 },
        target: { type: "reps", value: 10 },
        performedAt: new Date(),
      },
    ],
    performedAt: new Date(),
  });
};

const finishRunIfMoreSteps = async (
  adventures: typeof import("../src/db/adventures"),
  completed: typeof import("../src/db/completed"),
  {
    adventureId,
    nextRunStepId,
    remainingQuestIds,
    exerciseId,
  }: {
    adventureId: number;
    nextRunStepId: number | null;
    remainingQuestIds: number[];
    exerciseId: number;
  }
) => {
  if (remainingQuestIds.length === 0) {
    expect(await adventures.getActiveAdventureRun(adventureId)).toBeNull();
    return;
  }

  // Complete remaining steps until finished.
  let currentRunStepId = nextRunStepId;
  for (const questId of remainingQuestIds) {
    expect(currentRunStepId).toBeTruthy();
    if (!currentRunStepId) throw new Error("Expected next run step id");

    const sessionId = await createQuickCompletedSession(completed, {
      questId,
      exerciseId,
    });

    const progressed = await adventures.completeAdventureRunStep({
      runStepId: currentRunStepId,
      completedSessionId: sessionId,
    });

    if (questId === remainingQuestIds[remainingQuestIds.length - 1]) {
      expect(progressed.isFinished).toBe(true);
    }

    currentRunStepId = (progressed.nextRunStepId as number | null) ?? null;
  }

  expect(await adventures.getActiveAdventureRun(adventureId)).toBeNull();
};

describe("db/adventures campaign", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../src/db/client", () => ({
      db: t.db,
      schema: require("../src/db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  test("campaign steps resolve quests via getQuestById", async () => {
    const { adventures, quests } = getDbModules();
    const adv = await expectSeededCampaign(adventures);

    const details = await adventures.getAdventureDetails(adv.id);
    expect(details).toBeTruthy();
    if (!details) throw new Error("Expected adventure details");
    expect(details.steps.length).toBeGreaterThanOrEqual(2);

    // Regression: tapping an adventure step navigates to Quest Details, which uses getQuestById.
    // If getQuestById returns null, the UI shows an "invalid quest" error.
    for (const step of details.steps) {
      const stepQuest = await quests.getQuestById(step.questId, quests.Difficulty.Medium);
      expect(stepQuest).toBeTruthy();
    }
  });

  test("startAdventureRun progresses when steps are completed", async () => {
    const { adventures, exercises, completed } = getDbModules();
    const adv = await expectSeededCampaign(adventures);

    const details = await adventures.getAdventureDetails(adv.id);
    expect(details).toBeTruthy();
    if (!details) throw new Error("Expected adventure details");
    expect(details.steps.length).toBeGreaterThanOrEqual(2);

    const questIds = details.steps.map((s) => s.questId);
    const step0QuestId = questIds[0];
    const step1QuestId = questIds[1];
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

    const step0 = run.activeStep;
    if (!step0) throw new Error("Expected an active run step");

    const session1 = await createQuickCompletedSession(completed, {
      questId: step0QuestId,
      exerciseId: squat.id,
    });

    const progressed = await adventures.completeAdventureRunStep({
      runStepId: step0.id,
      completedSessionId: session1,
    });

    expect(progressed.isFinished).toBe(false);
    expect(progressed.nextQuestId).toBe(step1QuestId);
    expect(progressed.nextRunStepId).toBeTruthy();

    const reloaded = await adventures.getActiveAdventureRun(adv.id);
    expect(reloaded?.activeStep?.stepIndex).toBe(1);

    const session2 = await createQuickCompletedSession(completed, {
      questId: step1QuestId,
      exerciseId: squat.id,
    });

    const finished = await adventures.completeAdventureRunStep({
      runStepId: progressed.nextRunStepId as number,
      completedSessionId: session2,
    });

    const remainingQuestIds = questIds.slice(2);
    if (remainingQuestIds.length === 0) {
      expect(finished.isFinished).toBe(true);
    } else {
      expect(finished.isFinished).toBe(false);
      expect(finished.nextQuestId).toBe(remainingQuestIds[0]);
      expect(finished.nextRunStepId).toBeTruthy();
    }

    await finishRunIfMoreSteps(adventures, completed, {
      adventureId: adv.id,
      nextRunStepId: (finished.nextRunStepId as number | null) ?? null,
      remainingQuestIds,
      exerciseId: squat.id,
    });
  });
});
