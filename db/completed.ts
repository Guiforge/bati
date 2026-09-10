import {
  addDays,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { and, count, countDistinct, desc, eq, gte, ne, sql, sum } from "drizzle-orm";
import { reportError } from "@/src/reportError";
import { db, schema, type TransactionTx, transactionOrFallback } from "./client";
import { dayKey } from "./dates";
import type { Exercise } from "./exercises";
import { isMuscleCode } from "./muscles";
import { getDeviceId } from "./preferences";
import { clearCached, setCached } from "./queryCache";
import type {
  DifficultyCode,
  ExerciseStyle,
  FeedbackCode,
  Locomotion,
  MuscleCode,
  QuestTargetType,
} from "./schema";
import { uuidv7 } from "./uuid";
import { repEquivalentSql } from "./workUnits";

const { completedExercises, completedQuest, exerciseMuscles, exercises, quests } = schema;

export type CompletedExerciseInput = {
  exerciseId: number;
  roundIndex?: number;
  sortOrder: number;

  result: { type: QuestTargetType; value: number };
  target?: { type: QuestTargetType; value: number };

  notes?: string;
  performedAt?: Date;

  /**
   * What this set cost, captured when it was done. In memory only — there is no column, and
   * `createCompletedSession` ignores it.
   *
   * XP prices a set by the movement's tempo and difficulty, and `toXpSets` used to re-read those
   * off the quest slot at save time. That is fine until a slot can change mid-session: swapping to
   * a `hard` movement on the last round would re-price every set already logged, inflating the
   * whole workout. The price belongs to the moment, like `target` beside it.
   */
  pricing?: { secondsPerRep: number; difficulty: DifficultyCode; style: ExerciseStyle };
};

export type CompletedSessionInput = {
  /**
   * The name this session already had before it was saved.
   *
   * Minted at `startSession` rather than here, because an expedition writes its GPS points while
   * it is still running and needs something to key them on long before a row exists. Omitted, a
   * uuid is minted below as it always was — every caller that does not track a live session is
   * unchanged.
   */
  uuid?: string;
  /**
   * Ground this session credited, in metres, from the reducer rather than from a raw sum of
   * fixes. Omitted by every caller that is not an outing.
   */
  leaguesM?: number | null;
  /**
   * Moving seconds this outing credited, from the same reading as `leaguesM`. Omitted by every
   * caller that is not an outing.
   */
  movingSeconds?: number | null;
  /**
   * Which kind of session this was (`0049`). Undefined and null both mean a workout, which is
   * what the column says and what every caller that is not an outing leaves it at.
   *
   * The one rule that decides it is `isOutingQuest` (`db/expeditions.ts`), the strict one, read
   * by the caller because only the caller still has the quest. Every aggregate that means
   * *training* filters on the column rather than joining back to the movements.
   */
  outing?: Locomotion | null;
  questId?: number | null;
  userLevel?: DifficultyCode;
  durationSeconds?: number | null;
  xpEarned?: number;
  notes?: string;
  feedback?: FeedbackCode | null;
  performedAt?: Date;

  exercises: CompletedExerciseInput[];
};

export type CompletedExercise = {
  id: number;
  roundIndex: number;
  sortOrder: number;
  result: { type: QuestTargetType; value: number };
  target?: { type: QuestTargetType; value: number };
  notes: string;
  performedAt: Date;
  exercise: Exercise;
};

export type CompletedSession = {
  id: number;
  /**
   * The name this session was given at `startSession`, and the key its GPS points are written
   * under — `gps_points.session_id` is this string, not the integer `id`. Null for every row
   * logged before 0038 backfilled the column.
   */
  uuid: string | null;
  questId: number | null;
  userLevel: DifficultyCode;
  durationSeconds: number | null;
  xpEarned: number;
  notes: string;
  feedback: FeedbackCode | null;
  performedAt: Date;
  exercises: CompletedExercise[];
};

function parseExerciseStyle(value: unknown): ExerciseStyle {
  return value === "strength" || value === "calisthenics" || value === "yoga" || value === "cardio"
    ? value
    : "strength";
}

export async function createCompletedSession(input: CompletedSessionInput): Promise<number> {
  if (input.exercises.length === 0) throw new Error("A completed session must have exercises");

  // Read *before* the transaction, never inside it: on this install's first save `getDeviceId`
  // writes `user_preferences` through `db`, and reaching for `db` from inside an open
  // `db.transaction` is the nesting `serializeOnDatabase` warns about (db/client.ts) — the inner
  // call would wait on the queue entry that is waiting on it.
  //
  // And never a reason to fail: this is provenance nothing reads back, the column is nullable,
  // and NULL already means "unknown" for every row logged before 0038. A workout the hero cannot
  // re-enter must not be lost over the name of the phone that logged it.
  const originDevice = await getDeviceId().catch((e) => {
    reportError("session.originDevice", e);
    return null;
  });

  // Resolved once, then it names the row: `uuid` and `tzOffsetMin` both describe *this instant*,
  // and the schema's `$defaultFn` cannot see it — it would stamp the save instead. The session
  // starts before it is saved (stores/session.ts passes `startTime`), so those are different
  // clocks and different days, and 0038 backfilled the older half from `performedAt`.
  const performedAt = input.performedAt ?? new Date();

  return transactionOrFallback(async (tx) => {
    const inserted = await tx
      .insert(completedQuest)
      .values({
        questId: input.questId ?? null,
        userLevel: input.userLevel ?? "medium",
        durationSeconds: input.durationSeconds ?? null,
        xpEarned: Math.max(0, Math.round(input.xpEarned ?? 0)),
        notes: input.notes ?? "",
        feedback: input.feedback ?? null,
        performedAt,
        uuid: input.uuid ?? uuidv7(performedAt.getTime()),
        leaguesM: input.leaguesM ?? null,
        movingSeconds: input.movingSeconds ?? null,
        outing: input.outing ?? null,
        tzOffsetMin: 0 - performedAt.getTimezoneOffset(),
        originDevice,
      })
      .returning({ id: completedQuest.id });

    let sessionId = inserted[0]?.id;

    // Fallback if RETURNING isn't available on some SQLite builds.
    if (sessionId == null) {
      const last = await tx
        .select({ id: completedQuest.id })
        .from(completedQuest)
        .orderBy(desc(completedQuest.id))
        .limit(1);
      sessionId = last[0]?.id;
    }

    if (sessionId == null) throw new Error("Failed to create completed session");

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Exercise data validation and transformation with multiple null checks
    const rowsToInsert = input.exercises.map((ex) => {
      const roundIndexRaw = ex.roundIndex;
      const sortOrderRaw = ex.sortOrder;
      const resultValueRaw = ex.result.value;
      const targetValueRaw = ex.target?.value;

      // SQLite CHECK constraints (see drizzle/0006_add_completed_history.sql):
      // roundIndex >= 0, sortOrder >= 0, resultValue > 0, and (targetValue is null OR > 0).
      const roundIndex =
        typeof roundIndexRaw === "number" && Number.isFinite(roundIndexRaw)
          ? Math.max(0, Math.floor(roundIndexRaw))
          : 0;
      const sortOrder =
        typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw)
          ? Math.max(0, Math.floor(sortOrderRaw))
          : 0;
      const resultValue =
        typeof resultValueRaw === "number" && Number.isFinite(resultValueRaw)
          ? Math.max(1, Math.floor(resultValueRaw))
          : 1;
      const targetValue =
        targetValueRaw == null
          ? null
          : typeof targetValueRaw === "number" && Number.isFinite(targetValueRaw)
            ? Math.max(1, Math.floor(targetValueRaw))
            : null;

      return {
        sessionId,
        exerciseId: ex.exerciseId,
        roundIndex,
        sortOrder,
        resultType: ex.result.type,
        resultValue,
        targetType: ex.target?.type,
        targetValue,
        notes: ex.notes ?? "",
        performedAt: ex.performedAt ?? input.performedAt ?? new Date(),
      };
    });
    await tx.insert(completedExercises).values(rowsToInsert);

    // Hold targets are now derived from the journal (`generateTarget` reads the hero's longest
    // logged hold), so a cached quest detail goes stale the moment a session lands. Cheap to
    // drop: the cache exists to make a revisit paint instantly, and it refills on the next read.
    clearCached("quest:");

    return sessionId;
  });
}

