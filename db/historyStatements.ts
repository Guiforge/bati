/**
 * The SQL behind the dev history seed. Free of any database import, so a test can run it on a
 * database that is still on an old schema without loading the app's current table definitions.
 */

/** Same convention as DEV_XP_NOTE in app/dev.tsx: the marker is what makes the rows removable. */
export const DEV_HISTORY_NOTE = "__dev_history";

/** ~3.5 sessions/week — the cadence DEFAULT_WEEKLY_QUOTA is built around. */
export const SESSIONS_PER_YEAR = 182;

/** Rounds per quest are single digits; the join below truncates to each quest's own `rounds`. */
const MAX_ROUNDS = 20;

/**
 * The two INSERTs that make the history, as SQL text.
 *
 * Plain text rather than drizzle so a test can run the very same statements on a database that is
 * still on an old schema, where the app's current table definitions would select columns that do
 * not exist yet. Only columns every schema since `0000` has are written.
 */
export function historyStatements(years: number, nowSeconds: number): [string, string] {
  const sessions = Math.round(years * SESSIONS_PER_YEAR);
  const stepSeconds = Math.round((years * 365 * 86400) / sessions);
  // The hero got stronger over time, so the recent end of the history is the hard end.
  const hardUntil = Math.round(sessions * 0.2);
  const mediumUntil = Math.round(sessions * 0.6);

  return [
    // One session per training day, walking backwards from now and cycling the quest catalogue.
    `
        INSERT INTO completed_sessions
          (questId, userLevel, durationSeconds, xpEarned, notes, feedback, hasNewRecords, performedAt)
        WITH RECURSIVE
          n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i + 1 < ${sessions}),
          q AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS rn, COUNT(*) OVER () AS total
            FROM quests
          )
        SELECT
          q.id,
          CASE
            WHEN n.i < ${hardUntil} THEN 'hard'
            WHEN n.i < ${mediumUntil} THEN 'medium'
            ELSE 'easy'
          END,
          600 + (n.i * 137) % 2400,
          30 + (n.i * 53) % 120,
          '${DEV_HISTORY_NOTE}',
          CASE (n.i * 7) % 3 WHEN 0 THEN 'easy' WHEN 1 THEN 'good' ELSE 'hard' END,
          CASE WHEN n.i % 23 = 0 THEN 1 ELSE 0 END,
          ${Math.floor(nowSeconds)} - (n.i * ${stepSeconds}) - ((n.i * 3607) % 21600)
        FROM n JOIN q ON q.rn = n.i % q.total
      `,
    // Every round of every exercise of the session's quest, with results inside its target range.
    `
        INSERT INTO completed_exercises
          (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue,
           targetType, targetValue, notes, performedAt)
        WITH RECURSIVE r(k) AS (
          SELECT 0 UNION ALL SELECT k + 1 FROM r WHERE k + 1 < ${MAX_ROUNDS}
        )
        SELECT
          s.id, qe.exerciseId, r.k, qe.sortOrder,
          qe.targetType,
          qe.targetMin + ((s.id * 31 + qe.sortOrder * 7 + r.k * 3) % (qe.targetMax - qe.targetMin + 1)),
          qe.targetType,
          qe.targetMin + ((s.id * 17 + qe.sortOrder) % (qe.targetMax - qe.targetMin + 1)),
          '',
          s.performedAt + qe.sortOrder * 90 + r.k * 240
        FROM completed_sessions s
        JOIN quests q ON q.id = s.questId
        JOIN quest_exercises qe ON qe.questId = q.id
        JOIN r ON r.k < q.rounds
        WHERE s.notes = '${DEV_HISTORY_NOTE}'
      `,
  ];
}
