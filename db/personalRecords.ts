import { and, desc, eq, inArray, max, ne, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { isWorkout } from "./completed";
import { hasGround } from "./expeditions";
import { totalLeaguesM } from "./gps";
import type { QuestTargetType } from "./schema";
import { NON_REP_STYLE } from "./workUnits";

const { completedQuest, completedExercises, exercises } = schema;

/**
 * Personal Record types
 */
export type RecordType =
  | "longest_session" // Longest workout duration
  | "most_xp" // Most XP in a single session
  | "highest_streak" // Highest streak achieved
  | "exercise_max_reps" // Most reps for a specific exercise
  | "exercise_max_time" // Longest hold/time for a specific exercise
  | "longest_outing"; // Most ground covered in one outing, metres

export type PersonalRecord = {
  type: RecordType;
  value: number;
  achievedAt: Date;
  exerciseId?: number; // For exercise-specific records
  exerciseName?: { en: string; fr: string }; // For display
  sessionId?: number; // Reference to the session
};

export type NewRecordResult = {
  isNewRecord: boolean;
  recordType: RecordType;
  newValue: number;
  previousValue: number | null;
  exerciseId?: number;
  exerciseName?: { en: string; fr: string };
};

/**
 * Get the longest session ever completed
 */
export async function getLongestSession(): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(isWorkout())
    .orderBy(desc(completedQuest.durationSeconds))
    .limit(1);

  const best = rows[0];
  if (best?.durationSeconds == null) {
    return null;
  }

  return {
    type: "longest_session",
    value: best.durationSeconds,
    achievedAt: best.performedAt,
    sessionId: best.id,
  };
}

/**
 * The most ground in one outing. `leaguesM` is what the reducer credited at save (never a sum
 * over `gps_points`), so this record and the road agree on every metre.
 */
export async function getLongestOuting(): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      id: completedQuest.id,
      leaguesM: completedQuest.leaguesM,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(sql`${completedQuest.leaguesM} IS NOT NULL`)
    .orderBy(desc(completedQuest.leaguesM))
    .limit(1);

  const best = rows[0];
  if (!best || !hasGround(best)) return null;

  return {
    type: "longest_outing",
    value: best.leaguesM,
    achievedAt: best.performedAt,
    sessionId: best.id,
  };
}

/**
 * Get the session with most XP earned
 */
export async function getMostXpSession(): Promise<PersonalRecord | null> {
  const rows = await db
    .select({
      id: completedQuest.id,
      xpEarned: completedQuest.xpEarned,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(isWorkout())
    .orderBy(desc(completedQuest.xpEarned))
    .limit(1);

  const best = rows[0];
  if (best?.xpEarned == null) {
    return null;
  }

  return {
    type: "most_xp",
    value: best.xpEarned,
    achievedAt: best.performedAt,
    sessionId: best.id,
  };
}

/**
 * What the hero has already done on a movement, in that movement's own unit.
 *
 * `last` is the best set of the most recent session, not its last row: a 12/10/8 quest would
 * otherwise report 8 as the thing to beat — a floor the hero cleared twice on the way down. It is
 * the rule `checkForNewRecords` already applies below, so "what to beat" and "what the app
 * celebrates" name the same number.
 *
 * ponytail: the session's best set, not the same round's. Matching `roundIndex` would compare
 * round 3 against last time's round 3, which is truer and doubles the fold; do it if anyone
 * reports the round-1 number feeling unreachable.
 */
/** `at` is when the *last* set was logged, in ms — the best's own date is not tracked. */
export type ExerciseGhost = { last: number; best: number; at: number };

/**
 * Reps and seconds share `resultValue` and nothing in the column says which one it holds, so a
 * 60 s hold pooled with rep sets reports itself as a rep record. The unit rides in the key —
 * same composite `checkForNewRecords` folds on.
 */
export function ghostKey(exerciseId: number, type: QuestTargetType): string {
  return `${exerciseId}:${type}`;
}

type SessionBest = ExerciseGhost & { at: number; sessionId: number };

/**
 * Two sessions finished in the same second share a timestamp, so the timestamp alone would leave
 * "last time" up to row order. The id breaks the tie.
 */
function isNewerSession(a: SessionBest, b: SessionBest): boolean {
  return a.at > b.at || (a.at === b.at && a.sessionId > b.sessionId);
}

/**
 * The journal's answer for a batch of movements, in one query.
 *
 * Opening a quest needs this for every exercise in it, and each read is a synchronous SQLite call
 * on the JS thread — duplicates are paid in dropped frames (same reasoning as `shortLivedQuery`).
 * Movements with nothing logged are simply absent from the map.
 *
 * Grouping by session first is what makes `last` mean "the best set of that evening": the two
 * aggregates are independent on purpose, `best` being the session's best value and `at` its last
 * set's time.
 */
export async function getExerciseHistory(
  exerciseIds: number[],
): Promise<Map<string, ExerciseGhost>> {
  if (exerciseIds.length === 0) return new Map();

  const rows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      resultType: completedExercises.resultType,
      sessionId: completedExercises.sessionId,
      best: max(completedExercises.resultValue),
      at: max(completedExercises.performedAt),
    })
    .from(completedExercises)
    .where(inArray(completedExercises.exerciseId, exerciseIds))
    .groupBy(
      completedExercises.exerciseId,
      completedExercises.resultType,
      completedExercises.sessionId,
    );

  const byKey = new Map<string, SessionBest>();

  for (const r of rows) {
    if (r.best == null || r.best <= 0) continue;

    // An aggregate does not go through the column's timestamp mapper on every driver, so accept
    // both shapes rather than trusting one.
    const at = r.at instanceof Date ? r.at.getTime() : Number(r.at ?? 0);
    const row: SessionBest = { last: r.best, best: r.best, at, sessionId: r.sessionId };
    const key = ghostKey(r.exerciseId, r.resultType);
    const entry = byKey.get(key);

    if (!entry) {
      byKey.set(key, row);
      continue;
    }

    entry.best = Math.max(entry.best, row.best);

    if (isNewerSession(row, entry)) {
      entry.last = row.last;
      entry.at = row.at;
      entry.sessionId = row.sessionId;
    }
  }

  return new Map([...byKey].map(([key, v]) => [key, { last: v.last, best: v.best, at: v.at }]));
}