export async function markSessionWithNewRecords(sessionId: number): Promise<void> {
  await db.update(completedQuest).set({ hasNewRecords: 1 }).where(eq(completedQuest.id, sessionId));
}

/**
 * Add XP to a session already in the journal. Total XP is SUM(xpEarned) over sessions, so
 * bumping the tip-over session's row is how an oath bonus reaches the level with no extra state.
 */
export async function addBonusXpToSession(
  sessionId: number,
  bonusXp: number,
  tx: TransactionTx | typeof db = db,
): Promise<void> {
  await tx
    .update(completedQuest)
    .set({ xpEarned: sql`${completedQuest.xpEarned} + ${bonusXp}` })
    .where(eq(completedQuest.id, sessionId));
}

export async function updateSessionFeedback(
  sessionId: number,
  feedback: FeedbackCode | null,
): Promise<void> {
  await db.update(completedQuest).set({ feedback }).where(eq(completedQuest.id, sessionId));
}

// `uuid` is dropped as well as `exercises`: the list is a scroll of cards, and none of them opens
// a trace. The screen that does re-reads the session by id.
export type CompletedSessionListItem = Omit<CompletedSession, "exercises" | "uuid"> & {
  hasNewRecords: boolean;
  /** Ground covered, in metres, on an outing; null on a workout. */
  leaguesM: number | null;
  /** Moving seconds credited, on an outing; null on a workout and on one saved before 0046. */
  movingSeconds: number | null;
  /** Which kind of session this was (`0049`); null on a workout. */
  outing: Locomotion | null;
};

