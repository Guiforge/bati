import * as schema from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

const { completedQuest, userPreferences } = schema;

/**
 * The flame measures consistency, not attendance: a day stays lit while the trailing week holds
 * the hero's quota of sessions, and one blank week is forgiven. These tests are written against
 * that promise — rest days must cost nothing, and a single missed week must not wipe a flame.
 */
describe("db/streaks", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.db.delete(completedQuest).run();
    t.db.delete(userPreferences).run();
  });

  function streaks() {
    return require("../db/streaks") as typeof import("../db/streaks");
  }

  async function addSessionOnDate(daysAgo: number): Promise<void> {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(12, 0, 0, 0);

    await t.db.insert(completedQuest).values({
      questId: 1,
      performedAt: date,
      durationSeconds: 1800,
      userLevel: "medium",
      xpEarned: 100,
    });
  }

  /** Swear a weekly oath, which is what raises the flame's bar. */
  function swearWeekly(weeklyTarget: number): void {
    t.db
      .insert(userPreferences)
      .values({
        key: "oath",
        value: JSON.stringify({
          metric: "weekly_sessions",
          exerciseId: null,
          target: 8,
          weeklyTarget,
          swornAt: new Date().toISOString(),
          fulfilledAt: null,
        }),
      })
      .run();
  }

  test("no sessions, no flame", async () => {
    const result = await streaks().getStreakInfo();

    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
    expect(result.isActive).toBe(false);
    expect(result.lastWorkoutDate).toBeNull();
  });

  test("one session is not yet a habit — the default quota is two a week", async () => {
    await addSessionOnDate(0);

    const result = await streaks().calculateAndCacheStreak();
    expect(result.current).toBe(0);
    expect(result.isActive).toBe(false);
  });

  test("hitting the quota lights the flame, and it keeps burning through rest days", async () => {
    // Two sessions six days ago and five days ago: the quota was met, then nothing since.
    await addSessionOnDate(6);
    await addSessionOnDate(5);

    const result = await streaks().calculateAndCacheStreak();

    // Lit every day since the quota was met, including the five rest days that followed.
    expect(result.current).toBe(6);
    expect(result.isActive).toBe(true);
  });

  test("a rest day never breaks the flame", async () => {
    // Trained twice a week for three weeks, never on consecutive days.
    for (const daysAgo of [20, 17, 13, 10, 6, 3]) await addSessionOnDate(daysAgo);

    const result = await streaks().calculateAndCacheStreak();

    // Under the old consecutive-day rule this hero's flame was permanently 1.
    expect(result.current).toBeGreaterThanOrEqual(14);
    expect(result.isActive).toBe(true);
  });

  test("one blank week is forgiven, two are not", async () => {
    // Quota met 10 and 9 days ago, then nothing at all.
    await addSessionOnDate(10);
    await addSessionOnDate(9);

    const forgiven = await streaks().calculateAndCacheStreak();
    expect(forgiven.isActive).toBe(true);

    t.db.delete(completedQuest).run();
    t.db.delete(userPreferences).run();

    // Same shape, but the good week is now three weeks back: the grace has run out.
    await addSessionOnDate(24);
    await addSessionOnDate(23);

    const broken = await streaks().calculateAndCacheStreak();
    expect(broken.current).toBe(0);
    expect(broken.isActive).toBe(false);
    // The flame it once had is still on the record.
    expect(broken.best).toBeGreaterThan(0);
  });

  test("a weekly oath raises the bar the flame is measured against", async () => {
    // Two sessions this week: enough for the default, not for a hero who swore four.
    await addSessionOnDate(2);
    await addSessionOnDate(1);

    expect((await streaks().calculateAndCacheStreak()).isActive).toBe(true);

    swearWeekly(4);
    expect((await streaks().calculateAndCacheStreak()).isActive).toBe(false);

    await addSessionOnDate(3);
    await addSessionOnDate(4);
    expect((await streaks().calculateAndCacheStreak()).isActive).toBe(true);
  });

  test("best keeps the longest flame ever held", async () => {
    // A long consistent run that ended a while ago.
    for (const daysAgo of [40, 37, 34, 31, 28, 25]) await addSessionOnDate(daysAgo);
    // Then a short recent one.
    await addSessionOnDate(2);
    await addSessionOnDate(1);

    const result = await streaks().calculateAndCacheStreak();

    expect(result.best).toBeGreaterThan(result.current);
    expect(result.current).toBeGreaterThan(0);
  });

  test("the cache is scoped to the day and the quota that produced it", async () => {
    await addSessionOnDate(1);
    await addSessionOnDate(0);

    const fresh = await streaks().calculateAndCacheStreak();
    expect(await streaks().getCachedStreak()).toEqual(fresh);

    // Swearing an oath changes the bar, so yesterday's answer is no longer the right one.
    swearWeekly(4);
    expect(await streaks().getCachedStreak()).toBeNull();
  });

  test("finishing a session refreshes the cached flame", async () => {
    await addSessionOnDate(0);
    expect((await streaks().getStreakInfo()).isActive).toBe(false);

    await addSessionOnDate(1);
    const updated = await streaks().updateStreakAfterSession();

    expect(updated.isActive).toBe(true);
    expect((await streaks().getStreakInfo()).current).toBe(updated.current);
  });

  test("weekly progress counts the flame's own trailing window against the sworn quota", async () => {
    // Three sessions inside the trailing 7 days, one safely outside it.
    for (const daysAgo of [1, 3, 5, 9]) await addSessionOnDate(daysAgo);
    swearWeekly(4);

    expect(await streaks().getWeeklyProgress()).toEqual({ done: 3, quota: 4 });
  });
});
