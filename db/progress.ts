import { type SQL, sql } from "drizzle-orm";

/**
 * The one place a movement's progress is defined (roadmap M-01, "Brique A"). Nothing here is
 * stored: sync carries `completed_exercises`, and every device derives the same figures. It is a
 * shared SQL fragment and not a view, because `validateBackup` refuses a backup holding a view
 * and any migration stops `mergePeer` between two versions. Pure: no db client, no schema value.
 *
 * Readers that ask a per-movement question (`getMovementRecords`, the oath) keep their direct
 * aggregate: the per-session fold is 5-7x slower for them. Readers that cut on a set's own time
 * (the wall's firsts and season, `previousBest`, the ladder window) filter sets before any fold.
 */

/**
 * "Did this set meet what the app asked": against the prescription (0070), else the handed
 * target. A set with neither never meets. The one copy; `MIN()` of it over a session is "every
 * set met", and each reader filters `ladderNeutral` sets out in its own WHERE.
 */
// Raw column names on purpose: `${completedExercises.x}` would read the schema at import, and the
// suites that mock the client with half a schema fail to load. Only used where
// `completed_exercises` is the sole table in scope, so the names are unambiguous.
export const setMetSql = sql<number>`CASE WHEN COALESCE(prescribedValue, targetValue) IS NOT NULL
  AND resultValue >= COALESCE(prescribedValue, targetValue) THEN 1 ELSE 0 END`;

/**
 * One row per (movement, unit, session): its best set and when its last set was logged.
 * `where` filters SETS, before the fold, so a reader that cuts on a set's own time keeps its exact
 * meaning. Columns: exerciseId, resultType, sessionId, best, at (seconds, raw, no mapper).
 */
export function sessionBestsSql(where: SQL): SQL {
  return sql`SELECT exerciseId, resultType, sessionId,
                    MAX(resultValue) AS best, MAX(performedAt) AS at
             FROM completed_exercises WHERE ${where}
             GROUP BY exerciseId, resultType, sessionId`;
}

/**
 * What beats a record: one more in the movement's own unit. A rep for reps, a second for a hold.
 * A movement never logged is beaten by anything at all, so its target is one.
 */
export function targetToBeat(best: number | null): number {
  return best == null ? 1 : best + 1;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** A record older than this is an old debt, and the wall says so. */
export const STALE_RECORD_DAYS = 60;

/** The fields the "to beat" rule reads; a `WallEntry` satisfies it. */
export type BeatInput = {
  best: number | null;
  last: number | null;
  seasonBest: number | null;
  recordAt: Date | null;
};

/**
 * Whether a record has aged past being tonight's target: set long ago, and not matched this
 * season. A record first reached ten months ago and equalled last week is still within reach.
 */
export function isOldRecord(entry: BeatInput, now: Date): boolean {
  return (
    entry.recordAt != null &&
    now.getTime() - entry.recordAt.getTime() > STALE_RECORD_DAYS * DAY_MS &&
    (entry.seasonBest == null || entry.best == null || entry.seasonBest < entry.best)
  );
}

/**
 * Roadmap "aBattre": the number that beats the row tonight. A recent record is beaten by one more.
 * An old one is not a target for tonight: its season's best is, or the last result when the season
 * has none. (`GhostLine` reads another rule, parked for M-03.)
 */
export function toBeat(entry: BeatInput, now: Date): number {
  if (entry.best == null) return targetToBeat(null);
  if (!isOldRecord(entry, now)) return targetToBeat(entry.best);
  return targetToBeat(entry.seasonBest ?? entry.last ?? entry.best);
}

/** Sessions meeting the target before the next variation is considered earned. */
export const PROGRESSION_SESSIONS_REQUIRED = 3;

/**
 * How many of the most recent sessions in a row met their target, capped at what a rung asks for.
 *
 * The run at the head, not a count: `[hit, miss, hit]` used to read as 2, and "1 more time" was
 * then a lie, because one more clean session makes `[hit, hit, miss]`, still not earned.
 */
export function streakOf(flags: readonly boolean[]): number {
  const miss = flags.indexOf(false);
  return Math.min(miss === -1 ? flags.length : miss, PROGRESSION_SESSIONS_REQUIRED);
}

/**
 * Roadmap "positionSurVoie": where a rung leads, the index in `chain` the hero stands at.
 * Recency still decides what opens *upwards* (`getNextProgression`, the victory screen). It no
 * longer decides the floor: under the old rule, a hero who climbed to push-ups and stopped doing
 * wall push-ups was sent back to the wall eight weeks later (exercise sheet audit, 2026-09-15).
 *
 * The one reader of "where does the hero stand", shared by `getChainTo` and `currentRungFor` so
 * the path card and the quest slot can never disagree.
 *
 * ponytail: one clean session on a rung puts everything below it behind the hero. "Clean" is
 * measured against what the app prescribed since `0070` (`setMetSql`), so a lowered target no
 * longer buys it. A hero's own quest still sets its own bar: tighten that if rungs get skipped.
 */
export function ladderPosition(
  chain: readonly number[],
  everEarned: ReadonlySet<number>,
  recentFlags: ReadonlyMap<number, boolean[]>,
): number {
  let behind = 0;
  chain.forEach((id, index) => {
    if (everEarned.has(id)) behind = index + 1;
    else if (recentFlags.get(id)?.some(Boolean)) behind = Math.max(behind, index);
  });
  return behind;
}
