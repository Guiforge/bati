import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * What the goal sheet offers first, read from a real journal: the query is the part a mock would
 * have agreed with whatever it said.
 */
describe("getOutingHabit", () => {
  const t = createTestDb();
  const now = new Date("2026-10-07T12:00:00Z");
  const daysAgo = (d: number) => Math.floor(now.getTime() / 1000) - d * 86_400;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());
  beforeEach(() => t.sqlite.exec("DELETE FROM completed_sessions"));

  function outing(outing: string | null, metres: number, seconds: number, ago: number): void {
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (performedAt, outing, leaguesM, movingSeconds) VALUES (?, ?, ?, ?)",
      )
      .run(daysAgo(ago), outing, metres, seconds);
  }

  const habit = () => {
    const { getOutingHabit } = require("../db/outingHabit") as typeof import("../db/outingHabit");
    return getOutingHabit("run", now);
  };

  test("the usual run is the median of the last three, distance and time apart", async () => {
    // The 21 km afternoon is the one that must not become next week's goal.
    outing("run", 5000, 1500, 1);
    outing("run", 21_000, 1800, 3);
    outing("run", 6000, 9000, 5);
    outing("run", 40_000, 9000, 60); // fourth, so not in the habit, and outside the month
    outing("ride", 7000, 2000, 2); // another kind
    outing("run", 9000, 300, 0); // five minutes: a test, not a habit

    expect(await habit()).toEqual({ usual: { metres: 6000, seconds: 1800 }, longestM: 21_000 });
  });

  test("two runs are not a habit, and an empty month has no ceiling", async () => {
    outing("run", 5000, 1500, 40);
    outing("run", 5000, 1500, 45);

    expect(await habit()).toEqual({ usual: null, longestM: null });
  });
});
