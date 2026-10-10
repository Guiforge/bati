import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/milestoneFeed", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());
  beforeEach(() => {
    t.sqlite.exec(`DELETE FROM completed_exercises`);
    t.sqlite.exec(`DELETE FROM completed_sessions`);
  });

  const idOf = (name: string) =>
    (t.sqlite.prepare(`SELECT id FROM exercises WHERE enName = ?`).get(name) as { id: number }).id;
  let sid = 0;
  /** One session at `at` (unix seconds) with sets of [exercise, reps]. */
  const session = (at: number, sets: [string, number][], leaguesM: number | null = null) => {
    sid += 1;
    t.sqlite
      .prepare(`INSERT INTO completed_sessions (id, performedAt, leaguesM) VALUES (?, ?, ?)`)
      .run(sid, at, leaguesM);
    sets.forEach(([name, reps], i) => {
      t.sqlite
        .prepare(
          `INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
           VALUES (?, ?, 'reps', ?, ?, ?)`,
        )
        .run(sid, idOf(name), reps, at, i);
    });
  };
  const feeds = async () =>
    await (require("../db/milestoneFeed") as typeof import("../db/milestoneFeed")).getRecentFeeds();

  test("a session's share per muscle sums its sets, oldest first, and the other muscles stay apart", async () => {
    session(1000, [
      ["Push-ups", 10],
      ["Push-ups", 20],
    ]);
    session(2000, [["Push-ups", 5]]);
    const f = await feeds();
    // Push-ups work the chest and the arms: both read the same shares.
    expect(f.muscle.chest).toEqual([30, 5]);
    expect(f.muscle.arms).toEqual([30, 5]);
    expect(f.muscle.legs).toBeUndefined();
  });

  test("only the latest 5 sessions of a muscle come back, and in order", async () => {
    for (let i = 1; i <= 8; i++) session(i * 1000, [["Push-ups", i]]);
    expect((await feeds()).muscle.chest).toEqual([4, 5, 6, 7, 8]);
  });

  test("outings feed the road in leagues, a session without ground feeds nothing", async () => {
    session(1000, [], 2500);
    session(2000, [], 1000);
    session(3000, [["Push-ups", 10]]);
    session(4000, [], 0);
    expect((await feeds()).outing).toEqual([2.5, 1]);
  });

  test("a style reads the exercises of that style", async () => {
    session(1000, [["Push-ups", 10]]);
    const style = (
      t.sqlite.prepare(`SELECT style FROM exercises WHERE enName = 'Push-ups'`).get() as {
        style: string;
      }
    ).style;
    expect((await feeds()).style[style as "strength"]).toEqual([10]);
  });

  test("nothing done: nothing fed", async () => {
    expect(await feeds()).toEqual({ muscle: {}, style: {}, outing: [] });
  });

  test("getSessionFed reads one session: its muscles, its style, and whether it was an outing", async () => {
    const fed = async (id: number) =>
      await (require("../db/milestoneFeed") as typeof import("../db/milestoneFeed")).getSessionFed(
        id,
      );
    session(1000, [["Push-ups", 10]]);
    const pushups = sid;
    session(2000, [], 3000);
    const walk = sid;
    const a = await fed(pushups);
    expect(a.muscles).toContain("chest");
    expect(a.styles).toEqual(["strength"]);
    expect(a.outing).toBe(false);
    expect(await fed(walk)).toEqual({ muscles: [], styles: [], outing: true });
  });
});