/** One movement's standing best, and what the hero last did on it. */
export type MovementRecord = {
  exerciseId: number;
  enName: string;
  frName: string;
  /** Reps and seconds are different records on the same movement, so the unit is part of one. */
  type: QuestTargetType;
  best: number;
  last: number;
  /** When the last set was logged. The best's own date is not tracked. */
  at: Date;
};

/**
 * The movements with something to beat, most recently trained first.
 *
 * The six records this file computed before this were all about a *session*: its length, its XP,
 * the longest outing. A hero settles those in the first month and they are never beatable again,
 * which is how a journal with three years in it ends up with a records card nobody reads. A
 * movement's best is the opposite: there is one for every movement, it moves, and it names
 * something to do tomorrow.
 *
 * Two queries rather than one: this picks the movements and their bests, `getExerciseHistory`
 * says what the last session did on each, and it is already the tested answer to that question
 * for the session screen and for a quest about to start. One more grouped read on an indexed
 * column is cheaper than a second implementation of the same fold.
 */
export async function getMovementRecords(limit = 6): Promise<MovementRecord[]> {
  const rows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      type: completedExercises.resultType,
      best: max(completedExercises.resultValue),
      at: max(completedExercises.performedAt),
      enName: exercises.enName,
      frName: exercises.frName,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    // Never an outing. A walk's "record" is the seconds it happened to last, which is not a
    // number anyone set out to beat: it is the same reason the session screen keeps its ghost
    // line off an outing rather than printing "last time 900s" under a panel measuring ground.
    .where(ne(exercises.style, NON_REP_STYLE))
    .groupBy(completedExercises.exerciseId, completedExercises.resultType)
    .orderBy(desc(max(completedExercises.performedAt)))
    .limit(limit);

  const history = await getExerciseHistory(rows.map((r) => r.exerciseId));

  return rows.flatMap((row) => {
    const best = row.best;
    if (best == null || best <= 0) return [];
    const ghost = history.get(ghostKey(row.exerciseId, row.type));
    // An aggregate does not go through the column's timestamp mapper on every driver, the same
    // caveat `getExerciseHistory` documents about its own `max(performedAt)`.
    const at = row.at instanceof Date ? row.at : new Date(Number(row.at ?? 0));
    return [
      {
        exerciseId: row.exerciseId,
        enName: row.enName,
        frName: row.frName,
        type: row.type,
        best,
        last: ghost?.last ?? best,
        at,
      },
    ];
  });
}

