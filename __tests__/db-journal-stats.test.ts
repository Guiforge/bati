import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The stats tab's totals, ported from `buildJournalStats` when they moved into SQL.
 *
 * The scenario is the one the JS reducer was written around: a hero who trains 20 minutes three
 * times a week and walks an hour on Sunday. Averaged together that is 77 min, which the tab used
 * to call their usual workout. The new case at the bottom is the one the reducer could never
 * pass, because it only ever saw the last 100 rows.
 */

const monday = new Date(2026, 7, 17, 18, 0);
const tuesday = new Date(2026, 7, 18, 18, 0);
const wednesday = new Date(2026, 7, 19, 18, 0);
const sunday = new Date(2026, 7, 23, 10, 0);
const today = new Date(2026, 7, 23, 20, 0);

/** France, where a week starts on Monday, the boundary these tests are written against. */
const WEEK_STARTS_MONDAY = 1;

const epoch = (d: Date) => Math.floor(d.getTime() / 1000);

describe("db/completed getJournalStats", () => {
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

  const stats = () => {
    const completed = require("../db/completed") as typeof import("../db/completed");
    return completed.getJournalStats(WEEK_STARTS_MONDAY, today);
  };

  const workout = (performedAt: Date, minutes: number, userLevel = "medium") => {
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, durationSeconds, performedAt) VALUES (?, ?, ?)",
      )
      .run(userLevel, minutes * 60, epoch(performedAt));
  };

  const outing = (
    performedAt: Date,
    minutes: number,
    leaguesM: number,
    movingMinutes = minutes,
  ) => {
    t.sqlite
      .prepare(
        `INSERT INTO completed_sessions
           (userLevel, durationSeconds, performedAt, outing, movingSeconds, leaguesM)
         VALUES ('medium', ?, ?, 'walk', ?, ?)`,
      )
      .run(minutes * 60, epoch(performedAt), movingMinutes * 60, leaguesM);
  };

  const week = () => {
    workout(monday, 20);
    workout(tuesday, 20);
    workout(wednesday, 20);
    outing(sunday, 65, 5200);
  };

  it("averages workouts alone, so a walk cannot inflate the training duration", async () => {
    week();
    const s = await stats();

    expect(s.totalWorkouts).toBe(3);
    expect(s.totalMinutes).toBe(60);
    expect(s.avgMinutes).toBe(20);
  });

  it("counts the outings apart, with their own ground and average", async () => {
    week();
    outing(monday, 45, 3800);

    expect((await stats()).outings).toEqual({ count: 2, leaguesM: 9000, avgMinutes: 55 });
  });

  /**
   * `outing` on the row, not `leaguesM`. The two disagree exactly where it matters, and a walk
   * whose service never started is the case that proves it: no ground, still a walk.
   */
  it("a walk with no ground is still a walk", async () => {
    workout(monday, 20);
    outing(sunday, 65, 0, 60);
    const s = await stats();

    expect(s.totalWorkouts).toBe(1);
    expect(s.avgMinutes).toBe(20);
    expect(s.outings).toEqual({ count: 1, leaguesM: 0, avgMinutes: 60 });
  });

  it("has no outings block at all until the hero goes out", async () => {
    workout(monday, 20);

    expect((await stats()).outings).toBeNull();
  });

  /** Moving minutes, which is what an outing's trace can prove and what its XP was paid on. */
  it("times an outing by what moved, not by how long the hero was out", async () => {
    outing(sunday, 90, 4000, 45);

    expect((await stats()).outings?.avgMinutes).toBe(45);
  });

  it("splits difficulty over workouts alone", async () => {
    week();

    expect((await stats()).levels).toEqual({ easy: 0, medium: 3, hard: 0 });
  });

  it("still counts a walk as recent activity, which is what that block asks", async () => {
    week();
    const s = await stats();

    expect(s.thisWeekCount).toBe(4);
    expect(s.thisWeekMinutes).toBe(125);
    expect(s.thisMonthCount).toBe(4);
  });

  it("says nothing rather than zero-averaging an empty journal", async () => {
    const s = await stats();

    expect(s).toEqual({
      totalWorkouts: 0,
      totalMinutes: 0,
      avgMinutes: 0,
      levels: { easy: 0, medium: 0, hard: 0 },
      thisWeekCount: 0,
      thisWeekMinutes: 0,
      thisMonthCount: 0,
      outings: null,
    });
  });

  /**
   * The bug itself. `listCompletedSessions(100)` fed every tile on this tab, so a hero past 100
   * sessions read their window as their history: "100 Total Workouts" and a difficulty split
   * summing to exactly 100, three years into the app.
   */
  it("counts the whole table, not the page the list shows", async () => {
    for (let i = 0; i < 137; i++) {
      const at = new Date(monday);
      at.setDate(monday.getDate() - i);
      workout(at, 20, i % 2 === 0 ? "easy" : "hard");
    }
    const s = await stats();

    expect(s.totalWorkouts).toBe(137);
    expect(s.totalMinutes).toBe(137 * 20);
    expect(s.levels.easy + s.levels.medium + s.levels.hard).toBe(137);
  });
});
