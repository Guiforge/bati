import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { FLAME_DORMANT_DAYS, FLAME_PIVOT } from "../constants/flame";
import { DEFAULT_WEEKLY_QUOTA, WEEKLY_TARGETS } from "../constants/weeklyTargets";
import * as schema from "../db/schema";
import { GOLDEN_NOW } from "./helpers/goldenHero";
import { clientMock, createTestDb } from "./helpers/testDb";

const { completedQuest, userPreferences } = schema;

/**
 * The flame measures consistency, not attendance: a day stays lit while the trailing week holds
 * the hero's quota of sessions, and one blank week is forgiven. These tests are written against
 * that promise — rest days must cost nothing, and a single missed week must not wipe a flame.
 */
describe("db/streaks", () => {
  const t = createTestDb();

  // The pivot the database-level tests below run under, set by each one: none of them may depend
  // on where the real clock sits relative to the real pivot.
  let pivot = new Date(2100, 0, 1);

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
    // A live getter, so each test can move the pivot the module under test reads per call.
    jest.doMock("../constants/flame", () =>
      Object.defineProperty(
        { ...jest.requireActual("../constants/flame"), __esModule: true },
        "FLAME_PIVOT",
        { get: () => pivot, enumerable: true },
      ),
    );
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    pivot = new Date(2100, 0, 1);
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

  test("no weekly target the oath offers sits under the quota the crest measures its flame at", () => {
    // db/crest.ts reads the longest flame at DEFAULT_WEEKLY_QUOTA; a lower oath would say "flame 0".
    expect(Math.min(...WEEKLY_TARGETS)).toBeGreaterThanOrEqual(DEFAULT_WEEKLY_QUOTA);
  });

  test("the pivot is after the golden hero's frozen clock, so its figures cannot move", () => {
    expect(FLAME_PIVOT.getTime()).toBeGreaterThan(GOLDEN_NOW);
  });

  test("swearing 3 a week recounts a sleeping flame, and the crest's quota of 2 does not move", async () => {
    pivot = new Date(2000, 0, 1);
    await addSessionOnDate(40);
    await addSessionOnDate(39);
    expect((await streaks().calculateAndCacheStreak()).dormant).toBeGreaterThan(0);

    swearWeekly(3);
    const recounted = await streaks().calculateAndCacheStreak();
    // Two sessions a week never light a bar of three: the whole journal reads at it.
    expect(recounted).toMatchObject({ current: 0, dormant: 0, best: 0 });

    // The crest reads at the baseline, sleeping counts included, whatever the oath says.
    const dates = [40, 39].map((n) => new Date(Date.now() - n * 86_400_000));
    expect(
      streaks().calculateStreakFromSessions(dates, DEFAULT_WEEKLY_QUOTA, new Date(), pivot).best,
    ).toBeGreaterThan(0);
  });

  test("the sleeping count is cached with the flame, and a cache without it is a miss", async () => {
    pivot = new Date(2000, 0, 1);
    // Quota met 40 and 39 days ago, then nothing: asleep since, 26 days out.
    await addSessionOnDate(40);
    await addSessionOnDate(39);

    const fresh = await streaks().calculateAndCacheStreak();
    expect(fresh.current).toBe(0);
    expect(fresh.dormant).toBeGreaterThan(0);
    expect(await streaks().getCachedStreak()).toEqual(fresh);

    t.db.delete(userPreferences).where(sql`${userPreferences.key} = 'streak_dormant'`).run();
    expect(await streaks().getCachedStreak()).toBeNull();
  });
  test("the figure a hero reads can be checked: its first day, its last lit day", async () => {
    // Sessions twice a week for 40 days, then 10 days of nothing. The count is lit days, so it
    // runs past the last session (the flame holds up to two weeks): 41 days from the first
    // session to the last, and a count that is longer by the days it held.
    for (const daysAgo of [50, 47, 43, 40, 36, 33, 29, 26, 22, 19, 15, 12, 10]) {
      await addSessionOnDate(daysAgo);
    }
    const { detail, span } = await streaks().getFlameWithSpan();
    assert(span);
    const day = (n: number) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - n);
      return d.getTime();
    };
    // Lit from the day the second session met the quota, not from the first session.
    expect(span.from.getTime()).toBe(day(47));
    // Lit through today: the last session was 10 days ago and the week before it was over quota.
    expect(detail.current).toBeGreaterThan(0);
    expect(span.to.getTime()).toBe(day(0));
    // The count is exactly the days from `from` to `to`, inclusive, when no gap was bridged.
    expect(detail.current).toBe(
      Math.round((span.to.getTime() - span.from.getTime()) / 86400000) + 1,
    );
    // And it is longer than first session to last session, which is the audit's 1,093 vs 1,104.
    expect(detail.current).toBeGreaterThan(50 - 10 + 1);
  });

  // Up to the pivot, an unlit flame does not sleep: "0 days lit" read "lit since 2023" beside it.
  test("dates only a count on screen: lit or asleep", async () => {
    for (const daysAgo of [60, 57, 53, 50, 46, 43]) await addSessionOnDate(daysAgo);
    const { detail, span } = await streaks().getFlameWithSpan();
    expect(span !== null).toBe(detail.current > 0 || detail.dormant > 0);
  });

  test("nothing lit and nothing asleep has no dates", async () => {
    await addSessionOnDate(200);
    const { span } = await streaks().getFlameWithSpan();
    expect(span).toBeNull();
  });
});

