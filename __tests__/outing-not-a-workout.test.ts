import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * What "session" means, once a row can say it was a walk.
 *
 * The complaint, from a tester in September 2026: a six-hour hike put his average training
 * duration at 77 minutes. It also took the longest-session record for good, unlocked "Iron Will ·
 * Complete a 60+ minute workout", and read to the rest suggestion as a hard day. Every one of
 * those numbers was true about the journal and false about the thing it was labelled.
 *
 * Two definitions now, and this file is about the seam between them. `isWorkout` is training.
 * `countsAsSession` is showing up, which a walk of ten minutes is.
 */
describe("a walk is not a workout, and is still a session", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  const at = (daysAgo: number): number => Math.floor(Date.now() / 1000) - daysAgo * 86400;

  /** One row, said the way `createCompletedSession` says it. */
  function log(row: {
    id: number;
    daysAgo?: number;
    durationSeconds: number;
    xpEarned?: number;
    outing?: "walk" | "run" | "ride" | null;
    movingSeconds?: number | null;
  }): void {
    t.sqlite
      .prepare(
        `INSERT INTO completed_sessions
           (id, userLevel, durationSeconds, xpEarned, performedAt, outing, movingSeconds)
         VALUES (?, 'medium', ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.durationSeconds,
        row.xpEarned ?? 100,
        at(row.daysAgo ?? 0),
        row.outing ?? null,
        row.movingSeconds ?? null,
      );
  }

  /** Twenty-five minutes of training, and a six-hour hike. The shape of the complaint. */
  function theTestersJournal(): void {
    log({ id: 1, daysAgo: 1, durationSeconds: 1500, xpEarned: 120 });
    log({ id: 2, durationSeconds: 21_600, xpEarned: 750, outing: "walk", movingSeconds: 19_800 });
  }

  test("the hike does not take the workout records", async () => {
    const { getLongestSession, getMostXpSession, getPersonalRecordsSummary } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    theTestersJournal();

    expect((await getLongestSession())?.value).toBe(1500);
    expect((await getMostXpSession())?.value).toBe(120);
    expect((await getPersonalRecordsSummary()).totalSessions).toBe(1);
  });

  test("a hero who only walks still has a records card to look at", async () => {
    const { getPersonalRecordsSummary } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    log({ id: 1, durationSeconds: 3600, outing: "walk", movingSeconds: 3400 });
    t.sqlite.exec("UPDATE completed_sessions SET leaguesM = 4500 WHERE id = 1");

    const summary = await getPersonalRecordsSummary();
    expect(summary.totalSessions).toBe(0);
    // The card's guard reads this, not the count: zero workouts and a walk is something to show.
    expect(summary.longestOuting?.value).toBe(4500);
  });

  test("the calendar, the trends and the recent history are all about training", async () => {
    const { listWorkoutDayKeys, getWeeklyTrends, getRecentSessionHistory, getSessionAggregates } =
      require("../db/completed") as typeof import("../db/completed");
    theTestersJournal();

    expect((await listWorkoutDayKeys()).size).toBe(1);
    expect((await getRecentSessionHistory()).length).toBe(1);
    expect((await getSessionAggregates()).totalSessions).toBe(1);
    const thisWeek = (await getWeeklyTrends(1))[0];
    expect(thisWeek?.sessionCount).toBe(1);
  });

  test("a daily walk does not read as overtraining", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    for (let d = 0; d < 7; d++) {
      log({ id: 10 + d, daysAgo: d, durationSeconds: 2400, outing: "walk", movingSeconds: 2400 });
    }

    const suggestion = await getRestSuggestion();
    expect(suggestion.daysInARow).toBe(0);
    expect(suggestion.shouldRest).toBe(false);
  });

  test("the flame counts a walk of ten minutes, and not one of five", async () => {
    // `getWeeklyProgress` rather than the streak itself: the streak also weighs the hero's
    // weekly quota, and what is under test here is only which rows reach it.
    const { getWeeklyProgress } = require("../db/streaks") as typeof import("../db/streaks");

    log({ id: 1, durationSeconds: 300, outing: "walk", movingSeconds: 300 });
    log({ id: 2, durationSeconds: 900, outing: "walk", movingSeconds: 700 });
    log({ id: 3, durationSeconds: 1500 });

    // The five-minute walk is logged and paid; it is not an appearance. Ten minutes is.
    expect((await getWeeklyProgress()).done).toBe(2);
  });

  /**
   * The two oath metrics have to mean the same thing: both presets sit on one swear screen, and
   * a hero who walks daily must not watch one tick while the other stands still.
   *
   * `weekly_sessions` is also where an unparenthesised predicate would have shown: drizzle's
   * `and()` does not bracket its operands and SQLite binds `AND` tighter than `OR`, so
   * `performedAt >= sworn AND outing IS NULL OR moving >= 600` reads as
   * `(performedAt >= sworn AND outing IS NULL) OR moving >= 600` — every walk ever logged,
   * including the ones from before the oath was sworn.
   */
  test("both oath metrics agree about what a session is, and neither reaches behind the oath", async () => {
    const { getOathProgress, swearOath } = require("../db/oaths") as typeof import("../db/oaths");

    // A long walk a fortnight before the oath. It must count for neither metric.
    log({ id: 1, daysAgo: 14, durationSeconds: 3600, outing: "walk", movingSeconds: 3600 });

    await swearOath({ metric: "sessions", target: 10, exerciseId: null });
    expect((await getOathProgress())?.current).toBe(1);

    log({ id: 2, durationSeconds: 1800, outing: "walk", movingSeconds: 1500 });
    expect((await getOathProgress())?.current).toBe(2);

    t.sqlite.exec("DELETE FROM completed_sessions");
    log({ id: 3, daysAgo: 14, durationSeconds: 3600, outing: "walk", movingSeconds: 3600 });
    log({ id: 4, durationSeconds: 1800, outing: "walk", movingSeconds: 1500 });

    await swearOath({ metric: "weekly_sessions", target: 8, weeklyTarget: 1, exerciseId: null });
    // One qualifying week, not two: the fortnight-old walk is behind the oath.
    expect((await getOathProgress())?.current).toBe(1);
  });
});
