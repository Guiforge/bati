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

    // The five-minute test is not "the longest of the month" either, in distance or in time.
    // And the proposal travels with it: the usual thirty minutes, well under the ceiling.
    expect(await habit()).toEqual({
      usual: { metres: 6000, seconds: 1800 },
      longestM: 21_000,
      longestSeconds: 9000,
      proposal: { seconds: 1800, walkRun: false },
    });
  });

  test("two runs are not a habit, and an empty month has no ceiling", async () => {
    outing("run", 5000, 1500, 40);
    outing("run", 5000, 1500, 45);

    expect(await habit()).toEqual({
      usual: null,
      longestM: null,
      longestSeconds: null,
      proposal: { seconds: 1200, walkRun: true },
    });
  });

  // A run given up after three minutes was read as the longest of the month, and capped the
  // next proposal at 3 min 18.
  test("an outing given up early is not the longest of the month", async () => {
    outing("run", 600, 180, 2);

    expect(await habit()).toEqual({
      usual: null,
      longestM: null,
      longestSeconds: null,
      proposal: { seconds: 1200, walkRun: true },
    });
  });
});

/** The rule a run is proposed by, case by case, in the order `proposedRunSeconds` reads it. */
describe("proposedRunSeconds", () => {
  const t = createTestDb();
  const WALK_RUN_SECONDS = 20 * 60;
  const min = (m: number) => m * 60;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  // Required late: the module imports the database client, which only the mock above can stand in for.
  const proposedRunSeconds = (habit: import("../db/outingHabit").OutingHabit) =>
    (require("../db/outingHabit") as typeof import("../db/outingHabit")).proposedRunSeconds(habit);

  test("no run this month: twenty minutes of walk and run", () => {
    expect(proposedRunSeconds({ usual: null, longestM: null, longestSeconds: null })).toEqual({
      seconds: WALK_RUN_SECONDS,
      walkRun: true,
    });
  });

  test("a habit is proposed as it is, under the ceiling", () => {
    const habit = {
      usual: { metres: 5000, seconds: min(30) },
      longestM: 6000,
      longestSeconds: min(35),
    };
    expect(proposedRunSeconds(habit)).toEqual({ seconds: min(30), walkRun: false });
  });

  test("never more than 110 % of the longest of the month", () => {
    // The usual is 45 because of two long runs outside the window; the month's longest is 30.
    const habit = {
      usual: { metres: 9000, seconds: min(45) },
      longestM: 6000,
      longestSeconds: min(30),
    };
    expect(proposedRunSeconds(habit)).toEqual({ seconds: min(33), walkRun: false });
  });

  test("one or two runs: the longest as it is, with no increase", () => {
    const habit = { usual: null, longestM: 4500, longestSeconds: min(25) };
    expect(proposedRunSeconds(habit)).toEqual({ seconds: min(25), walkRun: false });
  });

  test("a longest run of twelve minutes is answered by the walk-run, not by twenty of running", () => {
    const habit = { usual: null, longestM: 2000, longestSeconds: min(12) };
    expect(proposedRunSeconds(habit)).toEqual({ seconds: WALK_RUN_SECONDS, walkRun: true });
  });
});
