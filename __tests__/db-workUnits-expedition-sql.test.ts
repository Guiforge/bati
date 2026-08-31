import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The SQL half of the expedition rule, against a real database.
 *
 * `__tests__/db-workUnits.test.ts` proves `toRepEquivalent` returns 0 for an expedition, but the two
 * halves speak different languages: `repEquivalentSql` builds a `CASE` chain that SQLite runs,
 * and no other suite executes it over an expedition row.
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
describe("db/workUnits, the expedition rule in SQL", () => {
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
  function expeditionExerciseId(): number {
    t.sqlite.exec(
      `INSERT OR IGNORE INTO exercises (enName, frName, enDescription, frDescription, style, creator, secondsPerRep)
         VALUES ('Test Expedition', 'Expédition de test', '', '', 'expedition', 'hero', 3)`,
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

  test("an hour of expedition sums to zero rep-equivalents, not to twelve hundred", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const outing = expeditionExerciseId();
    await o.swearOath({ metric: "exercise_volume", target: 100, exerciseId: outing });

    logResult(outing, 3600, "time");

    // Without the guard this reads 1200 — more HP than the largest boss in the game has.
    expect((await o.getOathProgress())?.current).toBe(0);
  });

  test("a counted expedition result is zero too — the guard is the style, not the unit", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const outing = expeditionExerciseId();
    await o.swearOath({ metric: "exercise_volume", target: 100, exerciseId: outing });

    logResult(outing, 500, "reps");

    expect((await o.getOathProgress())?.current).toBe(0);
  });

  test("and a held strength movement over the same seconds still converts", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const strengthId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE style = 'strength' LIMIT 1").get() as {
        id: number;
      }
    ).id;
    await o.swearOath({ metric: "exercise_volume", target: 10_000, exerciseId: strengthId });

    logResult(strengthId, 3600, "time");

    expect((await o.getOathProgress())?.current).toBe(1200);
  });

  /**
   * The mistake this file now guards against, because it was made once and cost a day.
   *
   * `cardio` looked like the natural home for expeditions until someone counted it: it holds
   * eight movements — burpees, jumping jacks, mountain climbers among them — across eleven slots
   * of six shipped quests, every one of them counted repetitions that have earned boss damage
   * and village volume since the app shipped. Pointing the guard at `cardio` silently zeroed all
   * of them, and the suite stayed green.
   */
  test("cardio still converts — burpees are repetitions, not an outing", async () => {
    const o = require("../db/oaths") as typeof import("../db/oaths");
    const burpeeId = (
      t.sqlite.prepare("SELECT id FROM exercises WHERE style = 'cardio' LIMIT 1").get() as {
        id: number;
      }
    ).id;
    await o.swearOath({ metric: "exercise_volume", target: 1000, exerciseId: burpeeId });

    logResult(burpeeId, 20, "reps");

    expect((await o.getOathProgress())?.current).toBe(20);
  });
});