/** Where one movement of one session stands against every session that trained it before. */
export type SessionStanding = {
  exerciseId: number;
  exerciseName: { en: string; fr: string };
  /** Reps and seconds are separate records on one movement, so they are separate standings. */
  type: QuestTargetType;
  value: number;
  /** 2 or 3. Rank 1 is a record, and `checkForNewRecords` already owns that moment. */
  rank: number;
  /** Sessions that have trained this movement in this unit, this one included. */
  outOf: number;
  /**
   * Which claim this is. `lifetime` is second or third ever, and rare on purpose. `recent` is the
   * same placing over the last ten sessions on the movement, which is what an ordinary session
   * can actually reach: a hero a year in ranks second of forty about never, and the first run of
   * this on a device showed nothing at all.
   */
  scope: "lifetime" | "recent";
};

/** Below this a standing is arithmetic rather than news. Second and third place, nothing else. */
const STANDING_FLOOR = 3;

/** One session's best on one movement, in one unit. The shape the rank is counted over. */
type SessionBestRow = {
  exerciseId: number;
  type: QuestTargetType;
  sessionId: number;
  best: number | null;
  /** When that session trained it. Aggregates skip the column's mapper on some drivers. */
  at?: Date | number | null;
};

/**
 * How many recent sessions a "your best lately" claim is measured over.
 *
 * The lifetime placing is the rarer, better thing to say, and after a year of training a hero
 * ranks second of forty about never: the first run of this on a device showed nothing at all on
 * an ordinary session, which is the exact failure it was built to fix. Strava's own version of
 * this labels against a *window*, "2nd fastest this year", and that is what makes an ordinary
 * outing produce something.
 *
 * Ten, because it is a month or so of a movement for someone training three times a week: long
 * enough that beating it means something, short enough that it moves.
 */
const RECENT_WINDOW = 10;

/**
 * Where `value` places among the per-session bests in `rows`, for one movement and one unit.
 *
 * A tie counts against you: `>=` rather than `>`, so equalling a past session ranks behind it
 * rather than sharing its place. It is the reading that survives a hero checking the arithmetic,
 * and it is also what keeps rank 1 meaning "a record", which `checkForNewRecords` decides with
 * the same strict comparison.
 */
function placeAmongSessions(
  rows: readonly SessionBestRow[],
  key: string,
  value: number,
  sessionId: number,
): { rank: number; outOf: number; recentRank: number; recentOutOf: number } {
  const mine = rows.filter((row) => row.best != null && ghostKey(row.exerciseId, row.type) === key);

  let ahead = 0;
  for (const row of mine) {
    // Tonight never ranks ahead of itself.
    if (row.sessionId !== sessionId && (row.best ?? 0) >= value) ahead += 1;
  }

  // The same question over the last `RECENT_WINDOW` sessions on this movement, tonight included.
  // An aggregate does not go through the column's timestamp mapper on every driver, the caveat
  // `getExerciseHistory` documents about its own `max(performedAt)`.
  const at = (row: SessionBestRow) =>
    row.at instanceof Date ? row.at.getTime() : Number(row.at ?? 0);
  const recent = [...mine].sort((a, b) => at(b) - at(a) || b.sessionId - a.sessionId);
  const window = recent.slice(0, RECENT_WINDOW);

  let aheadRecently = 0;
  for (const row of window) {
    if (row.sessionId !== sessionId && (row.best ?? 0) >= value) aheadRecently += 1;
  }

  return {
    rank: ahead + 1,
    outOf: mine.length,
    recentRank: aheadRecently + 1,
    recentOutOf: window.length,
  };
}

/**
 * What this session was best at, when it broke nothing.
 *
 * A record is rare by construction: the hero beats a movement's best a handful of times and then
 * the curve flattens, and every session after that pays nothing. So the question this answers is
 * the weaker one Strava's Best Efforts asks of an ordinary run — not "did you win" but "where
 * does this sit" — and a second-best set is a true, dated, beatable result on a night that had
 * none.
 *
 * The rule it has to obey is the same one that makes the six lifetime counters useless: a standing
 * the hero cannot move next week is not worth printing. This one moves every session, in both
 * directions, and names a movement rather than a career.
 *
 * Honesty gates, in order, and `newRecords` is the first of them rather than a caller's business:
 * every one of these is the same judgement about when a placing is worth printing.
 * - a night that set a record has already been paid. A second-best set beside a record is the
 *   clutter, not the reward, and asking the question costs two grouped reads.
 * - rank 1 is not here either. It is a record, or a tie with one, and both belong to
 *   `checkForNewRecords` and the badge that lists it.
 * - `outOf > rank`, so the hero actually beat a past session. Second of two is second of nothing,
 *   and the second session a hero ever logs would otherwise always pay.
 *
 * ponytail: ranks whole sessions, not sets, because that is the granularity `getExerciseHistory`
 * already established for "last time" and the two must agree. Per-set ranking would need the
 * set index the journal does not store.
 */
