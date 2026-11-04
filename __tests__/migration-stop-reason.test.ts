import Database from "better-sqlite3";

import { migrate } from "./helpers/migrateTo";

/**
 * `0083_stop_reason.sql` on a phone from before it, through the app's own migration runner: every row
 * stays, an old session reads as a normal end, and an old set as neutral for no light-week reason.
 * No backfill: nothing in an old row says which of the two meanings its flag had.
 */
const LAST_IDX_BEFORE = 82;

test("a journal from before 0083 keeps every row, with both columns at their empty value", async () => {
  const sqlite = new Database(":memory:");
  await migrate(sqlite, LAST_IDX_BEFORE);

  const { lastInsertRowid } = sqlite
    .prepare(
      "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, notes, performedAt) VALUES ('old', 'medium', 42, 'genou', 1700000000)",
    )
    .run();
  const exercise = sqlite.prepare("SELECT id FROM exercises ORDER BY id LIMIT 1").get() as {
    id: number;
  };
  sqlite
    .prepare(
      `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, ladderNeutral, performedAt)
       VALUES (?, ?, 0, 0, 'reps', 12, 1, 1700000000)`,
    )
    .run(lastInsertRowid, exercise.id);

  await migrate(sqlite);

  expect(
    sqlite.prepare("SELECT xpEarned, notes, stopReason FROM completed_sessions").all(),
  ).toEqual([{ xpEarned: 42, notes: "genou", stopReason: null }]);
  expect(
    sqlite
      .prepare("SELECT resultValue, ladderNeutral, lightWeekNeutral FROM completed_exercises")
      .all(),
  ).toEqual([{ resultValue: 12, ladderNeutral: 1, lightWeekNeutral: 0 }]);
  sqlite.close();
});