export async function listCompletedSessions(limit = 20): Promise<CompletedSessionListItem[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      notes: completedQuest.notes,
      feedback: completedQuest.feedback,
      performedAt: completedQuest.performedAt,
      hasNewRecords: completedQuest.hasNewRecords,
      leaguesM: completedQuest.leaguesM,
      movingSeconds: completedQuest.movingSeconds,
      outing: completedQuest.outing,
    })
    .from(completedQuest)
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    xpEarned: r.xpEarned,
    notes: r.notes,
    feedback: (r.feedback as FeedbackCode | null) ?? null,
    performedAt: r.performedAt,
    hasNewRecords: r.hasNewRecords === 1,
    leaguesM: r.leaguesM ?? null,
    movingSeconds: r.movingSeconds ?? null,
    outing: r.outing ?? null,
  }));
}

/**
 * Session totals as one aggregate query — achievements used to load 1000 rows and reduce
 * in JS to get these three numbers.
 */
export async function getSessionAggregates(): Promise<{
  totalSessions: number;
  totalXp: number;
  uniqueQuests: number;
}> {
  const [row] = await db
    .select({
      totalSessions: count(),
      totalXp: sum(completedQuest.xpEarned),
      // countDistinct skips NULL questIds, matching the old filter(s => s.questId).
      uniqueQuests: countDistinct(completedQuest.questId),
    })
    .from(completedQuest)
    .where(isWorkout());

  return {
    totalSessions: Number(row?.totalSessions ?? 0),
    totalXp: Number(row?.totalXp ?? 0),
    uniqueQuests: Number(row?.uniqueQuests ?? 0),
  };
}

