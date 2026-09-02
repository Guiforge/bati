import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/oaths", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
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

  /**
   * Log a session `daysAgo` days back, for the week-counting metric.
   * `performedAt` is declared `mode: "timestamp"`, i.e. seconds — writing raw milliseconds here
   * would put every session tens of thousands of years in the future and quietly break the maths.
   */
  function logSessionAt(daysAgo: number): void {
    const at = Math.floor((Date.now() - daysAgo * 24 * 60 * 60 * 1000) / 1000);
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(at);
  }

  /** Insert a session with one exercise result. Returns the session id. */
  function logExercise(
    exerciseId: number,
    resultValue: number,
    resultType: "reps" | "time" = "reps",
  ): number {
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
         VALUES (?, ?, 0, 0, ?, ?, ?)`,
      )
      .run(sessionId, exerciseId, resultType, resultValue, now);
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

  // BUG-009, the half of it that is a summation: seconds have to become rep-equivalents before
  // they join reps in a total, or "1000 push-ups" could be finished by planking.
  test("exercise_volume converts holds to rep-equivalents before summing", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_volume", target: 100, exerciseId: 1 });

    logExercise(1, 30); // reps
    logExercise(1, 60, "time"); // 60 s -> 20

    expect((await o.getOathProgress())?.current).toBe(50);
  });

  // BUG-009, the half that is NOT a summation. A PR target is written in the exercise's own
  // unit — `lsit_30` means a 30-second hold — so converting here would report 10 of 30 for an
  // oath already met. The fix is only to stop letting a stray set logged in the other unit
  // outrank every honest attempt.
  test("exercise_pr keeps the exercise's own unit rather than converting", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_pr", target: 30, exerciseId: 1 });

    logExercise(1, 25, "time");
    logExercise(1, 30, "time");

    const progress = await o.getOathProgress();
    expect(progress?.current).toBe(30); // the hold itself, not 30/3
    expect(progress?.isFulfilled).toBe(true);
  });

  test("exercise_pr ignores a set logged in the minority unit", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_pr", target: 30, exerciseId: 1 });

    // Three honest holds and one stray rep-logged set that would otherwise be the "record".
    logExercise(1, 20, "time");
    logExercise(1, 22, "time");
    logExercise(1, 25, "time");
    logExercise(1, 99, "reps");

    expect((await o.getOathProgress())?.current).toBe(25);
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

  // Regression: crediting the oath's XP bonus used to happen after fulfilledAt was already
  // persisted, and a fulfilled oath is a no-op on every later call — a crash between the two
  // writes lost the bonus forever. onFulfilled now runs in the same transaction, so a failed
  // credit must leave the oath un-fulfilled and retryable.
  test("a failed bonus credit must not mark the oath fulfilled", async () => {
    const o = oaths();
    await o.swearOath({ metric: "exercise_pr", target: 10, exerciseId: 1 });
    logExercise(1, 10);

    await expect(
      // biome-ignore lint/suspicious/useAwait: matches checkOathFulfilled's onFulfilled: () => Promise<void>
      o.checkOathFulfilled(async () => {
        throw new Error("simulated crash while crediting the bonus");
      }),
    ).rejects.toThrow("simulated crash while crediting the bonus");

    expect(await o.getOath()).toMatchObject({ fulfilledAt: null });

    let credited = false;
    // biome-ignore lint/suspicious/useAwait: matches checkOathFulfilled's onFulfilled: () => Promise<void>
    const fulfilled = await o.checkOathFulfilled(async () => {
      credited = true;
    });
    expect(credited).toBe(true);
    expect(fulfilled?.isFulfilled).toBe(true);
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

  test("every preset is a unique, valid, swearable oath", async () => {
    const o = oaths();

    const ids = o.OATH_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const p of o.OATH_PRESETS) {
      expect(p.target).toBeGreaterThan(0);
      expect([
        "exercise_pr",
        "exercise_volume",
        "sessions",
        "streak",
        "weekly_sessions",
        "leagues",
      ]).toContain(p.metric);
      // The weekly metric is the one that needs a quota; the others must not carry one.
      expect(p.weeklyTarget !== undefined).toBe(o.oathNeedsWeeklyTarget(p.metric));
      // Exercise metrics must name a seed exercise so the screen can resolve an id.
      if (o.oathNeedsExercise(p.metric)) {
        expect(typeof p.exerciseName).toBe("string");
      }
      // The preset's shape must swear without throwing (exercise id stubbed here).
      await o.swearOath({
        metric: p.metric,
        target: p.target,
        exerciseId: o.oathNeedsExercise(p.metric) ? 1 : null,
      });
      const oath = await o.getOath();
      expect(oath?.metric).toBe(p.metric);
      expect(oath?.target).toBe(p.target);
    }
  });

  test("an oath bonus added to the tip-over session lands in total XP", async () => {
    const o = oaths();
    const completed = require("../db/completed") as typeof import("../db/completed");
    const userLevel = require("../db/userLevel") as typeof import("../db/userLevel");

    await o.swearOath({ metric: "sessions", target: 1 });
    const sessionId = logExercise(1, 5); // one session, xpEarned 10 (from the helper)

    expect(await o.checkOathFulfilled()).not.toBeNull();

    const before = await userLevel.getTotalXp();
    await completed.addBonusXpToSession(sessionId, o.OATH_XP_BONUS);
    const after = await userLevel.getTotalXp();

    expect(after - before).toBe(o.OATH_XP_BONUS);
  });

  test("corrupted stored value is treated as no oath", async () => {
    const o = oaths();
    const prefs = require("../db/preferences") as typeof import("../db/preferences");
    await prefs.setPreference("oath", "{not json");
    expect(await o.getOath()).toBeNull();
  });

  // BUG-016. Valid JSON with a key missing is not "corrupted" — it parses, it validates, and
  // it used to poison everything downstream. These are the blobs an older build could leave.
  describe("a structurally valid but incomplete blob", () => {
    async function store(blob: Record<string, unknown>) {
      const prefs = require("../db/preferences") as typeof import("../db/preferences");
      await prefs.setPreference("oath", JSON.stringify(blob));
    }

    // `undefined !== null` is true, so checkOathFulfilled saw an oath already fulfilled and
    // returned early forever: the oath could reach its target and never fire.
    test("a missing fulfilledAt does not make the oath permanently unfulfillable", async () => {
      const o = oaths();
      await store({ metric: "exercise_pr", exerciseId: 1, target: 10, swornAt: "2026-01-01" });

      expect((await o.getOath())?.fulfilledAt).toBeNull();

      logExercise(1, 12);
      expect(await o.checkOathFulfilled()).not.toBeNull();
    });

    test("a missing exerciseId reads back as null", async () => {
      const o = oaths();
      await store({ metric: "exercise_pr", target: 10, swornAt: "2026-01-01" });

      expect((await o.getOath())?.exerciseId).toBeNull();
      expect((await o.getOathProgress())?.current).toBe(0);
    });

    // The switch in measure() has no default; an unknown metric returned undefined and every
    // number derived from it became NaN.
    test("an unknown metric is rejected outright", async () => {
      const o = oaths();
      await store({ metric: "reps", target: 10, swornAt: "2026-01-01" });

      expect(await o.getOath()).toBeNull();
      expect(await o.getOathProgress()).toBeNull();
    });
  });

  test("leagues count the ground written on sessions, in whole leagues", async () => {
    const { swearOath, getOathProgress } = oaths();
    const now = Math.floor(Date.now() / 1000);
    const insert = t.sqlite.prepare(
      "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, leaguesM) VALUES ('medium', 10, ?, ?)",
    );
    insert.run(now - 120, 2500);
    insert.run(now - 60, 3000);
    logSessionAt(1); // a workout, no ground

    await swearOath({ metric: "leagues", target: 50, exerciseId: null });
    const progress = await getOathProgress();
    expect(progress?.current).toBe(5);
    expect(progress?.isFulfilled).toBe(false);
  });

  describe("weekly_sessions", () => {
    /** Swear the oath as if it had been made `daysAgo` days ago. */
    async function swearWeeksAgo(target: number, weeklyTarget: number, daysAgo: number) {
      const o = oaths();
      await o.swearOath({ metric: "weekly_sessions", target, weeklyTarget });

      const raw = t.sqlite
        .prepare("SELECT value FROM user_preferences WHERE key = 'oath'")
        .get() as { value: string };
      const stored = JSON.parse(raw.value);
      stored.swornAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      t.sqlite
        .prepare("UPDATE user_preferences SET value = ? WHERE key = 'oath'")
        .run(JSON.stringify(stored));
    }

    test("a week only counts once it hits the quota", async () => {
      await swearWeeksAgo(8, 3, 21);

      // Week 0: three sessions -> counts. Week 1: two -> does not.
      logSessionAt(20);
      logSessionAt(19);
      logSessionAt(18);
      logSessionAt(13);
      logSessionAt(12);

      expect((await oaths().getOathProgress())?.current).toBe(1);
    });

    test("a missed week costs one week and nothing else", async () => {
      await swearWeeksAgo(8, 2, 28);

      // Weeks 0, 1 and 3 qualify; week 2 is skipped entirely.
      for (const day of [27, 26, 20, 19, 6, 5]) logSessionAt(day);

      const progress = await oaths().getOathProgress();
      // Three good weeks survive the gap: nothing resets, the miss is just not counted.
      expect(progress?.current).toBe(3);
      expect(progress?.isFulfilled).toBe(false);
    });

    test("it fulfils once enough weeks have qualified", async () => {
      await swearWeeksAgo(2, 2, 14);

      for (const day of [13, 12, 6, 5]) logSessionAt(day);

      const fulfilled = await oaths().checkOathFulfilled();
      expect(fulfilled?.isFulfilled).toBe(true);
      expect(fulfilled?.current).toBe(2);
    });

    test("the weekly quota defaults rather than dividing by zero", async () => {
      const o = oaths();
      const oath = await o.swearOath({ metric: "weekly_sessions", target: 4 });
      expect(oath.weeklyTarget).toBe(o.DEFAULT_WEEKLY_TARGET);
    });
  });
});
