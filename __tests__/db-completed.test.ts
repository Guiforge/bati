import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/completed", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("createCompletedSession requires exercises", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");

    await expect(
      completed.createCompletedSession({
        exercises: [],
      }),
    ).rejects.toThrow("must have exercises");
  });

  test("create/list/get completed session", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");
    const exercises = require("../db/exercises") as typeof import("../db/exercises");

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

  /**
   * The reducer decides both numbers once, at save. The recap used to re-derive the clock from
   * `gps_points`, which is a second answer that goes wrong exactly when a flush failed and took
   * half a minute of fixes with it.
   */
  test("an outing's moving seconds are written beside its ground", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const squat = (await exercises.listExercises()).find((e) => e.enName === "Squat");
    if (!squat) throw new Error("Seeded exercise 'Squat' not found");

    const id = await completed.createCompletedSession({
      userLevel: "medium",
      uuid: "0192-walk-row",
      leaguesM: 4580,
      movingSeconds: 2_700,
      durationSeconds: 3_000,
      xpEarned: 10,
      exercises: [{ exerciseId: squat.id, sortOrder: 0, result: { type: "time", value: 3000 } }],
    });

    const row = t.sqlite
      .prepare("SELECT leaguesM, movingSeconds FROM completed_sessions WHERE id = ?")
      .get(id) as { leaguesM: number | null; movingSeconds: number | null };
    expect(row.leaguesM).toBe(4580);
    expect(row.movingSeconds).toBe(2_700);
  });

  test("a workout writes neither, rather than a zero that means nothing", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const squat = (await exercises.listExercises()).find((e) => e.enName === "Squat");
    if (!squat) throw new Error("Seeded exercise 'Squat' not found");

    const id = await completed.createCompletedSession({
      userLevel: "medium",
      xpEarned: 10,
      exercises: [{ exerciseId: squat.id, sortOrder: 0, result: { type: "reps", value: 10 } }],
    });

    const row = t.sqlite
      .prepare("SELECT leaguesM, movingSeconds FROM completed_sessions WHERE id = ?")
      .get(id) as { leaguesM: number | null; movingSeconds: number | null };
    expect(row.leaguesM).toBeNull();
    expect(row.movingSeconds).toBeNull();
  });

  test("getCompletedSessionById returns null for missing", async () => {
    const completed = require("../db/completed") as typeof import("../db/completed");
    expect(await completed.getCompletedSessionById(999999)).toBeNull();
  });

  test("the list carries the ground an outing covered, and null for a workout", async () => {
    const { listCompletedSessions } =
      require("../db/completed") as typeof import("../db/completed");
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    const now = Math.floor(Date.now() / 1000);
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, leaguesM) VALUES ('medium', 10, ?, ?)",
      )
      .run(now, 4580);
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(now - 60);

    const rows = await listCompletedSessions();
    expect(new Set(rows.map((r) => r.leaguesM))).toEqual(new Set([4580, null]));
  });
});