/**
 * The two questions a query can ask about a row now that a session says which kind it is, and
 * the difference between them is the whole reason there are two.
 *
 * `isWorkout` means **training**. It is what "average duration", "longest session", "most XP",
 * the calendar dots, the weekly trends and the overtraining warning are about, and a walk is not
 * one of them: a tester's six-hour hike put his average training duration at 77 minutes and took
 * the longest-session record for good.
 *
 * `countsAsSession` means **you showed up**. The flame and the oaths ask this one, and a walk of
 * ten minutes or more is a yes — the flame is about consistency, not about barbells. Ten minutes
 * of *moving*; a walk that never left the doorstep is a logged session and not an appearance.
 * Both oath metrics use it, so a hero who walks daily cannot watch `weekly_sessions` tick while
 * `sessions` stands still on the same screen.
 *
 * Functions, not constants: this module destructures `schema` at import and a score of suites
 * mock it as `{}`, so reading a column at module scope throws before a test runs. Same reason
 * `exerciseColumns` is a function (`db/exercises.ts`).
 *
 * Parenthesised, and that is not cosmetic: drizzle's `and()` does not bracket its operands and
 * SQLite binds `AND` tighter than `OR`, so an unwrapped `countsAsSession` composed inside
 * `countQualifyingWeeks` would read as `(performedAt >= ? AND outing IS NULL) OR moving >= 600`
 * and pull every outing ever logged into one oath's weekly count.
 */
export const isWorkout = () => sql`(${completedQuest.outing} IS NULL)`;

/**
 * How long a walk has to be before it counts as having shown up.
 *
 * The app already refuses to bank a session under two minutes (`TRIVIAL_SESSION_SECONDS`,
 * `components/session/VictoryView.tsx`), which is the right floor for a workout and far too low
 * for a walk: two minutes on the road is walking to the car. Ten is a walk.
 */
const OUTING_COUNTS_AFTER_SECONDS = 10 * 60;

/** Ten minutes on the road, or any workout at all. See `isWorkout` above. */
export const countsAsSession = () =>
  sql`(${completedQuest.outing} IS NULL
    OR COALESCE(${completedQuest.movingSeconds}, ${completedQuest.durationSeconds}) >= ${OUTING_COUNTS_AFTER_SECONDS})`;

/**
 * The start of today where the hero is standing.
 *
 * In JS, never `strftime('%s','now','start of day')`, which is UTC: for anyone east or west of
 * Greenwich that names a boundary hours from their midnight, and midnight-in-the-wrong-timezone
 * is the bug `db/dates.ts` exists to end. Same rule as `dayKey`, one line rather than an import
 * of a second one.
 */
function startOfLocalDay(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Seconds of ground the day's earlier outings already credited — what the outing decay is
 * measured against (`creditedOutingSeconds`, `db/xp.ts`).
 *
 * `COALESCE(movingSeconds, durationSeconds)` because an outing with no GPS fix has no moving
 * time and still happened; `sessionClock` has already bounded its clock at four hours.
 *
 * `excludeSessionId` is not an optimisation. `saveSession` recomputes XP from the top on a retry
 * and `ensureSessionRow` hands back the row the first attempt wrote, so without it a retried
 * outing counts as its own predecessor and pays the second band for the first band's work.
 *
 * `performedAt` is the session's *start*, so a walk begun at 23:58 is counted against the day it
 * set out on. ponytail: one seam a night, and crossing it deliberately pays twice; attributing
 * seconds to the day they actually happened means cutting the trace, which is a bigger change
 * than the hole is worth.
 */
export async function outingSecondsToday(excludeSessionId: number | null): Promise<number> {
  const [row] = await db
    .select({
      seconds: sum(
        sql`COALESCE(${completedQuest.movingSeconds}, ${completedQuest.durationSeconds})`,
      ),
    })
    .from(completedQuest)
    .where(
      and(
        sql`${completedQuest.outing} IS NOT NULL`,
        gte(completedQuest.performedAt, startOfLocalDay()),
        excludeSessionId === null ? undefined : ne(completedQuest.id, excludeSessionId),
      ),
    );

  return Number(row?.seconds ?? 0);
}

/**
 * Whether today's suggested quest has already been logged today.
 *
 * `isDailyQuest` only asks whether an id is the one the day picked, so without this the same
 * quest run three times paid the bonus three times. Once a day is what the bonus is for: it
 * rewards having done what the game proposed, not having done it repeatedly.
 *
 * `excludeSessionId` for the same reason as `outingSecondsToday`: a retry finds the row the
 * first attempt wrote and would otherwise decide the bonus had already been paid.
 */
export async function hasSessionForQuestToday(
  questId: number,
  excludeSessionId: number | null,
): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(completedQuest)
    .where(
      and(
        eq(completedQuest.questId, questId),
        gte(completedQuest.performedAt, startOfLocalDay()),
        excludeSessionId === null ? undefined : ne(completedQuest.id, excludeSessionId),
      ),
    );

  return Number(row?.n ?? 0) > 0;
}

