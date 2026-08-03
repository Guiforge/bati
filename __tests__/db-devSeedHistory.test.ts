import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The seed is hand-written SQL against CHECK constraints and a unique index, so the thing worth
 * testing is that it produces rows the real read paths can consume — not that it produces rows.
 */

describe("db/devSeedHistory", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const seed = () => require("../db/devSeedHistory") as typeof import("../db/devSeedHistory");

  function countSeededExercises(): number {
    const row = t.sqlite
      .prepare(
        `SELECT COUNT(*) AS c FROM completed_exercises ce
         JOIN completed_sessions s ON s.id = ce.sessionId
         WHERE s.notes = '__dev_history'`,
      )
      .get() as { c: number };
    return row.c;
  }

  it("seeds a year of sessions with matching exercises", async () => {
    const { seedHistory } = seed();
    const result = await seedHistory(1);

    expect(result.sessions).toBe(182);
    expect(result.exercises).toBe(countSeededExercises());
    expect(result.exercises).toBeGreaterThan(result.sessions);

    // Rows must land inside the requested window, not spill into the future or beyond a year.
    const bounds = t.sqlite
      .prepare(
        `SELECT MIN(performedAt) AS lo, MAX(performedAt) AS hi
         FROM completed_sessions WHERE notes = '__dev_history'`,
      )
      .get() as { lo: number; hi: number };
    const now = Math.floor(Date.now() / 1000);
    expect(bounds.hi).toBeLessThanOrEqual(now);
    expect(bounds.lo).toBeGreaterThan(now - 366 * 86400);
  });

  it("replaces the previous batch instead of appending", async () => {
    const { seedHistory } = seed();
    const again = await seedHistory(1);

    expect(again.sessions).toBe(182);
    expect(countSeededExercises()).toBe(again.exercises);
  });

  it("leaves real history alone and cascades on clear", async () => {
    const { clearSeededHistory, countSeededSessions } = seed();

    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, notes, performedAt) VALUES ('medium', 10, 'real', ?)",
      )
      .run(Math.floor(Date.now() / 1000));

    await clearSeededHistory();

    expect(await countSeededSessions()).toBe(0);
    expect(countSeededExercises()).toBe(0);
    // Nothing orphaned, and the untagged session survived.
    const left = t.sqlite.prepare("SELECT COUNT(*) AS c FROM completed_exercises").get() as {
      c: number;
    };
    expect(left.c).toBe(0);
    const real = t.sqlite.prepare("SELECT COUNT(*) AS c FROM completed_sessions").get() as {
      c: number;
    };
    expect(real.c).toBe(1);
  });

  it("produces history the real aggregates can read", async () => {
    const { seedHistory } = seed();
    await seedHistory(1);

    const completed = require("../db/completed") as typeof import("../db/completed");
    const weeks = await completed.getWeeklyTrends(8);
    expect(weeks.length).toBeGreaterThan(0);
    expect(weeks.some((w) => w.sessionCount > 0)).toBe(true);

    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    const info = await streaks.getStreakInfo();
    expect(info.current).toBeGreaterThan(0);
    expect(info.lastWorkoutDate).not.toBeNull();
  });
});