/**
 * The flame sleeps instead of falling to zero. Every call below names its own `now` and pivot,
 * so no result depends on the real clock: `early` is a pivot before every journal here (gaps are
 * bridged), `late` one after all of them (nothing is, the old rule).
 */
describe("the dormant flame", () => {
  const t = createTestDb();
  const early = new Date(2025, 11, 1);
  const late = new Date(2100, 0, 1);

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  const day = (n: number) => new Date(2026, 0, 1 + n, 12);
  const streaks = () => require("../db/streaks") as typeof import("../db/streaks");
  const read = (sessions: number[], now: number, pivot: Date, quota = 2) =>
    streaks().describeFlame(sessions.map(day), quota, day(now), pivot);

  // These four sessions light the flame without a break from day 1 to day 19: 19 lit days, then out.
  const first = [0, 1, 6, 7];
  const k = 19;

  test("the first flame is what the other tests count against", () => {
    expect(read(first, 19, early)).toMatchObject({ current: k, dormant: 0 });
    expect(read(first, 25, early)).toMatchObject({ current: 0, dormant: k, best: k });
  });

  test("the quota again within a week carries the count on, the gap days not counted", () => {
    expect(read([...first, 40, 46], 46, early)).toMatchObject({ current: k + 1, dormant: 0 });
  });

  test("one session short of the quota leaves it asleep", () => {
    expect(read([...first, 40, 47], 47, early)).toMatchObject({ current: 0, dormant: k });
  });

  test("a session a week for ten weeks, under the quota, keeps the count", () => {
    const weekly = Array.from({ length: 10 }, (_, i) => 40 + 7 * i);
    expect(read([...first, ...weekly], 110, early)).toMatchObject({ current: 0, dormant: k });
  });

  test("56 days out with no session wipe it, and best does not move", () => {
    const last = k + FLAME_DORMANT_DAYS;
    expect(read(first, last - 1, early)).toMatchObject({ dormant: k });
    expect(read(first, last, early)).toMatchObject({ current: 0, dormant: 0, best: k });
    // And what relights it after that starts from one.
    expect(read([...first, last + 5, last + 6], last + 6, early).current).toBe(1);
  });

  test("while asleep, the best flame is the current one: it did not end", () => {
    expect(read(first, 30, early).bestIsCurrent).toBe(true);
    expect(read(first, k + FLAME_DORMANT_DAYS, early).bestIsCurrent).toBe(false);
  });

  test("a gap closed before the pivot stays a break: current and best are what they were", () => {
    const sessions = [...first, 40, 41];
    // `late` is the old rule: nothing bridged, nothing asleep.
    expect(read(sessions, 46, late)).toMatchObject({ current: 6, best: k, dormant: 0 });
    // Pivot after the relighting day (41): same answer. Before it: bridged.
    expect(read(sessions, 46, day(45))).toMatchObject({ current: 6, best: k, dormant: 0 });
    expect(read(sessions, 46, day(39))).toMatchObject({ current: k + 6, best: k + 6 });
  });

  test("out for 20 days with no session at the pivot: asleep after it, not before", () => {
    const pivot = day(44);
    expect(read(first, 44, pivot).dormant).toBe(0);
    expect(read(first, 50, pivot)).toMatchObject({ current: 0, dormant: k, best: k });
    // The relighting day is after the pivot: the count carries on.
    expect(read([...first, 51, 52], 52, pivot).current).toBe(k + 1);
  });

  test("the journal and the widget read one count: the cache holds what describeFlame says", () => {
    const sessions = first.map(day);
    const info = streaks().calculateStreakFromSessions(sessions, 2, day(50), early);
    expect(info.dormant).toBe(read(first, 50, early).dormant);
  });

  test("longestFlameSince bridges the same way", () => {
    const sessions = [...first, 40, 46].map(day);
    expect(streaks().longestFlameSince(sessions, 2, day(0), day(46), early)).toBe(k + 1);
    expect(streaks().longestFlameSince(sessions, 2, day(0), day(46), late)).toBe(k);
  });
});
