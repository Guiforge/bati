import { count, eq, sql } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";

/**
 * Dev-only history generator, driven from app/dev.tsx.
 *
 * Every history-derived screen — streaks, records, achievements, trends, muscle balance, hero
 * level — recalculates from `completed_sessions` + `completed_exercises`; none of them has its own
 * table. So filling those two is what puts a real row count under all of them at once, which is
 * the only way to tell whether a list or an aggregate query actually holds up.
 *
 * Generated in SQL rather than in a JS loop: a 5-year history is ~13k exercise rows, and the
 * INSERT ... SELECT below builds each session's exercises from `quest_exercises` of the quest that
 * produced it, so targets and rounds are the real ones and the aggregates see plausible data.
 */

const { completedQuest, completedExercises } = schema;

/** Same convention as DEV_XP_NOTE in app/dev.tsx: the marker is what makes the rows removable. */
export const DEV_HISTORY_NOTE = "__dev_history";

/** ~3.5 sessions/week — the cadence DEFAULT_WEEKLY_QUOTA is built around. */
const SESSIONS_PER_YEAR = 182;

/** Rounds per quest are single digits; the join below truncates to each quest's own `rounds`. */
const MAX_ROUNDS = 20;

export async function countSeededSessions(): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(completedQuest)
    .where(eq(completedQuest.notes, DEV_HISTORY_NOTE));
  return row?.c ?? 0;
}

/** Removes only the seeded rows; `completed_exercises` follows via ON DELETE CASCADE. */
export async function clearSeededHistory(): Promise<void> {
  await db.delete(completedQuest).where(eq(completedQuest.notes, DEV_HISTORY_NOTE));
}

export async function seedHistory(years: number): Promise<{
  sessions: number;
  exercises: number;
}> {
  if (!Number.isFinite(years) || years <= 0) {
    throw new Error(`seedHistory: bad years ${years}`);
  }

  const sessions = Math.round(years * SESSIONS_PER_YEAR);
  const stepSeconds = Math.round((years * 365 * 86400) / sessions);
  // The hero got stronger over time, so the recent end of the history is the hard end.
  const hardUntil = Math.round(sessions * 0.2);
  const mediumUntil = Math.round(sessions * 0.6);

  await transactionOrFallback(async (tx) => {
    // Replace rather than append: clicking twice should not double the history.
    await tx.delete(completedQuest).where(eq(completedQuest.notes, DEV_HISTORY_NOTE));

    // One session per training day, walking backwards from now and cycling the quest catalogue.
    await tx.run(
      sql.raw(`
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
          CAST(strftime('%s', 'now') AS INTEGER) - (n.i * ${stepSeconds}) - ((n.i * 3607) % 21600)
        FROM n JOIN q ON q.rn = n.i % q.total
      `),
    );

    // Every round of every exercise of the session's quest, with results inside its target range.
    await tx.run(
      sql.raw(`
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
      `),
    );
  });

  const [row] = await db
    .select({ c: count() })
    .from(completedExercises)
    .innerJoin(completedQuest, eq(completedQuest.id, completedExercises.sessionId))
    .where(eq(completedQuest.notes, DEV_HISTORY_NOTE));

  return { sessions: await countSeededSessions(), exercises: row?.c ?? 0 };
}
