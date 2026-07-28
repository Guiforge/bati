import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/adventures-narrative", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("getAdventureStepNarrative returns localized narrative", async () => {
    const {
      getAdventureStepNarrative,
      getAdventureStepOutroNarrative,
    } = require("../db/adventures-narrative");
    const { db, schema } = require("../db/client");

    // 0. Create a quest
    const [quest] = await db
      .insert(schema.quests)
      .values({
        enTitle: "Test Quest",
        frTitle: "Quête Test",
        enDescription: "Desc",
        frDescription: "Desc",
        author: "Test",
      })
      .returning();

    // 1. Create an adventure
    const [adventure] = await db
      .insert(schema.adventures)
      .values({
        enTitle: "Test Adventure",
        frTitle: "Aventure Test",
        enDescription: "Desc",
        frDescription: "Desc",
        author: "Test",
        kind: "route",
        questId: quest.id,
      })
      .returning();

    // 2. Create a step with narratives
    await db
      .insert(schema.adventureSteps)
      .values({
        adventureId: adventure.id,
        stepIndex: 0,
        questId: quest.id,
        enNarrative: "Intro EN",
        frNarrative: "Intro FR",
        enOutroNarrative: "Outro EN",
        frOutroNarrative: "Outro FR",
      })
      .returning();

    // 3. Create a run
    const [run] = await db
      .insert(schema.adventureRuns)
      .values({
        adventureId: adventure.id,
        status: "active",
      })
      .returning();

    // 4. Create a run step
    const [runStep] = await db
      .insert(schema.adventureRunSteps)
      .values({
        runId: run.id,
        stepIndex: 0,
        questId: quest.id,
        status: "unlocked",
      })
      .returning();

    // 5. Test getAdventureStepNarrative
    const introEn = await getAdventureStepNarrative(runStep.id, "en");
    expect(introEn).toBe("Intro EN");

    const introFr = await getAdventureStepNarrative(runStep.id, "fr");
    expect(introFr).toBe("Intro FR");

    // 6. Test getAdventureStepOutroNarrative
    const outroEn = await getAdventureStepOutroNarrative(runStep.id, "en");
    expect(outroEn).toBe("Outro EN");

    const outroFr = await getAdventureStepOutroNarrative(runStep.id, "fr");
    expect(outroFr).toBe("Outro FR");
  });
});
