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
});
