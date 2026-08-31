import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The SQL half of the cardio rule, against a real database.
 *
 * `__tests__/db-workUnits.test.ts` proves `toRepEquivalent` returns 0 for cardio, but the two
 * halves speak different languages: `repEquivalentSql` builds a `CASE` chain that SQLite runs,
 * and no other suite executes it over a cardio row — the catalogue has no cardio movement yet.
 * The load-bearing half would otherwise ship unproven.
 *
 * Why load-bearing: damage is `toRepEquivalent` with no ceiling, and a boss carries 278 to 1115
 * HP for a whole campaign. An hour's walk at 3 s per rep is 1200. If either half of this rule
 * leaks, one walk kills the game. See docs/designs/expeditions.md.
 *
 * The probe is an oath, and that is not an arbitrary choice. The village cannot see this: its
 * style volumes are read only for the two style-gated buildings, and cardio has none — a test
 * asserting "no building moved" passes with the guard deleted, which is how the first draft of
 * this file proved nothing.
 */
describe("db/workUnits, the cardio rule in SQL", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
  });

  /** A cardio movement of our own, so this does not wait on the seed content that adds one. */
  function cardioExerciseId(): number {
    t.sqlite.exec(
      `INSERT OR IGNORE INTO exercises (enName, frName, enDescription, frDescription, style, creator, secondsPerRep)
         VALUES ('Test Expedition', 'Expédition de test', '', '', 'cardio', 'hero', 3)`,
    );
    return (
      t.sqlite.prepare("SELECT id FROM exercises WHERE enName = 'Test Expedition'").get() as {
        id: number;
      }
    ).id;
  }

  function logResult(exerciseId: number, resultValue: number, resultType: "reps" | "time"): void {
    const now = Date.now();
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt) VALUES ('medium', 10, ?)",
      )
      .run(now);
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, ?, ?, ?)`,
      )
      .run(Number(info.lastInsertRowid), exerciseId, resultType, resultValue, now);
  }

  test("an hour of cardio sums to zero rep-equivalents, not to twelve hundred", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const cardioId = cardioExerciseId();
    await o.swearOath({ metric: "exercise_volume", target: 100, exerciseId: cardioId });

    logResult(cardioId, 3600, "time");

    // Without the guard this reads 1200 — more HP than the largest boss in the game has.
    expect((await o.getOathProgress())?.current).toBe(0);
  });

  test("a counted cardio result is zero too — the guard is the style, not the unit", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const cardioId = cardioExerciseId();
    await o.swearOath({ metric: "exercise_volume", target: 100, exerciseId: cardioId });

    logResult(cardioId, 500, "reps");

    expect((await o.getOathProgress())?.current).toBe(0);
  });

  test("and a held strength movement over the same seconds still converts", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const strengthId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE style != 'cardio' LIMIT 1").get() as {
        id: number;
      }
    ).id;
    await o.swearOath({ metric: "exercise_volume", target: 10_000, exerciseId: strengthId });

    logResult(strengthId, 3600, "time");

    expect((await o.getOathProgress())?.current).toBe(1200);
  });
});