export async function getSessionStanding(
  sessionId: number,
  newRecords: readonly NewRecordResult[],
): Promise<SessionStanding | null> {
  if (newRecords.length > 0) return null;

  // The session's own best per movement and unit. Multi-round quests write one row per round, so
  // this is the same fold `checkForNewRecords` runs for the same reason.
  const sessionRows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      type: completedExercises.resultType,
      value: max(completedExercises.resultValue),
      enName: exercises.enName,
      frName: exercises.frName,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    // Never an outing, the rule `getMovementRecords` documents above: a walk's seconds are not a
    // number anyone set out to beat.
    .where(and(eq(completedExercises.sessionId, sessionId), ne(exercises.style, NON_REP_STYLE)))
    .groupBy(completedExercises.exerciseId, completedExercises.resultType);

  if (sessionRows.length === 0) return null;

  // Every session's best on those same movements, one grouped read. The fold is in JS because the
  // rank is a count over the rows this already returns, and a correlated subquery per movement
  // would be one synchronous SQLite call each on the JS thread.
  //
  // ponytail: this reads one row per (movement, unit, session), so a hero three years in pays a
  // few thousand rows on the victory screen, after the save and off the set. Move the count into
  // SQL if that ever shows up in a frame.
  const historyRows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      type: completedExercises.resultType,
      sessionId: completedExercises.sessionId,
      best: max(completedExercises.resultValue),
      at: max(completedExercises.performedAt),
    })
    .from(completedExercises)
    .where(
      inArray(
        completedExercises.exerciseId,
        sessionRows.map((r) => r.exerciseId),
      ),
    )
    .groupBy(
      completedExercises.exerciseId,
      completedExercises.resultType,
      completedExercises.sessionId,
    );

  const standings = sessionRows.flatMap((row) => {
    const value = row.value;
    if (value == null || value <= 0) return [];

    const place = placeAmongSessions(
      historyRows,
      ghostKey(row.exerciseId, row.type),
      value,
      sessionId,
    );

    // Lifetime first, because it is the bigger thing to have done. The window is what an ordinary
    // session can reach, and a placing inside it is only worth saying when it is not already the
    // lifetime claim.
    const claim =
      place.rank >= 2 && place.rank <= STANDING_FLOOR && place.outOf > place.rank
        ? { rank: place.rank, outOf: place.outOf, scope: "lifetime" as const }
        : place.recentRank >= 1 &&
            place.recentRank <= STANDING_FLOOR &&
            place.recentOutOf > place.recentRank
          ? { rank: place.recentRank, outOf: place.recentOutOf, scope: "recent" as const }
          : null;
    if (!claim) return [];

    return [
      {
        exerciseId: row.exerciseId,
        exerciseName: { en: row.enName, fr: row.frName },
        type: row.type,
        value,
        ...claim,
      },
    ];
  });

  // Best placing first, and behind that the claim with the most history: "2nd in 30 sessions" is
  // a bigger thing to have done than "2nd in 4", and only one of these reaches the screen.
  // A lifetime claim outranks any window one, then the better placing, then the deeper history:
  // "2nd in 30 sessions" is a bigger thing to have done than "2nd in 4", and only one of these
  // reaches the screen.
  standings.sort(
    (a, b) =>
      Number(b.scope === "lifetime") - Number(a.scope === "lifetime") ||
      a.rank - b.rank ||
      b.outOf - a.outOf,
  );

  return standings[0] ?? null;
}

/**
 * Get all personal records summary
 */
export async function getPersonalRecordsSummary(): Promise<{
  longestSession: PersonalRecord | null;
  mostXp: PersonalRecord | null;
  longestOuting: PersonalRecord | null;
  /** Lifetime ground covered, metres. Zero until the first outing. */
  totalLeaguesM: number;
  totalSessions: number;
}> {
  const [longestSession, mostXp, longestOuting, totalLeagues, countResult] = await Promise.all([
    getLongestSession(),
    getMostXpSession(),
    getLongestOuting(),
    totalLeaguesM(),
    db.select({ count: sql<number>`COUNT(*)` }).from(completedQuest).where(isWorkout()),
  ]);

  return {
    longestSession,
    mostXp,
    longestOuting,
    totalLeaguesM: totalLeagues,
    totalSessions: countResult[0]?.count ?? 0,
  };
}

