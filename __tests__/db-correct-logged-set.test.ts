import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * A forgotten hold logged as 362 s is corrected from the session page. Records, work units and
 * the page read the rows, so they follow; XP and boss damage are stored and must not move.
 */
describe("correctLoggedSet", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  afterAll(() => t.close());

  const completed = () => require("../db/completed") as typeof import("../db/completed");
  const records = () => require("../db/personalRecords") as typeof import("../db/personalRecords");
  const journal = () => require("../db/journal") as typeof import("../db/journal");

  const holdId = (
    t.sqlite.prepare("SELECT id FROM exercises WHERE style != 'expedition' LIMIT 1").get() as {
      id: number;
    }
  ).id;

  const day = (n: number) => new Date(Date.now() - n * 86_400_000);

  function log(daysAgo: number, value: number, xpEarned = 40) {
    return completed().createCompletedSession({
      questId: null,
      performedAt: day(daysAgo),
      durationSeconds: 600,
      xpEarned,
      exercises: [
        {
          exerciseId: holdId,
          sortOrder: 0,
          result: { type: "time", value },
          performedAt: day(daysAgo),
        },
      ],
    });
  }

  const setOf = (sessionId: number) =>
    (
      t.sqlite.prepare("SELECT id FROM completed_exercises WHERE sessionId = ?").get(sessionId) as {
        id: number;
      }
    ).id;

  const storedValue = (setId: number) =>
    (
      t.sqlite.prepare("SELECT resultValue v FROM completed_exercises WHERE id = ?").get(setId) as {
        v: number;
      }
    ).v;

  async function bestHold() {
    const rows = await records().getMovementRecords(10);
    return rows.find((r) => r.exerciseId === holdId)?.best ?? null;
  }

  test("a 362 s hold corrected to 35 s gives the record back, and leaves XP and damage alone", async () => {
    await log(10, 60);
    const id = await log(0, 362, 77);
    await completed().markSessionWithNewRecords(id, [{ t: "exercise_max_time", e: holdId }]);
    t.sqlite.exec("INSERT INTO adventures (id, questId, kind) VALUES (951, 1, 'boss')");
    t.sqlite.exec(
      "INSERT INTO boss_fights (id, adventureId, totalHp, currentHp) VALUES (951, 951, 500, 400)",
    );
    t.sqlite
      .prepare(
        "INSERT INTO boss_damage_log (bossFightId, completedSessionId, damageDealt) VALUES (951, ?, 100)",
      )
      .run(id);

    expect(await bestHold()).toBe(362);
    const to = new Date(Date.now() + 1000);
    const before = await journal().periodReps(day(30), to);

    expect(await records().correctLoggedSet(setOf(id), 35)).toBe("updated");

    expect(await bestHold()).toBe(60);
    const row = t.sqlite
      .prepare(
        "SELECT hasNewRecords h, records_json j, xpEarned x FROM completed_sessions WHERE id = ?",
      )
      .get(id);
    expect(row).toEqual({ h: 0, j: null, x: 77 });
    const after = await journal().periodReps(day(30), to);
    expect(before - after).toBe(Math.round(362 / 3) - Math.round(35 / 3));
    expect(
      t.sqlite
        .prepare("SELECT damageDealt d FROM boss_damage_log WHERE completedSessionId = ?")
        .get(id),
    ).toEqual({ d: 100 });
    expect(t.sqlite.prepare("SELECT currentHp h FROM boss_fights WHERE id = 951").get()).toEqual({
      h: 400,
    });
  });

  test("correcting upward past the old best makes it a record", async () => {
    await log(20, 50);
    const id = await log(5, 30);
    await records().correctLoggedSet(setOf(id), 90);
    const session = await completed().getCompletedSessionById(id);
    assert(session);
    const fallen = await journal().getFallenRecords(session);
    expect(fallen[0]).toMatchObject({ exerciseId: holdId, value: 90 });
  });

  /** A second movement, so these sessions do not meet the ones above on the same record. */
  const otherId = (
    t.sqlite
      .prepare("SELECT id FROM exercises WHERE style != 'expedition' AND id != ? LIMIT 1")
      .get(holdId) as { id: number }
  ).id;

  function logOther(daysAgo: number, value: number) {
    return completed().createCompletedSession({
      questId: null,
      performedAt: day(daysAgo),
      durationSeconds: 600,
      xpEarned: 1,
      exercises: [
        {
          exerciseId: otherId,
          sortOrder: 0,
          result: { type: "time", value },
          performedAt: day(daysAgo),
        },
      ],
    });
  }

  const stored = (id: number) =>
    t.sqlite
      .prepare("SELECT hasNewRecords h, records_json j FROM completed_sessions WHERE id = ?")
      .get(id) as { h: number; j: string | null };

  test("a later session's badge follows the correction, both ways", async () => {
    const early = await logOther(40, 60);
    const later = await logOther(35, 100);
    await completed().markSessionWithNewRecords(later, [{ t: "exercise_max_time", e: otherId }]);

    // Upward past the later best: the later session no longer broke anything.
    await records().correctLoggedSet(setOf(early), 362);
    expect(stored(later)).toEqual({ h: 0, j: null });

    // And back down under it: the later session broke the record after all.
    await records().correctLoggedSet(setOf(early), 35);
    expect(stored(later)).toEqual({
      h: 1,
      j: JSON.stringify([{ t: "exercise_max_time", e: otherId }]),
    });
  });

  test("a row from before records_json keeps its unlabelled badge", async () => {
    const id = await logOther(30, 20);
    t.sqlite.prepare("UPDATE completed_sessions SET hasNewRecords = 1 WHERE id = ?").run(id);

    await records().correctLoggedSet(setOf(id), 21);
    expect(stored(id)).toEqual({ h: 1, j: null });
  });

  test("a corrected session is judged against what came before it, not what came since", async () => {
    const old = await logOther(60, 40);
    await logOther(55, 200);

    await records().correctLoggedSet(setOf(old), 80);
    expect(stored(old)).toEqual({
      h: 1,
      j: JSON.stringify([{ t: "exercise_max_time", e: otherId }]),
    });
  });

  test("clamps to the session's own range and refuses an outing", async () => {
    const id = await log(2, 30);
    await records().correctLoggedSet(setOf(id), 999_999);
    expect(storedValue(setOf(id))).toBe(3600);

    const walk = await completed().createCompletedSession({
      questId: null,
      durationSeconds: 600,
      xpEarned: 1,
      outing: "walk",
      exercises: [{ exerciseId: holdId, sortOrder: 0, result: { type: "time", value: 600 } }],
    });
    expect(await records().correctLoggedSet(setOf(walk), 10)).toBe("refused");
    expect(storedValue(setOf(walk))).toBe(600);
  });
});
