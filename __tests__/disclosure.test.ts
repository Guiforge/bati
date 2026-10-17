import { clientMock, createTestDb } from "./helpers/testDb";

/** Home's day one is read from the journal: 0, 1 and 3 sessions give three different Homes. */
describe("disclosure", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());
  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_sessions");
  });

  const read = () =>
    (require("../db/disclosure") as typeof import("../db/disclosure")).disclosure();

  function log(id: number, opts: { outing?: "walk" | null; seconds?: number } = {}): void {
    t.sqlite
      .prepare(
        `INSERT INTO completed_sessions (id, userLevel, durationSeconds, xpEarned, performedAt, outing)
         VALUES (?, 'medium', ?, 50, ?, ?)`,
      )
      .run(
        id,
        opts.seconds ?? 1500,
        Math.floor(Date.now() / 1000) - id * 3600,
        opts.outing ?? null,
      );
  }

  test("0, 1 and 3 sessions", async () => {
    expect(await read()).toEqual({ level: false, outingGoals: false, oathStrip: false });
    log(1);
    expect(await read()).toEqual({ level: true, outingGoals: true, oathStrip: false });
    log(2);
    log(3);
    expect(await read()).toEqual({ level: true, outingGoals: true, oathStrip: true });
  });

  test("one outing alone opens the level", async () => {
    log(1, { outing: "walk", seconds: 3600 });
    expect((await read()).level).toBe(true);
  });

  test("three short walks open the level but not the oath", async () => {
    for (const id of [1, 2, 3]) log(id, { outing: "walk", seconds: 180 });
    expect(await read()).toEqual({ level: true, outingGoals: true, oathStrip: false });
  });

  test("deleting a session takes the count back", async () => {
    for (const id of [1, 2, 3]) log(id);
    expect((await read()).oathStrip).toBe(true);
    t.sqlite.exec("DELETE FROM completed_sessions WHERE id = 3");
    expect((await read()).oathStrip).toBe(false);
  });
});
