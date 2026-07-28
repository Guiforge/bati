import * as schema from "../db/schema";
import { createTestDb } from "./helpers/testDb";

const { completedQuest } = schema;

describe("db/restSuggestions", () => {
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
    t.db.delete(completedQuest).run();
  });

  // Helper to add a session on a specific date
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

  test("returns shouldRest: false for empty database", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    const result = await getRestSuggestion();
    expect(result.shouldRest).toBe(false);
    expect(result.reason).toBe("none");
  });

  test("returns shouldRest: false for low activity", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    await addSessionOnDate(0); // Today
    await addSessionOnDate(2); // 2 days ago

    const result = await getRestSuggestion();
    expect(result.shouldRest).toBe(false);
  });

  test("suggests rest after 5 consecutive training days", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    // 5 consecutive days ending today
    await addSessionOnDate(0);
    await addSessionOnDate(1);
    await addSessionOnDate(2);
    await addSessionOnDate(3);
    await addSessionOnDate(4);

    const result = await getRestSuggestion();
    expect(result.shouldRest).toBe(true);
    expect(result.reason).toBe("consecutive_days");
    expect(result.daysInARow).toBe(5);
  });

  test("suggests rest for high volume (6+ sessions)", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    // 6 sessions scattered in last 7 days
    await addSessionOnDate(0);
    await addSessionOnDate(0); // Multiple same day
    await addSessionOnDate(1);
    await addSessionOnDate(2);
    await addSessionOnDate(4);
    await addSessionOnDate(6);

    const result = await getRestSuggestion();
    expect(result.shouldRest).toBe(true);
    expect(result.recentSessionCount).toBe(6);
  });

  test("suggests rest for very high volume (10+ sessions)", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    // 10 sessions in last 7 days
    for (let i = 0; i < 10; i++) {
      await addSessionOnDate(i % 7);
    }

    const result = await getRestSuggestion();
    expect(result.shouldRest).toBe(true);
    expect(result.reason).toBe("high_volume");
  });

  test("getQuickRestCheck returns correct values", async () => {
    const { getQuickRestCheck } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");

    await addSessionOnDate(0); // Today
    await addSessionOnDate(2); // 2 days ago

    const result = await getQuickRestCheck();
    expect(result.workedOutToday).toBe(true);
    expect(result.workedOutYesterday).toBe(false);
    expect(result.weeklySessionCount).toBe(2);
  });

  test("does not suggest rest for old consecutive days", async () => {
    const { getRestSuggestion } =
      require("../db/restSuggestions") as typeof import("../db/restSuggestions");
    // 5 consecutive days but ending 3 days ago (not connected to today/yesterday)
    await addSessionOnDate(3);
    await addSessionOnDate(4);
    await addSessionOnDate(5);
    await addSessionOnDate(6);
    await addSessionOnDate(7);

    const result = await getRestSuggestion();
    // Only 4 sessions are in the 7-day window (days 3-6)
    // They are not consecutive from today/yesterday, so consecutive check fails
    expect(result.daysInARow).toBe(0);
  });

  describe("deload", () => {
    /** Four sessions in the week that ended `weeksAgo` weeks ago. */
    async function heavyWeek(weeksAgo: number): Promise<void> {
      const base = weeksAgo * 7;
      for (const offset of [1, 2, 4, 6]) await addSessionOnDate(base + offset);
    }

    test("four heavy weeks in a row earn an easier one", async () => {
      const { getRestSuggestion } =
        require("../db/restSuggestions") as typeof import("../db/restSuggestions");

      for (let week = 0; week < 4; week++) await heavyWeek(week);

      const result = await getRestSuggestion();
      expect(result.reason).toBe("deload");
      expect(result.shouldRest).toBe(true);
      expect(result.heavyWeeks).toBeGreaterThanOrEqual(4);
    });

    test("an easier week in the middle resets the count", async () => {
      const { getRestSuggestion } =
        require("../db/restSuggestions") as typeof import("../db/restSuggestions");

      await heavyWeek(0);
      await heavyWeek(1);
      // Week 2 was light — two sessions.
      await addSessionOnDate(2 * 7 + 1);
      await addSessionOnDate(2 * 7 + 3);
      await heavyWeek(3);

      expect((await getRestSuggestion()).reason).toBe("none");
    });

    test("the acute rules still win: a hard week is not a deload", async () => {
      const { getRestSuggestion } =
        require("../db/restSuggestions") as typeof import("../db/restSuggestions");

      // Six sessions in seven days, but a day off in the middle so the consecutive-days rule
      // stays quiet: the weekly-volume rule must still be the one that answers.
      for (const daysAgo of [0, 1, 2, 3, 5, 6]) await addSessionOnDate(daysAgo);

      expect((await getRestSuggestion()).reason).toBe("overtraining");
    });
  });
});