/**
 * Distinct workout day keys, one column instead of the whole session list — the calendar
 * only needs "was there a workout that day".
 */
export async function listWorkoutDayKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ performedAt: completedQuest.performedAt })
    .from(completedQuest)
    .where(isWorkout());
  const days = new Set<string>();
  for (const r of rows) days.add(dayKey(r.performedAt));
  return days;
}

export async function getCompletedSessionById(id: number): Promise<CompletedSession | null> {
  const rows = await db
    .select({
      sessionId: completedQuest.id,
      sessionUuid: completedQuest.uuid,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      sessionNotes: completedQuest.notes,
      sessionFeedback: completedQuest.feedback,
      sessionPerformedAt: completedQuest.performedAt,

      cexId: completedExercises.id,
      roundIndex: completedExercises.roundIndex,
      sortOrder: completedExercises.sortOrder,
      resultType: completedExercises.resultType,
      resultValue: completedExercises.resultValue,
      targetType: completedExercises.targetType,
      targetValue: completedExercises.targetValue,
      cexNotes: completedExercises.notes,
      cexPerformedAt: completedExercises.performedAt,

      exId: exercises.id,
      exEnName: exercises.enName,
      exFrName: exercises.frName,
      exEnDescription: exercises.enDescription,
      exFrDescription: exercises.frDescription,
      exImagePath: exercises.imagePath,
      exCreator: exercises.creator,
      exDifficulty: exercises.difficulty,
      exEquipment: exercises.equipment,
      exSecondsPerRep: exercises.secondsPerRep,
      exPattern: exercises.pattern,
      exMeasure: exercises.measure,
      exLocomotion: exercises.locomotion,
      exPrerequisiteId: exercises.prerequisiteExerciseId,
      exRetiredAt: exercises.retiredAt,
      exStyle: exercises.style,

      muscle: exerciseMuscles.muscle,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(completedQuest.id, id))
    .orderBy(completedExercises.roundIndex, completedExercises.sortOrder, completedExercises.id);

  const first = rows[0];
  if (!first) return null;
  const session: CompletedSession = {
    id: first.sessionId,
    uuid: first.sessionUuid,
    questId: first.questId ?? null,
    userLevel: first.userLevel,
    durationSeconds: first.durationSeconds ?? null,
    xpEarned: first.xpEarned,
    notes: first.sessionNotes,
    feedback: (first.sessionFeedback as FeedbackCode | null) ?? null,
    performedAt: first.sessionPerformedAt,
    exercises: [],
  };

  const byCompletedExercise = new Map<number, CompletedExercise>();

  for (const r of rows) {
    const existing = byCompletedExercise.get(r.cexId);
    const cex: CompletedExercise =
      existing ??
      ({
        id: r.cexId,
        roundIndex: r.roundIndex,
        sortOrder: r.sortOrder,
        result: { type: r.resultType, value: r.resultValue },
        target:
          r.targetType && r.targetValue != null
            ? { type: r.targetType, value: r.targetValue }
            : undefined,
        notes: r.cexNotes,
        performedAt: r.cexPerformedAt,
        exercise: {
          id: r.exId,
          enName: r.exEnName,
          frName: r.exFrName,
          enDescription: r.exEnDescription,
          frDescription: r.exFrDescription,
          imagePath: r.exImagePath,
          creator: r.exCreator,
          difficulty: r.exDifficulty,
          equipment: r.exEquipment,
          secondsPerRep: r.exSecondsPerRep,
          pattern: r.exPattern ?? null,
          measure: r.exMeasure,
          locomotion: r.exLocomotion,
          prerequisiteExerciseId: r.exPrerequisiteId,
          retiredAt: r.exRetiredAt,
          style: parseExerciseStyle(r.exStyle),
          muscles: [],
        },
      } satisfies CompletedExercise);

    if (!existing) {
      byCompletedExercise.set(r.cexId, cex);
      session.exercises.push(cex);
    }

    if (isMuscleCode(r.muscle) && !cex.exercise.muscles.includes(r.muscle)) {
      cex.exercise.muscles.push(r.muscle);
    }
  }

  setCached(`session:${id}`, session);
  return session;
}

export type SessionSummary = {
  id: number;
  questId: number | null;
  userLevel: DifficultyCode;
  durationSeconds: number | null;
  performedAt: Date;
  feedback: FeedbackCode | null;
};

/**
 * Get a quest's most recent sessions, returned oldest-first so a chart reads left to right.
 *
 * The limit has to bite the old end, which is why the query sorts descending and the result is
 * reversed: sorting ascending and limiting returns the *first* n sessions a hero ever banked,
 * frozen there forever once they pass n.
 */
export async function getQuestSessionHistory(
  questId: number,
  limit = 30,
): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
      feedback: completedQuest.feedback,
    })
    .from(completedQuest)
    .where(eq(completedQuest.questId, questId))
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(limit);

  return rows.reverse().map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    performedAt: r.performedAt,
    feedback: r.feedback,
  }));
}

