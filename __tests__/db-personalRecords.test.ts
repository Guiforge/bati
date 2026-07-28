import { clientMock, createTestDb } from "./helpers/testDb";

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

  test("getExerciseMaxReps returns null for unseen exercise", async () => {
    const { getExerciseMaxReps } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const result = await getExerciseMaxReps(999);
    expect(result).toBeNull();
  });

  test("getExerciseMaxReps returns the max reps for an exercise", async () => {
    const { getExerciseMaxReps } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    const now = Math.floor(Date.now() / 1000);

    // Get a real exercise ID
    const exerciseRow = t.sqlite.prepare(`SELECT id FROM exercises LIMIT 1`).get() as
      | { id: number }
      | undefined;
    const exerciseId = exerciseRow?.id ?? 1;

    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now}), (2, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES
        (1, ${exerciseId}, 'reps', 15, ${now}, 0),
        (2, ${exerciseId}, 'reps', 20, ${now}, 0);
    `);

    const result = await getExerciseMaxReps(exerciseId);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("exercise_max_reps");
    expect(result?.value).toBe(20);
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
    expect(exercisePrs[0].newValue).toBe(12);
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
