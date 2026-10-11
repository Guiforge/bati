import { and, desc, eq, gte, isNotNull, max } from "drizzle-orm";
import { db, schema } from "./client";
import { OUTING_COUNTS_AFTER_SECONDS } from "./completed";
import { habitOf, type OutingHabit } from "./outingRule";
import type { Locomotion } from "./schema";

const { completedQuest } = schema;

/** How far back "the longest run of the month" looks. */
const LONGEST_WINDOW_DAYS = 30;

/**
 * The hero's habit for one kind of outing, read from the journal. What it means and what is
 * proposed from it are in `db/outingRule.ts`, which has no database in it.
 */
export async function getOutingHabit(
  locomotion: Locomotion,
  now = new Date(),
): Promise<OutingHabit> {
  const since = new Date(now.getTime() - LONGEST_WINDOW_DAYS * 86_400_000);
  const ofKind = and(
    eq(completedQuest.outing, locomotion),
    isNotNull(completedQuest.leaguesM),
    isNotNull(completedQuest.movingSeconds),
  );
  const [recent, [longest]] = await Promise.all([
    db
      .select({ metres: completedQuest.leaguesM, seconds: completedQuest.movingSeconds })
      .from(completedQuest)
      // Ten minutes, the same floor as a walk that counts: a two-minute test is not a habit.
      .where(and(ofKind, gte(completedQuest.movingSeconds, OUTING_COUNTS_AFTER_SECONDS)))
      .orderBy(desc(completedQuest.performedAt))
      .limit(3),
    db
      .select({
        metres: max(completedQuest.leaguesM),
        seconds: max(completedQuest.movingSeconds),
      })
      .from(completedQuest)
      // The same ten-minute floor as the habit: an outing given up after three minutes is not
      // "the longest of the month", and read as one it capped the next proposal at 3 min 18.
      .where(
        and(
          ofKind,
          gte(completedQuest.performedAt, since),
          gte(completedQuest.movingSeconds, OUTING_COUNTS_AFTER_SECONDS),
        ),
      ),
  ]);
  return habitOf(
    recent.map((r) => ({ metres: r.metres ?? 0, seconds: r.seconds ?? 0 })),
    longest?.metres ?? null,
    longest?.seconds ?? null,
  );
}
