import { count, eq, sql } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";
import { DEV_HISTORY_NOTE, historyStatements } from "./historyStatements";
import { updateStreakAfterSession } from "./streaks";

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

export { DEV_HISTORY_NOTE };

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
  await updateStreakAfterSession();
}

/**
 * `nowSeconds` is where the history ends. The default is the real clock; it is a parameter so a
 * test can pin it, because SQLite's own `'now'` is read by C and no fake timer reaches it.
 */
export async function seedHistory(
  years: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<{
  sessions: number;
  exercises: number;
}> {
  if (!Number.isFinite(years) || years <= 0) {
    throw new Error(`seedHistory: bad years ${years}`);
  }

  const [sessionsSql, exercisesSql] = historyStatements(years, nowSeconds);

  await transactionOrFallback(async (tx) => {
    // Replace rather than append: clicking twice should not double the history.
    await tx.delete(completedQuest).where(eq(completedQuest.notes, DEV_HISTORY_NOTE));

    // One session per training day, walking backwards from now and cycling the quest catalogue.
    await tx.run(sql.raw(sessionsSql));

    // Every round of every exercise of the session's quest, with results inside its target range.
    await tx.run(sql.raw(exercisesSql));
  });

  const [row] = await db
    .select({ c: count() })
    .from(completedExercises)
    .innerJoin(completedQuest, eq(completedQuest.id, completedExercises.sessionId))
    .where(eq(completedQuest.notes, DEV_HISTORY_NOTE));

  // The flame's cache is trusted for the day it was written, so history written under it would
  // leave Home on the old flame while the Journal, which reads fresh, showed the new one: three
  // auditors reported "4 days" on Home against "362 days lit" in the Journal on one database.
  await updateStreakAfterSession();

  return { sessions: await countSeededSessions(), exercises: row?.c ?? 0 };
}
