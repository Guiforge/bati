import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/quests", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("listQuestTemplates includes seeded quest", async () => {
    const quests = require("../db/quests") as typeof import("../db/quests");

    const all = await quests.listQuestTemplates();
    expect(all.length).toBeGreaterThanOrEqual(5);
    const seeded = all.find((q) => q.frTitle === "Couper du bois");
    const extra = all.find((q) => q.frTitle === "Forge du tronc");

    expect(seeded).toBeTruthy();
    expect(seeded?.rounds).toBe(3);
    expect(typeof seeded?.restSeconds).toBe("number");
    expect(seeded?.exercises.length).toBe(3);

    expect(extra).toBeTruthy();
    expect(extra?.exercises.length).toBeGreaterThan(0);
  });

  test("trainingFocus keeps what a quest is for and drops what it only brushes", () => {
    const quests = require("../db/quests") as typeof import("../db/quests");
    type Quests = typeof quests;

    // Only the fields trainingFocus reads. Arms 3, back 2, legs 1.
    const exercisesById = {
      1: { id: 1, muscles: ["arms", "back"] },
      2: { id: 2, muscles: ["arms", "back"] },
      3: { id: 3, muscles: ["arms"] },
      4: { id: 4, muscles: ["legs"] },
    } as unknown as Parameters<Quests["trainingFocus"]>[1];

    const quest = {
      archetype: "strength",
      exercises: [1, 2, 3, 4].map((exerciseId) => ({ exerciseId })),
    } as unknown as Parameters<Quests["trainingFocus"]>[0][number];

    const focus = quests.trainingFocus([quest], exercisesById);

    // Legs sits under half of arms' count: one exercise out of four says nothing about the quest.
    expect(focus.muscles).toEqual(["arms", "back"]);
    expect(focus.archetype).toBe("strength");

    // User-authored quests declare no archetype — the label starts on the muscles instead.
    const authored = { ...quest, archetype: null } as typeof quest;
    expect(quests.trainingFocus([authored], exercisesById).archetype).toBeNull();
  });

  test("getQuestById computes targets from user level", async () => {
    const quests = require("../db/quests") as typeof import("../db/quests");

    const templates = await quests.listQuestTemplates();
    const seeded = templates.find((q) => q.frTitle === "Couper du bois");
    expect(seeded).toBeTruthy();
    if (!seeded) throw new Error("Seeded quest 'Couper du bois' not found");

    const quest = await quests.getQuestById(seeded.id, quests.Difficulty.Easy);
    expect(quest).toBeTruthy();
    if (!quest) throw new Error("Quest not found by id");

    const first = quest.exercises[0];
    if (!first) throw new Error("Expected quest exercise #1");
    expect(first.exercise.enName).toBe("Squat");
    expect(first.target.type).toBe("reps");
    expect(first.target.value).toBe(11);

    const second = quest.exercises[1];
    if (!second) throw new Error("Expected quest exercise #2");
    expect(second.exercise.enName).toBe("Push-ups");
    expect(second.target.type).toBe("reps");
    expect(second.target.value).toBe(8);

    const third = quest.exercises[2];
    if (!third) throw new Error("Expected quest exercise #3");
    expect(third.exercise.enName).toBe("Plank");
    expect(third.target.type).toBe("time");
    expect(third.target.value).toBe(29);
  });

  test("create/update/set/delete quest template", async () => {
    const quests = require("../db/quests") as typeof import("../db/quests");
    const exercises = require("../db/exercises") as typeof import("../db/exercises");

    const allEx = await exercises.listExercises();
    const squat = allEx.find((e) => e.enName === "Squat");
    expect(squat).toBeTruthy();
    if (!squat) throw new Error("Seeded exercise 'Squat' not found");

    const id = await quests.createQuestTemplate({
      enTitle: "Test quest",
      frTitle: "Quete test",
      enDescription: "Test",
      frDescription: "Test",
      rounds: 1,
      restSeconds: 20,
      roundRestSeconds: 60,
      exercises: [
        {
          exerciseId: squat.id,
          images: ["assets/placeholder.jpg"],
          baseTarget: { type: "reps", min: 10, max: 14 },
        },
      ],
    });

    const created = await quests.getQuestTemplateById(id);
    expect(created?.enTitle).toBe("Test quest");
    expect(created?.roundRestSeconds).toBe(60);
    expect(created?.exercises.length).toBe(1);

    await quests.updateQuestMeta(id, { enTitle: "Test quest updated" });
    const updated = await quests.getQuestTemplateById(id);
    expect(updated?.enTitle).toBe("Test quest updated");

    await quests.setQuestExercises(id, []);
    const emptied = await quests.getQuestTemplateById(id);
    expect(emptied?.exercises.length).toBe(0);

    await quests.ensureQuestHasExercise(id, squat.id, {
      type: "reps",
      min: 5,
      max: 7,
    });
    const afterEnsure = await quests.getQuestTemplateById(id);
    expect(afterEnsure?.exercises.length).toBe(1);

    await quests.ensureQuestHasExercise(id, squat.id, {
      type: "reps",
      min: 5,
      max: 7,
    });
    const afterEnsure2 = await quests.getQuestTemplateById(id);
    expect(afterEnsure2?.exercises.length).toBe(1);

    await quests.deleteQuest(id);
    expect(await quests.getQuestTemplateById(id)).toBeNull();
  });
});
