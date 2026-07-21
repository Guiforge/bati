import { createTestDb } from "./helpers/testDb";

describe("db/oaths", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
  });

  function oaths() {
    return require("../db/oaths") as typeof import("../db/oaths");
  }

  /** Insert a session with one exercise result. Returns the session id. */
  function logExercise(exerciseId: number, resultValue: number): number {
    const now = Date.now();
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(now);
    const sessionId = Number(info.lastInsertRowid);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', ?, ?)`,
      )
      .run(sessionId, exerciseId, resultValue, now);
    return sessionId;
  }

  test("no oath sworn yields no progress", async () => {
    const o = oaths();
    expect(await o.getOath()).toBeNull();
    expect(await o.getOathProgress()).toBeNull();
    expect(await o.checkOathFulfilled()).toBeNull();
  });

  test("exercise_pr tracks the best single result, not the sum", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_pr", target: 10, exerciseId: 1 });

    logExercise(1, 4);
    logExercise(1, 7);

    const progress = await o.getOathProgress();
    expect(progress?.current).toBe(7);
    expect(progress?.progress).toBe(70);
    expect(progress?.isFulfilled).toBe(false);
  });

  test("exercise_volume sums every result for that exercise only", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_volume", target: 100, exerciseId: 1 });

    logExercise(1, 30);
    logExercise(1, 20);
    logExercise(2, 500); // different exercise, must not count

    const progress = await o.getOathProgress();
    expect(progress?.current).toBe(50);
  });

  test("fulfilment fires exactly once", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_pr", target: 10, exerciseId: 1 });

    logExercise(1, 8);
    expect(await o.checkOathFulfilled()).toBeNull();

    logExercise(1, 10);
    const fulfilled = await o.checkOathFulfilled();
    expect(fulfilled).not.toBeNull();
    expect(fulfilled?.oath.fulfilledAt).toBeTruthy();
    expect(fulfilled?.isFulfilled).toBe(true);

    // Second check on the same fulfilled oath must stay silent.
    expect(await o.checkOathFulfilled()).toBeNull();
  });

  test("progress is clamped once the target is passed", async () => {
    const o = oaths();
    await o.swearOath({ metric: "sessions", target: 2 });

    logExercise(1, 5);
    logExercise(1, 5);
    logExercise(1, 5);

    const progress = await o.getOathProgress();
    expect(progress?.current).toBe(3);
    expect(progress?.progress).toBe(100);
    expect(progress?.isFulfilled).toBe(true);
  });

  test("swearing again replaces the previous oath", async () => {
    const o = oaths();
    await o.swearOath({ metric: "sessions", target: 5 });
    await o.swearOath({ metric: "streak", target: 30 });

    const oath = await o.getOath();
    expect(oath?.metric).toBe("streak");
    expect(oath?.target).toBe(30);
  });

  test("rejects an exercise metric with no exercise, and a non-positive target", async () => {
    const o = oaths();
    await expect(o.swearOath({ metric: "exercise_pr", target: 10 })).rejects.toThrow();
    await expect(o.swearOath({ metric: "sessions", target: 0 })).rejects.toThrow();
  });

  test("breakOath clears it", async () => {
    const o = oaths();
    await o.swearOath({ metric: "sessions", target: 5 });
    await o.breakOath();
    expect(await o.getOath()).toBeNull();
  });

  test("corrupted stored value is treated as no oath", async () => {
    const o = oaths();
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    await prefs.setPreference("oath", "{not json");
    expect(await o.getOath()).toBeNull();
  });
});
