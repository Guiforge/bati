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
import { count, countDistinct, desc, eq, gte, sql, sum } from "drizzle-orm";
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
  pricing?: { secondsPerRep: number; difficulty: DifficultyCode };
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

export type CompletedSessionListItem = Omit<CompletedSession, "exercises"> & {
  hasNewRecords: boolean;
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
    .from(completedQuest);

  return {
    totalSessions: Number(row?.totalSessions ?? 0),
    totalXp: Number(row?.totalXp ?? 0),
    uniqueQuests: Number(row?.uniqueQuests ?? 0),
  };
}

/**
 * Distinct workout day keys, one column instead of the whole session list — the calendar
 * only needs "was there a workout that day".
 */
export async function listWorkoutDayKeys(): Promise<Set<string>> {
  const rows = await db.select({ performedAt: completedQuest.performedAt }).from(completedQuest);
  const days = new Set<string>();
  for (const r of rows) days.add(dayKey(r.performedAt));
  return days;
}

export async function getCompletedSessionById(id: number): Promise<CompletedSession | null> {
  const rows = await db
    .select({
      sessionId: completedQuest.id,
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
    .where(gte(completedQuest.performedAt, cutoff));
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
