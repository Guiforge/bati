import { createTestDb } from "./helpers/testDb";

describe("db/completed", () => {
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

  test("createCompletedSession requires exercises", async () => {
    const completed = require("../src/db/completed") as typeof import("../src/db/completed");

    await expect(
      completed.createCompletedSession({
        exercises: [],
      }),
    ).rejects.toThrow("must have exercises");
  });

  test("create/list/get completed session", async () => {
    const completed = require("../src/db/completed") as typeof import("../src/db/completed");
    const exercises = require("../src/db/exercises") as typeof import("../src/db/exercises");

    const all = await exercises.listExercises();
    const squat = all.find((e) => e.enName === "Squat");
    expect(squat).toBeTruthy();
    if (!squat) throw new Error("Seeded exercise 'Squat' not found");

    const performedAt = new Date("2025-01-01T10:00:00.000Z");

    const id = await completed.createCompletedSession({
      questId: null,
      userLevel: "medium",
      durationSeconds: 120,
      xpEarned: 42,
      notes: "Nice session",
      performedAt,
      exercises: [
        {
          exerciseId: squat.id,
          sortOrder: 0,
          result: { type: "reps", value: 15 },
          target: { type: "reps", value: 14 },
          notes: "Felt good",
        },
      ],
    });

    const sessions = await completed.listCompletedSessions(10);
    expect(sessions.some((s) => s.id === id)).toBe(true);

    const full = await completed.getCompletedSessionById(id);
    expect(full).toBeTruthy();
    if (!full) throw new Error("Completed session not found after creation");
    expect(full?.notes).toBe("Nice session");
    expect(full?.durationSeconds).toBe(120);
    expect(full?.xpEarned).toBe(42);
    expect(full?.performedAt.toISOString()).toBe(performedAt.toISOString());

    expect(full?.exercises.length).toBe(1);
    const ex = full.exercises[0];
    if (!ex) throw new Error("Expected one completed exercise");
    expect(ex.result).toEqual({ type: "reps", value: 15 });
    expect(ex.target).toEqual({ type: "reps", value: 14 });
    expect(ex.exercise.enName).toBe("Squat");
  });

  test("getCompletedSessionById returns null for missing", async () => {
    const completed = require("../src/db/completed") as typeof import("../src/db/completed");
    expect(await completed.getCompletedSessionById(999999)).toBeNull();
  });
});
