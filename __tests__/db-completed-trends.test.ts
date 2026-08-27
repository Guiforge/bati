import { startOfWeek, subDays, subMonths, subWeeks } from "date-fns";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The Stats tab is built entirely out of these aggregates. They were the untested half of
 * db/completed: history ordering, week/month bucketing, and the up/down arrows.
 */

describe("db/completed — history and trends", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const completed = () => require("../db/completed") as typeof import("../db/completed");

  /** Aggregates read the whole journal, so each case starts from an empty one. */
  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions;");
  });

  /** Bank one session on a given date. Exercises are seeded by the migrations. */
  async function bankSession(opts: {
    performedAt: Date;
    questId?: number | null;
    durationSeconds?: number;
    xpEarned?: number;
  }) {
    const exercises = require("../db/exercises") as typeof import("../db/exercises");
    const first = (await exercises.listExercises())[0];
    if (!first) throw new Error("No seeded exercises");

    return completed().createCompletedSession({
      questId: opts.questId ?? null,
      userLevel: "medium",
      durationSeconds: opts.durationSeconds ?? 600,
      xpEarned: opts.xpEarned ?? 50,
      performedAt: opts.performedAt,
      exercises: [{ exerciseId: first.id, sortOrder: 0, result: { type: "reps", value: 10 } }],
    });
  }

  describe("analyzeTrend", () => {
    // Pure, and it decides which arrow the user sees — every branch is worth pinning.
    it.each([
      ["up", 12, 10, 20],
      ["down", 8, 10, -20],
      ["stable", 102, 100, 2],
    ])("calls %s when moving from the previous period", (trend, current, previous, change) => {
      const result = completed().analyzeTrend(current as number, previous as number);
      expect(result.trend).toBe(trend);
      expect(result.change).toBe(change);
      expect(result.currentPeriod).toBe(current);
      expect(result.previousPeriod).toBe(previous);
    });

    // A 5% wobble is noise, not a trend.
    it("treats a small move either way as stable", () => {
      expect(completed().analyzeTrend(105, 100).trend).toBe("stable");
      expect(completed().analyzeTrend(95, 100).trend).toBe("stable");
    });

    // Dividing by a zero previous period would be NaN — the first week must not read as broken.
    it("calls a start from nothing a 100% climb", () => {
      expect(completed().analyzeTrend(3, 0)).toMatchObject({ change: 100, trend: "up" });
    });

    it("calls nothing-to-nothing stable, not a climb", () => {
      expect(completed().analyzeTrend(0, 0)).toMatchObject({ change: 0, trend: "stable" });
    });
  });

  describe("session history", () => {
    it("returns recent sessions oldest-first, so charts read left to right", async () => {
      const now = new Date();
      await bankSession({ performedAt: subDays(now, 3) });
      await bankSession({ performedAt: subDays(now, 1) });
      await bankSession({ performedAt: subDays(now, 2) });

      const history = await completed().getRecentSessionHistory(10);

      expect(history.length).toBe(3);
      const times = history.map((h) => h.performedAt.getTime());
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    });

    // The limit must bite the *old* end. Asserting only the count passed while the query
    // returned the oldest two — which is what froze the chart and the difficulty suggestion
    // on the first ten sessions a hero ever banked.
    it("drops the oldest sessions when the limit bites", async () => {
      const now = new Date();
      await bankSession({ performedAt: subDays(now, 3) });
      await bankSession({ performedAt: subDays(now, 2) });
      await bankSession({ performedAt: subDays(now, 1) });

      const history = await completed().getRecentSessionHistory(2);

      // Stored as a unix second, so the millis the test built with do not survive the round trip.
      const seconds = (d: Date) => Math.floor(d.getTime() / 1000);
      expect(history.map((h) => seconds(h.performedAt))).toEqual([
        seconds(subDays(now, 2)),
        seconds(subDays(now, 1)),
      ]);
    });

    it("keeps a quest's history to that quest", async () => {
      const now = new Date();
      // Only a valid id is needed here; the foreign key is what matters, not a hydrated quest.
      const target = t.sqlite.prepare("SELECT id FROM quests LIMIT 1").get() as
        | { id: number }
        | undefined;
      if (!target) throw new Error("No seeded quests");

      await bankSession({ performedAt: subDays(now, 5), questId: target.id });
      await bankSession({ performedAt: subDays(now, 4), questId: target.id });
      await bankSession({ performedAt: subDays(now, 3), questId: null });

      const history = await completed().getQuestSessionHistory(target.id, 30);

      expect(history.length).toBe(2);
      expect(history.every((h) => h.questId === target.id)).toBe(true);
    });

    it("drops a quest's oldest sessions when the limit bites", async () => {
      const now = new Date();
      const target = t.sqlite.prepare("SELECT id FROM quests LIMIT 1").get() as
        | { id: number }
        | undefined;
      if (!target) throw new Error("No seeded quests");

      await bankSession({ performedAt: subDays(now, 3), questId: target.id });
      await bankSession({ performedAt: subDays(now, 2), questId: target.id });
      await bankSession({ performedAt: subDays(now, 1), questId: target.id });

      const history = await completed().getQuestSessionHistory(target.id, 2);

      // Stored as a unix second, so the millis the test built with do not survive the round trip.
      const seconds = (d: Date) => Math.floor(d.getTime() / 1000);
      expect(history.map((h) => seconds(h.performedAt))).toEqual([
        seconds(subDays(now, 2)),
        seconds(subDays(now, 1)),
      ]);
    });

    it("returns nothing for a quest never played", async () => {
      expect(await completed().getQuestSessionHistory(999_999)).toEqual([]);
    });
  });

  describe("getWeeklyTrends", () => {
    it("sums sessions, minutes and xp across the window", async () => {
      const now = new Date();
      await bankSession({ performedAt: now, durationSeconds: 1800, xpEarned: 100 });
      await bankSession({ performedAt: subDays(now, 1), durationSeconds: 600, xpEarned: 20 });
      await bankSession({ performedAt: subWeeks(now, 3), durationSeconds: 900, xpEarned: 30 });

      const trends = await completed().getWeeklyTrends(12);

      // Sorted by week key, so the chart's x-axis is already in order.
      expect([...trends].sort((a, b) => a.weekKey.localeCompare(b.weekKey))).toEqual(trends);

      const total = trends.reduce(
        (acc, w) => ({
          sessions: acc.sessions + w.sessionCount,
          minutes: acc.minutes + w.totalMinutes,
          xp: acc.xp + w.totalXp,
        }),
        { sessions: 0, minutes: 0, xp: 0 },
      );
      expect(total).toEqual({ sessions: 3, minutes: 55, xp: 150 });
    });

    it("puts sessions from the same week in one bucket", async () => {
      const now = new Date();
      // Both instants are pinned inside the current week by construction, rather than by stepping
      // back a fixed hour from now. "Two sessions an hour apart cannot straddle a week boundary"
      // was the previous assumption and it is false for the first hour of every Monday, which is
      // when this test spent one hour a week failing. The midpoint between the week's start and
      // now is always in this week and never in the future, whatever time it is.
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const midweek = new Date((weekStart.getTime() + now.getTime()) / 2);

      await bankSession({ performedAt: now, durationSeconds: 600, xpEarned: 10 });
      await bankSession({ performedAt: midweek, durationSeconds: 600, xpEarned: 10 });

      const worked = (await completed().getWeeklyTrends(12)).filter((w) => w.sessionCount > 0);

      expect(worked.length).toBe(1);
      expect(worked[0]).toMatchObject({ sessionCount: 2, totalMinutes: 20, totalXp: 20 });
    });

    it("drops sessions older than the window", async () => {
      await bankSession({ performedAt: subWeeks(new Date(), 30) });

      const trends = await completed().getWeeklyTrends(4);

      expect(trends.every((w) => w.sessionCount === 0)).toBe(true);
    });

    // The window is the chart's x-axis: a week you skipped is a gap the hero should see, not a
    // row that quietly vanishes and shifts every later bar one notch to the left.
    it("returns the whole window, blank weeks included", async () => {
      expect(await completed().getWeeklyTrends(12)).toHaveLength(12);

      await bankSession({ performedAt: subWeeks(new Date(), 2) });

      const trends = await completed().getWeeklyTrends(12);
      expect(trends).toHaveLength(12);
      expect(trends.filter((w) => w.sessionCount > 0)).toHaveLength(1);
    });

    /**
     * Regression: the key was `yyyy-'W'ww`, the calendar year glued to the local week number.
     * Monday 2025-12-29 came out as "2025-W01" — sorting before "2025-W52" — so every January
     * the bars were served in the wrong order and the week-over-week read compared the wrong
     * pair. ISO week-numbering year fixes both.
     */
    it("keeps the keys in order across a new year", async () => {
      jest.useFakeTimers().setSystemTime(new Date("2026-01-08T12:00:00"));
      try {
        const trends = await completed().getWeeklyTrends(4);
        const keys = trends.map((w) => w.weekKey);

        expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
        // The window straddles the new year, so it must contain weeks from both sides.
        expect(keys.some((k) => k.startsWith("2025-"))).toBe(true);
        expect(keys.some((k) => k.startsWith("2026-"))).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("getMonthlyTrends", () => {
    it("buckets by calendar month", async () => {
      const now = new Date();
      await bankSession({ performedAt: now, durationSeconds: 1200, xpEarned: 40 });
      await bankSession({ performedAt: subMonths(now, 2), durationSeconds: 1200, xpEarned: 40 });

      const trends = await completed().getMonthlyTrends(6);
      const worked = trends.filter((m) => m.sessionCount > 0);

      expect(trends).toHaveLength(6);
      expect(worked).toHaveLength(2);
      expect(trends.map((m) => m.monthKey)).toEqual(
        [...trends.map((m) => m.monthKey)].sort((a, b) => a.localeCompare(b)),
      );
      expect(worked.every((m) => m.totalMinutes === 20 && m.totalXp === 40)).toBe(true);
    });

    it("drops sessions older than the window", async () => {
      await bankSession({ performedAt: subMonths(new Date(), 12) });

      const trends = await completed().getMonthlyTrends(3);

      expect(trends).toHaveLength(3);
      expect(trends.every((m) => m.sessionCount === 0)).toBe(true);
    });
  });

  describe("getTrendSummary", () => {
    // An empty journal must still produce a renderable summary, not a crash.
    it("stays renderable with no training at all", async () => {
      const summary = await completed().getTrendSummary();

      expect(summary.weeklyTrends.every((w) => w.sessionCount === 0)).toBe(true);
      expect(summary.monthlyTrends.every((m) => m.sessionCount === 0)).toBe(true);
      expect(summary.sessionsAnalysis).toMatchObject({ trend: "stable", change: 0 });
      expect(summary.minutesAnalysis.currentPeriod).toBe(0);
      expect(summary.xpAnalysis.previousPeriod).toBe(0);
    });

    it("carries the charts and the week-over-week read together", async () => {
      await bankSession({ performedAt: new Date(), durationSeconds: 1800, xpEarned: 100 });

      const summary = await completed().getTrendSummary();

      expect(summary.weeklyTrends).toHaveLength(8);
      expect(summary.monthlyTrends).toHaveLength(6);
      // One week of history and nothing before it: a climb from zero.
      expect(summary.sessionsAnalysis).toMatchObject({ currentPeriod: 1, trend: "up" });
      expect(summary.minutesAnalysis.currentPeriod).toBe(30);
      expect(summary.xpAnalysis.currentPeriod).toBe(100);
    });

    /**
     * Regression: only weeks holding a session came back, and the summary read the last two
     * rows as "this week" and "last week". A fortnight off therefore compared two month-old
     * weeks to each other and reported no change, while the hero had in fact stopped.
     */
    it("counts a week off as a week off, not as no change", async () => {
      await bankSession({ performedAt: subWeeks(new Date(), 2), durationSeconds: 1800 });

      const summary = await completed().getTrendSummary();

      expect(summary.sessionsAnalysis).toMatchObject({
        currentPeriod: 0,
        previousPeriod: 0,
        trend: "stable",
      });
      // The idle fortnight is on the chart rather than absent from it.
      expect(summary.weeklyTrends.at(-1)?.sessionCount).toBe(0);
      expect(summary.weeklyTrends.at(-2)?.sessionCount).toBe(0);
      expect(summary.weeklyTrends.at(-3)?.sessionCount).toBe(1);
    });
  });
});
