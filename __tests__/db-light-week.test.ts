import { clientMock, createTestDb } from "./helpers/testDb";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-17T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

describe("db/lightWeek", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());
  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
  });

  const lw = () => require("../db/lightWeek") as typeof import("../db/lightWeek");
  const exerciseWith = (pattern: string | null): number => {
    const row = t.sqlite
      .prepare(
        `SELECT id FROM exercises WHERE ${pattern ? "pattern = ?" : "pattern IS NULL"} LIMIT 1`,
      )
      .get(...(pattern ? [pattern] : [])) as { id: number } | undefined;
    if (row) return row.id;
    // Hero-made movement with no pattern: none is seeded.
    return Number(
      t.sqlite
        .prepare(
          "INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, imagePath) VALUES ('Mine', 'Mien', 'd', 'd', 'hero', 'x')",
        )
        .run().lastInsertRowid,
    );
  };

  /** A workout `ago` days back with one set per [result, target] pair. */
  function session(ago: number, sets: [number, number][], exerciseId = exerciseWith("squat")) {
    const at = Math.floor(daysAgo(ago).getTime() / 1000);
    const id = Number(
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 1, ?)",
        )
        .run(at).lastInsertRowid,
    );
    sets.forEach(([result, target], i) => {
      t.sqlite
        .prepare(
          `INSERT INTO completed_exercises
             (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetValue, performedAt)
           VALUES (?, ?, 0, ?, 'reps', ?, ?, ?)`,
        )
        .run(id, exerciseId, i, result, target, at);
    });
    return id;
  }

  test("two sessions in a row under the target offer the week", async () => {
    session(3, [[8, 10]]);
    session(1, [
      [10, 10],
      [7, 10],
      [6, 10],
    ]);
    expect(await lw().lightWeekReason(NOW)).toBe("under");
  });

  test("a session is under only when more than half of its strength sets missed", async () => {
    session(3, [[8, 10]]);
    // Exactly half missed: not under.
    session(1, [
      [10, 10],
      [7, 10],
    ]);
    expect(await lw().lightWeekReason(NOW)).toBeNull();
  });

  test("mobility sets do not count toward under: met stretches cannot hide missed strength", async () => {
    session(3, [[8, 10]]);
    const id = session(1, [[7, 10]]);
    for (let i = 1; i <= 3; i++)
      t.sqlite
        .prepare(
          `INSERT INTO completed_exercises
             (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetValue, performedAt)
           VALUES (?, ?, 0, ?, 'time', 30, 30, 0)`,
        )
        .run(id, exerciseWith("mobility"), i);
    expect(await lw().lightWeekReason(NOW)).toBe("under");
  });

  test("a session of only mobility sets is never under", async () => {
    session(3, [[8, 10]]);
    session(1, [[10, 30]], exerciseWith("mobility"));
    expect(await lw().lightWeekReason(NOW)).toBeNull();
  });

  test("one clean session in between breaks the run", async () => {
    session(3, [[8, 10]]);
    session(2, [[10, 10]]);
    session(1, [[7, 10]]);
    expect(await lw().lightWeekReason(NOW)).toBeNull();
  });

  test("five weeks at four sessions offer it, four weeks do not", async () => {
    for (let week = 0; week < 5; week++)
      for (let k = 0; k < 4; k++) session(week * 7 + k + 0.5, [[10, 10]]);
    expect(await lw().lightWeekReason(NOW)).toBe("busy");
    t.sqlite.exec(
      "DELETE FROM completed_sessions WHERE performedAt < " +
        Math.floor(daysAgo(30).getTime() / 1000),
    );
    expect(await lw().lightWeekReason(NOW)).toBeNull();
  });

  test("two missed sessions inside an accepted week do not offer the next one on day 8", async () => {
    await lw().acceptLightWeek(daysAgo(7.5));
    session(5, [[5, 10]]);
    session(4, [[5, 10]]);
    expect(await lw().lightWeekReason(NOW)).toBeNull();
  });

  test("a refusal silences the card for 14 days, then it can speak again", async () => {
    session(3, [[8, 10]]);
    session(1, [[7, 10]]);
    await lw().refuseLightWeek(daysAgo(0.5));
    expect(await lw().lightWeekReason(NOW)).toBeNull();
    // Two fresh misses after the refusal: only the 14-day silence keeps the card quiet.
    session(-5, [[5, 10]]);
    session(-5.5, [[5, 10]]);
    expect(await lw().lightWeekReason(new Date(NOW.getTime() + 6 * DAY))).toBeNull();
    expect(await lw().lightWeekReason(new Date(NOW.getTime() + 15 * DAY))).toBe("under");
  });

  test("an accepted week runs 7 days and takes one round off, unless the rounds are hand-set", async () => {
    await lw().acceptLightWeek(NOW);
    expect(await lw().isLightWeekRunning(new Date(NOW.getTime() + 6 * DAY))).toBe(true);
    expect(await lw().isLightWeekRunning(new Date(NOW.getTime() + 8 * DAY))).toBe(false);
    // A session begun before the tap and saved after it is not in the week.
    expect(await lw().isLightWeekRunning(new Date(NOW.getTime() - 1000))).toBe(false);
    expect(lw().lightWeekRunning(NOW.getTime(), new Date(NOW.getTime() - 1))).toBe(false);
  });

  test("the hero can end the week early, and the offer does not come straight back", async () => {
    session(3, [[8, 10]]);
    session(1, [[7, 10]]);
    await lw().acceptLightWeek(daysAgo(0.5));
    expect(await lw().lightWeekUntil(NOW)).toEqual(new Date(daysAgo(0.5).getTime() + 7 * DAY));
    await lw().endLightWeek(NOW);
    expect(await lw().isLightWeekRunning(NOW)).toBe(false);
    expect(await lw().lightWeekUntil(NOW)).toBeNull();
    // The two misses came before the acceptance: ending is not a way to be asked again.
    expect(await lw().lightWeekReason(NOW)).toBeNull();
    // Accepting again later runs a new week.
    await lw().acceptLightWeek(new Date(NOW.getTime() + 1000));
    expect(await lw().isLightWeekRunning(new Date(NOW.getTime() + 2000))).toBe(true);
  });

  test("no offer inside a pause: accepting would use up the seven days of the break", async () => {
    session(3, [[8, 10]]);
    session(1, [[7, 10]]);
    expect(await lw().lightWeekReason(NOW)).toBe("under");
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES ('pause_goal', ?)")
      .run(JSON.stringify([{ from: "2026-10-15", until: "2026-10-25" }]));
    expect(await lw().lightWeekReason(NOW)).toBeNull();
  });

  test("hard sets: missed sets count, stretches and pattern-less movements do not", async () => {
    session(
      1,
      [
        [10, 10],
        [3, 10],
        [10, 10],
      ],
      exerciseWith("squat"),
    );
    session(
      1,
      [
        [30, 30],
        [30, 30],
      ],
      exerciseWith("mobility"),
    );
    session(1, [[5, 5]], exerciseWith(null));
    session(9, [[10, 10]], exerciseWith("squat")); // before the week
    expect(await lw().hardSetsByPattern(daysAgo(6))).toEqual([{ pattern: "squat", sets: 3 }]);
  });
});
