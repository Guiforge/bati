import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Any seeded movement will do — these tests are about the fold over `completed_exercises`, not
 * about which exercise it is. `assert` rather than `?? 1`: a fallback id would silently test
 * nothing if the migrations ever stopped seeding a catalogue.
 */
function firstExerciseId(t: ReturnType<typeof createTestDb>): number {
  const row = t.sqlite.prepare("SELECT id FROM exercises LIMIT 1").get() as
    | { id: number }
    | undefined;
  assert(row);
  return row.id;
}

describe("db/personalRecords", () => {
  const t = createTestDb();

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

  test("getLongestSession returns null when no sessions exist", async () => {
    const { getLongestSession } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const result = await getLongestSession();
    expect(result).toBeNull();
  });

  test("getLongestSession returns the session with longest duration", async () => {
    const { getLongestSession } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    // Add sessions with different durations
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, durationSeconds) VALUES
        (1, ${now - 3600}, 600),
        (2, ${now - 1800}, 1200),
        (3, ${now}, 800);
    `);

    const result = await getLongestSession();
    expect(result).not.toBeNull();
    expect(result?.type).toBe("longest_session");
    expect(result?.value).toBe(1200);
    expect(result?.sessionId).toBe(2);
  });

  test("getMostXpSession returns the session with most XP", async () => {
    const { getMostXpSession } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, xpEarned) VALUES
        (1, ${now - 3600}, 100),
        (2, ${now - 1800}, 250),
        (3, ${now}, 150);
    `);

    const result = await getMostXpSession();
    expect(result).not.toBeNull();
    expect(result?.type).toBe("most_xp");
    expect(result?.value).toBe(250);
    expect(result?.sessionId).toBe(2);
  });

  test("getExerciseHistory returns an empty map for no ids", async () => {
    const { getExerciseHistory } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    expect(await getExerciseHistory([])).toEqual(new Map());
  });

  test("getExerciseHistory skips a movement with nothing logged", async () => {
    const { getExerciseHistory } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const history = await getExerciseHistory([999]);

    // Absent, not zero: the screen shows no ghost line at all rather than "last time: 0".
    expect(history.has("999:reps")).toBe(false);
  });

  /**
   * Regression: reps and seconds share the resultValue column, and a pooled max let a 60 s hold
   * outrank every rep set on the same movement and report itself as a rep record.
   */
  test("getExerciseHistory keeps reps and seconds apart", async () => {
    const { getExerciseHistory, ghostKey } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);
    const exerciseId = firstExerciseId(t);

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now}), (2, ${now + 60});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 'reps', 12, ${now}, 0),
        (2, ${exerciseId}, 'time', 90, ${now + 60}, 0);
    `);

    const history = await getExerciseHistory([exerciseId]);
    expect(history.get(ghostKey(exerciseId, "reps"))).toEqual({ last: 12, best: 12 });
    expect(history.get(ghostKey(exerciseId, "time"))).toEqual({ last: 90, best: 90 });
  });

  /**
   * The whole point of the function, and the one thing a naive MAX gets wrong: "what to beat" is
   * the last session, "your record" is all time, and the two are different numbers whenever the
   * hero has had a better day earlier.
   */
  test("getExerciseHistory separates the last session from the all-time best", async () => {
    const { getExerciseHistory, ghostKey } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);
    const exerciseId = firstExerciseId(t);

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES
        (1, ${now - 7200}), (2, ${now - 3600}), (3, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 'reps', 10, ${now - 7200}, 0),
        (2, ${exerciseId}, 'reps', 25, ${now - 3600}, 0),
        (3, ${exerciseId}, 'reps', 18, ${now}, 0);
    `);

    const history = await getExerciseHistory([exerciseId]);
    expect(history.get(ghostKey(exerciseId, "reps"))).toEqual({ last: 18, best: 25 });
  });

  test("getExerciseHistory reports the best round of the last session, not its last row", async () => {
    const { getExerciseHistory, ghostKey } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);
    const exerciseId = firstExerciseId(t);

    // A 12/10/8 quest: the hero cleared 12 and faded. Reporting 8 would name a floor they beat
    // twice on the way down.
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 0, 'reps', 12, ${now}, 0),
        (1, ${exerciseId}, 1, 'reps', 10, ${now + 1}, 0),
        (1, ${exerciseId}, 2, 'reps', 8, ${now + 2}, 0);
    `);

    const history = await getExerciseHistory([exerciseId]);
    expect(history.get(ghostKey(exerciseId, "reps"))).toEqual({ last: 12, best: 12 });
  });

  test("getExerciseHistory breaks a same-second tie on the session id", async () => {
    const { getExerciseHistory, ghostKey } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);
    const exerciseId = firstExerciseId(t);

    // Two sessions written in the same second share a timestamp, so the timestamp alone leaves
    // the answer up to row order.
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now}), (2, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 'reps', 20, ${now}, 0),
        (2, ${exerciseId}, 'reps', 14, ${now}, 0);
    `);

    const history = await getExerciseHistory([exerciseId]);
    expect(history.get(ghostKey(exerciseId, "reps"))).toEqual({ last: 14, best: 20 });
  });

  test("getPersonalRecordsSummary returns all records and session count", async () => {
    const { getPersonalRecordsSummary } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned) VALUES
        (1, ${now - 3600}, 600, 100),
        (2, ${now}, 900, 200);
    `);

    const summary = await getPersonalRecordsSummary();
    expect(summary.totalSessions).toBe(2);
    expect(summary.longestSession?.value).toBe(900);
    expect(summary.mostXp?.value).toBe(200);
  });

  function logOuting(leaguesM: number, secondsAgo: number): number {
    const at = Math.floor(Date.now() / 1000) - secondsAgo;
    const info = t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, leaguesM) VALUES ('medium', 10, ?, ?)",
      )
      .run(at, leaguesM);
    return Number(info.lastInsertRowid);
  }

  test("the longest outing is the most ground in one session, and a workout is not one", async () => {
    const { getLongestOuting, getPersonalRecordsSummary } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    expect(await getLongestOuting()).toBeNull();
    logOuting(2500, 120);
    logOuting(4580, 60);
    expect((await getLongestOuting())?.value).toBe(4580);
    const summary = await getPersonalRecordsSummary();
    expect(summary.longestOuting?.value).toBe(4580);
    expect(summary.totalLeaguesM).toBe(7080);
  });

  test("a longer outing is a new record, with the previous one to beat", async () => {
    const { checkForNewRecords } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    logOuting(2500, 120);
    const id = logOuting(4580, 60);
    const records = await checkForNewRecords(id);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recordType: "longest_outing",
          newValue: 4580,
          previousValue: 2500,
        }),
      ]),
    );
  });

  test("checkForNewRecords detects longest session PR", async () => {
    const { checkForNewRecords } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    // Add an existing session
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned) VALUES
        (1, ${now - 3600}, 600, 100);
    `);

    // Add a new longer session
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned) VALUES
        (2, ${now}, 900, 150);
    `);

    const newRecords = await checkForNewRecords(2);

    // Should detect longest session PR
    const longestPr = newRecords.find((r) => r.recordType === "longest_session");
    expect(longestPr).toBeDefined();
    expect(longestPr?.newValue).toBe(900);
    expect(longestPr?.previousValue).toBe(600);
  });

  test("checkForNewRecords detects exercise PR", async () => {
    const { checkForNewRecords } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    const exerciseRow = t.sqlite.prepare(`SELECT id FROM exercises LIMIT 1`).get() as
      | { id: number }
      | undefined;
    const exerciseId = exerciseRow?.id ?? 1;

    // First session with 15 reps
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now - 3600});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 'reps', 15, ${now - 3600}, 0);
    `);

    // Second session with 25 reps (PR)
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (2, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES
        (2, ${exerciseId}, 'reps', 25, ${now}, 0);
    `);

    const newRecords = await checkForNewRecords(2);

    const exercisePr = newRecords.find((r) => r.recordType === "exercise_max_reps");
    expect(exercisePr).toBeDefined();
    expect(exercisePr?.newValue).toBe(25);
    expect(exercisePr?.previousValue).toBe(15);
    expect(exercisePr?.exerciseId).toBe(exerciseId);
  });

  // Regression: a multi-round quest wrote one completed_exercises row per round for the
  // same exercise. Comparing every row against "the rest of history" (not against the
  // other rounds of this same session) flagged the same exercise as a new record once per
  // round instead of once per session.
  test("checkForNewRecords flags a multi-round exercise PR only once", async () => {
    const { checkForNewRecords } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    const exerciseRow = t.sqlite.prepare(`SELECT id FROM exercises LIMIT 1`).get() as
      | { id: number }
      | undefined;
    const exerciseId = exerciseRow?.id ?? 1;

    // First time ever doing this exercise, across 3 rounds of the same session.
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 0, 'reps', 10, ${now}, 0),
        (1, ${exerciseId}, 1, 'reps', 12, ${now}, 1),
        (1, ${exerciseId}, 2, 'reps', 8, ${now}, 2);
    `);

    const newRecords = await checkForNewRecords(1);

    const exercisePrs = newRecords.filter(
      (r) => r.recordType === "exercise_max_reps" && r.exerciseId === exerciseId,
    );
    expect(exercisePrs).toHaveLength(1);
    expect(exercisePrs[0]?.newValue).toBe(12);
  });

  test("checkForNewRecords returns empty for non-PR session", async () => {
    const { checkForNewRecords } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    // Add a long session first
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned) VALUES
        (1, ${now - 3600}, 1200, 300);
    `);

    // Add a shorter session
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned) VALUES
        (2, ${now}, 600, 100);
    `);

    const newRecords = await checkForNewRecords(2);

    // Should not detect any PR for duration or XP (shorter/less than existing)
    const durationPr = newRecords.find((r) => r.recordType === "longest_session");
    const xpPr = newRecords.find((r) => r.recordType === "most_xp");
    expect(durationPr).toBeUndefined();
    expect(xpPr).toBeUndefined();
  });
});
