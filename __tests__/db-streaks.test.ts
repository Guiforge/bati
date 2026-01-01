import * as schema from "../db/schema";
import { createTestDb } from "./helpers/testDb";

const { completedQuest, userPreferences } = schema;

describe("db/streaks", () => {
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

  beforeEach(async () => {
    // Clear completed sessions and streak cache
    t.db.delete(completedQuest).run();
    t.db.delete(userPreferences).run();
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

  test("getStreakInfo returns 0 for empty database", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    const result = await streaks.getStreakInfo();
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
    expect(result.isActive).toBe(false);
    expect(result.lastWorkoutDate).toBeNull();
  });

  test("calculates current streak of 1 for workout today", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(0); // Today

    const result = await streaks.calculateAndCacheStreak();
    expect(result.current).toBe(1);
    expect(result.isActive).toBe(true);
  });

  test("calculates current streak of 1 for workout yesterday", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(1); // Yesterday

    const result = await streaks.calculateAndCacheStreak();
    expect(result.current).toBe(1);
    expect(result.isActive).toBe(true);
  });

  test("streak is inactive if last workout was 2+ days ago", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(2); // 2 days ago

    const result = await streaks.calculateAndCacheStreak();
    expect(result.current).toBe(0);
    expect(result.isActive).toBe(false);
  });

  test("calculates consecutive day streak", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(0); // Today
    await addSessionOnDate(1); // Yesterday
    await addSessionOnDate(2); // 2 days ago

    const result = await streaks.calculateAndCacheStreak();
    expect(result.current).toBe(3);
    expect(result.isActive).toBe(true);
  });

  test("streak breaks on skipped day", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(0); // Today
    await addSessionOnDate(1); // Yesterday
    // Skip day 2
    await addSessionOnDate(3); // 3 days ago

    const result = await streaks.calculateAndCacheStreak();
    expect(result.current).toBe(2); // Only today and yesterday
    expect(result.isActive).toBe(true);
  });

  test("calculates best streak correctly", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    // A streak of 5 days ending 10 days ago
    await addSessionOnDate(10);
    await addSessionOnDate(11);
    await addSessionOnDate(12);
    await addSessionOnDate(13);
    await addSessionOnDate(14);

    // A streak of 2 days ending yesterday
    await addSessionOnDate(0);
    await addSessionOnDate(1);

    const result = await streaks.calculateAndCacheStreak();
    expect(result.current).toBe(2);
    expect(result.best).toBe(5);
  });

  test("caches streak in preferences", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(0);
    await addSessionOnDate(1);

    await streaks.calculateAndCacheStreak();

    // Check cache exists
    const cached = t.db.select().from(userPreferences).all();
    const keys = cached.map((p) => p.key);

    expect(keys).toContain("streak_current");
    expect(keys).toContain("streak_best");
    expect(keys).toContain("streak_last_date");
  });

  test("getStreakInfo uses cache when valid", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(0);
    await addSessionOnDate(1);

    // First call calculates and caches
    const first = await streaks.calculateAndCacheStreak();

    // Second call should use cache
    const second = await streaks.getStreakInfo();

    expect(second.current).toBe(first.current);
    expect(second.best).toBe(first.best);
  });

  test("updateStreakAfterSession recalculates streak", async () => {
    const streaks = require("../db/streaks") as typeof import("../db/streaks");
    await addSessionOnDate(0);
    const initial = await streaks.getStreakInfo();
    expect(initial.current).toBe(1);

    // Add another session (simulating a new workout)
    await addSessionOnDate(1);
    const updated = await streaks.updateStreakAfterSession();

    expect(updated.current).toBe(2);
  });
});