/**
 * The most recent sessions across all quests, returned oldest-first so a chart reads left to
 * right. Same descending-then-reverse reason as `getQuestSessionHistory` above.
 */
export async function getRecentSessionHistory(limit = 30): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: completedQuest.id,
      questId: completedQuest.questId,
      userLevel: completedQuest.userLevel,
      durationSeconds: completedQuest.durationSeconds,
      performedAt: completedQuest.performedAt,
      feedback: completedQuest.feedback,
    })
    .from(completedQuest)
    .where(isWorkout())
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(limit);

  return rows.reverse().map((r) => ({
    id: r.id,
    questId: r.questId ?? null,
    userLevel: r.userLevel,
    durationSeconds: r.durationSeconds ?? null,
    performedAt: r.performedAt,
    feedback: r.feedback,
  }));
}

export type ContributingSession = {
  sessionId: number;
  performedAt: Date;
  volume: number;
  /** Null for a session whose quest was deleted, or that was never linked to one. */
  enTitle: string | null;
  frTitle: string | null;
};

/**
 * The last sessions that fed a muscle (or a training style) and how much work each one
 * contributed — the "here is what raised this building" line in the village detail sheet.
 * Same join chain and same work-unit definition as computeMuscleBalance in db/muscleBalance.ts.
 */
