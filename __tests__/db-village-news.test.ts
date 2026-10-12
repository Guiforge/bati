import { clientMock, createTestDb } from "./helpers/testDb";

/** T3: what the years announce, read off a real journal: an Age, the anniversary, once each. */
describe("readVillageNews", () => {
  const t = createTestDb();
  const NOW = new Date(2026, 9, 12, 12);
  const DAY = 86_400_000;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec(`DELETE FROM completed_exercises`);
    t.sqlite.exec(`DELETE FROM completed_sessions`);
  });

  const ladder = () => {
    const rows = t.sqlite
      .prepare(
        "SELECT id, enName FROM exercises WHERE creator = 'Admin' AND style = 'strength' LIMIT 2",
      )
      .all() as { id: number; enName: string }[];
    const [a, b] = rows;
    if (!a || !b) throw new Error("the seed has no two strength movements");
    t.sqlite
      .prepare("UPDATE exercises SET prerequisiteExerciseId = ? WHERE id = ?")
      .run(a.id, b.id);
    return { a, b };
  };

  function add(daysAgo: number, exerciseId: number, reps: number, xp = 100) {
    const at = Math.floor((NOW.getTime() - daysAgo * DAY) / 1000);
    const { lastInsertRowid } = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt) VALUES (?, 'medium', ?, ?)",
      )
      .run(`s-${daysAgo}-${reps}`, xp, at);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', ?, ?)`,
      )
      .run(lastInsertRowid, exerciseId, reps, at);
  }

  const news = (shown: string[] | undefined) => {
    const { readVillageNews } = require("../db/villageNews") as typeof import("../db/villageNews");
    return readVillageNews(shown, NOW, null);
  };

  test("a hero who updates with 3 years behind them gets one anniversary, with the year's count", async () => {
    const { a } = ladder();
    add(365 * 3 + 20, a.id, 8);
    for (let i = 0; i < 12; i++) add(300 - i * 20, a.id, 9 + i);

    const first = (await news([])).anniversary;
    expect(first).toMatchObject({ years: 3, sessions: 12 });
    expect(first?.best).toMatchObject({ prior: 8, value: 9 });
    expect((await news(["anniversary:3"])).anniversary).toBeNull();
    // Three years of absence between visits is the same single feast, never one per year.
    expect((await news(["anniversary:1"])).anniversary?.years).toBe(3);
  });

  test("a quiet year has few sessions and a village under a year has no anniversary", async () => {
    const { a } = ladder();
    add(365 * 2 + 5, a.id, 8);
    add(2, a.id, 12);
    expect((await news([])).anniversary).toMatchObject({ years: 2, sessions: 1 });

    t.sqlite.exec(`DELETE FROM completed_exercises`);
    t.sqlite.exec(`DELETE FROM completed_sessions`);
    add(100, a.id, 8);
    expect((await news([])).anniversary).toBeNull();
  });

  test("an Age is named after the movement, once, and the next Age is news again", async () => {
    const { a, b } = ladder();
    add(40, a.id, 8, 10);
    add(10, b.id, 8, 100_000);

    const got = (await news([])).age;
    expect(got).toMatchObject({ source: "held", movement: { enName: b.enName } });
    expect(got?.level).toBeGreaterThanOrEqual(50);
    expect((got?.level ?? 1) % 10).toBe(0);
    expect((await news([`age:${got?.level}`])).age).toBeNull();
    expect((await news(undefined)).age).toBeNull();
  });
});