/**
 * Check if a completed session set any new records.
 * Call this after saving a session to detect PRs.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: PR detection requires comparing current performance against historical bests
export async function checkForNewRecords(sessionId: number): Promise<NewRecordResult[]> {
  const newRecords: NewRecordResult[] = [];

  // Get the session data
  const sessionRows = await db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      leaguesM: completedQuest.leaguesM,
      outing: completedQuest.outing,
    })
    .from(completedQuest)
    .where(eq(completedQuest.id, sessionId))
    .limit(1);

  const session = sessionRows[0];
  if (!session) {
    return newRecords;
  }

  // Check longest session. An outing neither sets this record nor is compared against it: an
  // hour of walking is not a longer workout than forty minutes of training, and until 0049 the
  // journal had no way to say so. "Longest outing", below, is the record a walk can take.
  if (session.durationSeconds != null && session.outing === null) {
    const previousLongest = await db
      .select({
        maxDuration: max(completedQuest.durationSeconds),
      })
      .from(completedQuest)
      .where(and(sql`${completedQuest.id} != ${sessionId}`, isWorkout()));

    const prevMax = previousLongest[0]?.maxDuration ?? 0;
    if (session.durationSeconds > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "longest_session",
        newValue: session.durationSeconds,
        previousValue: prevMax > 0 ? prevMax : null,
      });
    }
  }

  // Check most XP. Same rule and the same reason: this is the trophy `0037` reached backwards
  // to protect, and a walk taking it is the shape that migration was written about.
  if (session.xpEarned != null && session.outing === null) {
    const previousMostXp = await db
      .select({
        maxXp: max(completedQuest.xpEarned),
      })
      .from(completedQuest)
      .where(and(sql`${completedQuest.id} != ${sessionId}`, isWorkout()));

    const prevMax = previousMostXp[0]?.maxXp ?? 0;
    if (session.xpEarned > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "most_xp",
        newValue: session.xpEarned,
        previousValue: prevMax > 0 ? prevMax : null,
      });
    }
  }

  // Check longest outing. Metres, from the reducer's credit; a workout has null here and skips.
  if (hasGround(session)) {
    const previousLongest = await db
      .select({ maxM: max(completedQuest.leaguesM) })
      .from(completedQuest)
      .where(sql`${completedQuest.id} != ${sessionId}`);

    const prevMax = previousLongest[0]?.maxM ?? 0;
    if (session.leaguesM > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: "longest_outing",
        newValue: session.leaguesM,
        previousValue: prevMax > 0 ? prevMax : null,
      });
    }
  }

  // Check exercise PRs. A quest round is per-exercise-per-round, so a multi-round quest
  // has one row per round for the same exercise — keep only the best round here, or the
  // same exercise would be flagged as a new record once per round.
  //
  // Reps and seconds are separate records for the same exercise, never one pooled max: a
  // 60 s hold is not "60 reps", and an exercise trained both ways would have had its rep PR
  // permanently buried under its own hold times.
  const exerciseResultRows = await db
    .select({
      exerciseId: completedExercises.exerciseId,
      resultType: completedExercises.resultType,
      resultValue: completedExercises.resultValue,
      enName: exercises.enName,
      frName: exercises.frName,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    // Never an outing, the rule `getMovementRecords` documents: the journal's badge names what
    // fell, and "Warden's Walk" is not a record anyone set out to break.
    .where(and(eq(completedExercises.sessionId, sessionId), ne(exercises.style, NON_REP_STYLE)));

  const bestByExercise = new Map<string, (typeof exerciseResultRows)[number]>();
  for (const row of exerciseResultRows) {
    const key = `${row.exerciseId}:${row.resultType}`;
    const best = bestByExercise.get(key);
    if (!best || row.resultValue > best.resultValue) {
      bestByExercise.set(key, row);
    }
  }

  for (const result of bestByExercise.values()) {
    // Get previous max for this exercise, in this unit, excluding the current session.
    const previousMax = await db
      .select({
        maxValue: max(completedExercises.resultValue),
      })
      .from(completedExercises)
      .where(
        sql`${completedExercises.exerciseId} = ${result.exerciseId} AND ${completedExercises.resultType} = ${result.resultType} AND ${completedExercises.sessionId} != ${sessionId}`,
      );

    const prevMax = previousMax[0]?.maxValue ?? 0;
    if (result.resultValue > prevMax) {
      newRecords.push({
        isNewRecord: true,
        recordType: result.resultType === "time" ? "exercise_max_time" : "exercise_max_reps",
        newValue: result.resultValue,
        previousValue: prevMax > 0 ? prevMax : null,
        exerciseId: result.exerciseId,
        exerciseName: { en: result.enName, fr: result.frName },
      });
    }
  }

  return newRecords;
}
