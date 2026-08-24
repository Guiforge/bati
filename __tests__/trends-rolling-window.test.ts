import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * rollingWeekTotals is pure, but db/completed.ts still imports db/client at module scope
 * (native expo-sqlite), so it has to load through the same mock every other db/completed test
 * uses — see __tests__/db-completed-trends.test.ts.
 */
describe("rollingWeekTotals", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const rollingWeekTotals = () =>
    (require("../db/completed") as typeof import("../db/completed")).rollingWeekTotals;

  const day = (offset: number) => {
    const d = new Date("2026-08-24T09:00:00"); // a Monday
    d.setDate(d.getDate() + offset);
    return d;
  };

  it("counts yesterday's sessions in the current window — Monday is not a cliff", () => {
    const sessions = [
      { performedAt: day(-1), durationSeconds: 600, xp: 40 }, // Sunday x3
      { performedAt: day(-1), durationSeconds: 300, xp: 20 },
      { performedAt: day(-1), durationSeconds: 300, xp: 25 },
    ];
    const { current, previous } = rollingWeekTotals()(sessions, day(0));
    expect(current.sessions).toBe(3); // trailing 7 days, not the calendar week
    expect(previous.sessions).toBe(0);
  });

  it("splits at exactly seven days", () => {
    const sessions = [
      { performedAt: day(-3), durationSeconds: 600, xp: 10 },
      { performedAt: day(-10), durationSeconds: 600, xp: 10 },
      { performedAt: day(-15), durationSeconds: 600, xp: 10 }, // outside both windows
    ];
    const { current, previous } = rollingWeekTotals()(sessions, day(0));
    expect(current.sessions).toBe(1);
    expect(previous.sessions).toBe(1);
  });

  /**
   * Regression for the mismatch with db/streaks.ts: bucketing by raw wall-clock milliseconds
   * (`now.getTime() - 7*DAY`) instead of local calendar day puts a session that happened on
   * "today - 7 calendar days" into "current" whenever its time-of-day is later than `now`'s —
   * because it's less than a full 7*24h ago. The flame's own countInWindow/isLit split (and
   * db/dates.ts's dayKey) count in calendar days, not milliseconds, so this session must land
   * in "previous": it's exactly the day the flame's previous window starts on.
   */
  it("buckets by calendar day, not by whether 7*24h have elapsed", () => {
    const now = new Date("2026-08-24T09:00:00"); // Monday, 09:00
    // Exactly seven calendar days earlier, but in the afternoon — under raw-millisecond math
    // (now - 7*24h = last Monday 09:00) this sits *after* that cutoff and would wrongly land
    // in "current".
    const lastMondayAfternoon = new Date("2026-08-17T15:00:00");
    const sessions = [{ performedAt: lastMondayAfternoon, durationSeconds: 600, xp: 10 }];

    const { current, previous } = rollingWeekTotals()(sessions, now);
    expect(previous.sessions).toBe(1);
    expect(current.sessions).toBe(0);
  });

  it("drops future-dated sessions instead of folding them into the current window", () => {
    const sessions = [{ performedAt: day(1), durationSeconds: 600, xp: 10 }]; // tomorrow
    const { current, previous } = rollingWeekTotals()(sessions, day(0));
    expect(current.sessions).toBe(0);
    expect(previous.sessions).toBe(0);
  });
});