export async function getRecentContributingSessions(
  filter: { muscle: MuscleCode } | { style: ExerciseStyle },
  limit = 3,
): Promise<ContributingSession[]> {
  const volume = sql<number>`coalesce(sum(${repEquivalentSql(completedExercises.resultValue, completedExercises.resultType, exercises.style)}), 0)`;

  const base = db
    .select({
      sessionId: completedQuest.id,
      performedAt: completedQuest.performedAt,
      volume,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    // Left, not inner: a session whose quest was later deleted (questId set null) is still a
    // real contribution, just with no title to show — dropping the row would undercount volume.
    .leftJoin(quests, eq(quests.id, completedQuest.questId));

  // One exerciseMuscles row per muscle an exercise trains, so filtering on the muscle here
  // counts that exercise once — joining without the filter would multiply the volume.
  const rows = await ("muscle" in filter
    ? base
        .innerJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
        .where(eq(exerciseMuscles.muscle, filter.muscle))
    : base.where(eq(exercises.style, filter.style))
  )
    .groupBy(completedQuest.id)
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(limit);

  return rows.map((r) => ({
    sessionId: r.sessionId,
    performedAt: r.performedAt,
    volume: Number(r.volume),
    enTitle: r.enTitle,
    frTitle: r.frTitle,
  }));
}

// ------------------------------------------------------------
// Historical Trends
// ------------------------------------------------------------

/**
 * ISO week-numbering year + ISO week, so the key sorts chronologically across a new year.
 * `yyyy-'W'ww` mixed the calendar year with the local week number and stamped Monday
 * 2025-12-29 as "2025-W01" — a key that sorts *before* "2025-W52", which put the bars in the
 * wrong order and made "this week vs last week" compare the wrong two weeks every January.
 */
const WEEK_KEY_FORMAT = "RRRR-'W'II";

export type WeeklyTrend = {
  weekKey: string; // ISO week format "2026-W01"
  weekStart: Date;
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
};

export type MonthlyTrend = {
  monthKey: string; // Format "2026-01"
  monthStart: Date;
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
};

export type TrendAnalysis = {
  currentPeriod: number;
  previousPeriod: number;
  change: number; // percentage change
  trend: "up" | "down" | "stable";
};

function selectTrendRows(cutoff: Date) {
  return db
    .select({
      id: completedQuest.id,
      durationSeconds: completedQuest.durationSeconds,
      xpEarned: completedQuest.xpEarned,
      performedAt: completedQuest.performedAt,
    })
    .from(completedQuest)
    .where(and(gte(completedQuest.performedAt, cutoff), isWorkout()));
}

/**
 * Get weekly trends for the past N weeks.
 *
 * Every week in the window is returned, including the empty ones. Only weeks that held a
 * session used to come back, which made a blank week invisible on the chart and — worse — let
 * `getTrendSummary` pick the last two *rows* as "this week" and "last week". After a fortnight
 * off, the badge cheerfully compared two month-old weeks and reported no change.
 */
export async function getWeeklyTrends(weeks = 12): Promise<WeeklyTrend[]> {
  const now = new Date();
  const cutoff = startOfWeek(subWeeks(now, weeks - 1), { weekStartsOn: 1 });

  const byWeek = new Map<string, WeeklyTrend>();
  for (const weekStart of eachWeekOfInterval({ start: cutoff, end: now }, { weekStartsOn: 1 })) {
    byWeek.set(format(weekStart, WEEK_KEY_FORMAT), {
      weekKey: format(weekStart, WEEK_KEY_FORMAT),
      weekStart,
      sessionCount: 0,
      totalMinutes: 0,
      totalXp: 0,
    });
  }

  for (const row of await selectTrendRows(cutoff)) {
    const week = byWeek.get(
      format(startOfWeek(row.performedAt, { weekStartsOn: 1 }), WEEK_KEY_FORMAT),
    );
    if (!week) continue; // A row from beyond the window's edge; the query is inclusive of it.

    week.sessionCount += 1;
    week.totalMinutes += Math.round((row.durationSeconds ?? 0) / 60);
    week.totalXp += row.xpEarned ?? 0;
  }

  return Array.from(byWeek.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

/**
 * Get monthly trends for the past N months. Empty months are included, same reason as weeks.
 */
export async function getMonthlyTrends(months = 6): Promise<MonthlyTrend[]> {
  const now = new Date();
  const cutoff = startOfMonth(subMonths(now, months - 1));

  const byMonth = new Map<string, MonthlyTrend>();
  for (const monthStart of eachMonthOfInterval({ start: cutoff, end: now })) {
    byMonth.set(format(monthStart, "yyyy-MM"), {
      monthKey: format(monthStart, "yyyy-MM"),
      monthStart,
      sessionCount: 0,
      totalMinutes: 0,
      totalXp: 0,
    });
  }

  for (const row of await selectTrendRows(cutoff)) {
    const month = byMonth.get(format(startOfMonth(row.performedAt), "yyyy-MM"));
    if (!month) continue;

    month.sessionCount += 1;
    month.totalMinutes += Math.round((row.durationSeconds ?? 0) / 60);
    month.totalXp += row.xpEarned ?? 0;
  }

  return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

/**
 * Analyze trend between current and previous period
 */
export function analyzeTrend(current: number, previous: number): TrendAnalysis {
  if (previous === 0) {
    return {
      currentPeriod: current,
      previousPeriod: previous,
      change: current > 0 ? 100 : 0,
      trend: current > 0 ? "up" : "stable",
    };
  }

  const change = Math.round(((current - previous) / previous) * 100);

  let trend: "up" | "down" | "stable" = "stable";
  if (change > 5) trend = "up";
  else if (change < -5) trend = "down";

  return {
    currentPeriod: current,
    previousPeriod: previous,
    change,
    trend,
  };
}

/**
 * Trailing 7-day totals vs the 7 days before — the flame's own window (db/streaks.ts),
 * so the trend badges never punish a calendar week that just started.
 *
 * Buckets by local calendar day via `dayKey`, the same unit db/streaks.ts's `countInWindow`
 * counts in — not raw wall-clock milliseconds. `db/dates.ts`'s docstring is scar tissue from
 * widgets disagreeing about what "today" means; bucketing by day here (instead of `now.getTime()
 * - 7 * DAY`) is what keeps this window and the flame's window agreeing at every hour of the day,
 * not just at midnight.
 */
export function rollingWeekTotals(
  sessions: { performedAt: Date; durationSeconds: number; xp: number }[],
  now: Date = new Date(),
): {
  current: { sessions: number; minutes: number; xp: number };
  previous: { sessions: number; minutes: number; xp: number };
} {
  // today, today-1, … today-6 vs today-7, today-8, … today-13 — contiguous, non-overlapping,
  // same split as db/streaks.ts's isLit (countInWindow(day, 7) then countInWindow(day-7, 7)).
  const currentDays = new Set<string>();
  const previousDays = new Set<string>();
  for (let i = 0; i < 7; i++) {
    currentDays.add(dayKey(addDays(now, -i)));
    previousDays.add(dayKey(addDays(now, -7 - i)));
  }

  const current = { sessions: 0, minutes: 0, xp: 0 };
  const previous = { sessions: 0, minutes: 0, xp: 0 };
  for (const s of sessions) {
    const key = dayKey(s.performedAt);
    const bucket = currentDays.has(key) ? current : previousDays.has(key) ? previous : null;
    if (!bucket) continue;
    bucket.sessions += 1;
    bucket.minutes += Math.round(s.durationSeconds / 60);
    bucket.xp += s.xp;
  }
  return { current, previous };
}

/**
 * Get comprehensive trend summary
 */
export async function getTrendSummary(): Promise<{
  weeklyTrends: WeeklyTrend[];
  monthlyTrends: MonthlyTrend[];
  sessionsAnalysis: TrendAnalysis;
  minutesAnalysis: TrendAnalysis;
  xpAnalysis: TrendAnalysis;
}> {
  const weeklyTrends = await getWeeklyTrends(8);
  const monthlyTrends = await getMonthlyTrends(6);

  // Rolling 7-day windows for the badges — see rollingWeekTotals. The charts above keep their
  // calendar buckets; only these three analyzeTrend inputs change.
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recentRows = await selectTrendRows(fourteenDaysAgo);
  const { current, previous } = rollingWeekTotals(
    recentRows.map((row) => ({
      performedAt: row.performedAt,
      durationSeconds: row.durationSeconds ?? 0,
      xp: row.xpEarned ?? 0,
    })),
    now,
  );

  const sessionsAnalysis = analyzeTrend(current.sessions, previous.sessions);
  const minutesAnalysis = analyzeTrend(current.minutes, previous.minutes);
  const xpAnalysis = analyzeTrend(current.xp, previous.xp);

  return {
    weeklyTrends,
    monthlyTrends,
    sessionsAnalysis,
    minutesAnalysis,
    xpAnalysis,
  };
}
