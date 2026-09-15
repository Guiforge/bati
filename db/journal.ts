import { and, count, desc, eq, gt, gte, inArray, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import type { Localized } from "@/src/i18n/deviceLanguage";
import type { AchievementProgress } from "./achievements";
import { db, schema } from "./client";
import { type CompletedSession, isWorkout, parseRecords, type StoredRecord } from "./completed";
import { dayKey } from "./dates";
import { getNextProgression, type VariationStep } from "./exercises";
import { getMovementRecords } from "./personalRecords";
import { ADMIN_CREATOR, type MuscleCode, type QuestTargetType } from "./schema";
import { NON_REP_STYLE, repEquivalentSql, toRepEquivalent } from "./workUnits";

/**
 * Everything the Journal reads that no other screen does.
 *
 * The Journal was redrawn on 2026-09-15 around one question per block: what to beat tonight,
 * whether the flame holds, what this month did against the last, where the work went. Most of the
 * numbers existed; what did not was their *date* and their *period*, which is what this file adds.
 * Nothing here writes.
 */

const {
  completedQuest,
  completedExercises,
  exercises,
  exerciseMuscles,
  quests,
  adventures,
  adventureRuns,
  adventureRunSteps,
  bossFights,
  bossDamageLog,
} = schema;

const DAY_MS = 24 * 60 * 60 * 1000;

const nameOf = (r: { enName: string; frName: string; deName: string; esName: string }) => ({
  en: r.enName,
  fr: r.frName,
  de: r.deName,
  es: r.esName,
});

/** A left-joined exercise: all four names, or none. */
const joinedName = (r: {
  enName: string | null;
  frName: string | null;
  deName: string | null;
  esName: string | null;
}): Localized | null =>
  r.enName == null
    ? null
    : { en: r.enName, fr: r.frName ?? "", de: r.deName ?? "", es: r.esName ?? "" };

const titleOf = (r: {
  enTitle: string | null;
  frTitle: string | null;
  deTitle: string | null;
  esTitle: string | null;
}): Localized | null =>
  r.enTitle == null
    ? null
    : { en: r.enTitle, fr: r.frTitle ?? "", de: r.deTitle ?? "", es: r.esTitle ?? "" };

// ------------------------------------------------------------
// The wall: what to beat tonight
// ------------------------------------------------------------

export type WallEntry = {
  exerciseId: number;
  name: Localized;
  imagePath: string;
  type: QuestTargetType;
  /** Null on a movement never logged, which is what a first day's wall is made of. */
  best: number | null;
  last: number | null;
  /** When the standing best was first reached. Null when never logged. */
  recordAt: Date | null;
  /**
   * The best of the last `SEASON_DAYS`, null when the movement was not trained in them. An old
   * record is beaten from here: a peak from two years ago is not a target for tonight.
   */
  seasonBest: number | null;
};

/** How far back "this season" reaches, for a movement whose record has aged. */
export const SEASON_DAYS = 90;

/**
 * The movements trained most recently, each with its record, the day it was set, and what the hero
 * did on it last time.
 *
 * The record's date is not stored anywhere, and it does not need to be: it is the first row that
 * reached the standing best. `checkForNewRecords` decides a record with a strict `>`, so a later
 * equal value never took it, and the earliest equal row is exactly the day it fell.
 *
 * `seasonBest` is there for the hero whose records have aged: a veteran audit (2026-09-15) found a
 * wall of peaks from two years ago, none of them reachable tonight, and a hero who closed the tab.
 */
export async function getRecordWall(limit = 4): Promise<WallEntry[]> {
  const records = await getMovementRecords(limit);

  return await Promise.all(
    records.map(async (record) => {
      const [first] = await db
        .select({ performedAt: completedExercises.performedAt })
        .from(completedExercises)
        .where(
          and(
            eq(completedExercises.exerciseId, record.exerciseId),
            eq(completedExercises.resultType, record.type),
            gte(completedExercises.resultValue, record.best),
          ),
        )
        .orderBy(completedExercises.performedAt, completedExercises.id)
        .limit(1);

      const [season] = await db
        .select({ best: sql<number | null>`MAX(${completedExercises.resultValue})` })
        .from(completedExercises)
        .where(
          and(
            eq(completedExercises.exerciseId, record.exerciseId),
            eq(completedExercises.resultType, record.type),
            gte(completedExercises.performedAt, new Date(Date.now() - SEASON_DAYS * DAY_MS)),
          ),
        );

      return {
        exerciseId: record.exerciseId,
        name: nameOf(record),
        imagePath: record.imagePath,
        type: record.type,
        best: record.best,
        last: record.last,
        recordAt: first?.performedAt ?? record.at,
        seasonBest: season?.best ?? null,
      };
    }),
  );
}

/**
 * The four a first day shows, with a target of one: the first rep of a movement is always a
 * record, so an empty wall is a promise rather than a blank. Seed movements every catalogue has,
 * scoped to `Admin` so a hero's own "Squat" is never picked for them.
 */
const STARTERS: readonly { enName: string; type: QuestTargetType }[] = [
  { enName: "Push-ups", type: "reps" },
  { enName: "Squat", type: "reps" },
  { enName: "Plank", type: "time" },
  { enName: "Wall Sit", type: "time" },
];

export async function getStarterWall(): Promise<WallEntry[]> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      deName: exercises.deName,
      esName: exercises.esName,
      imagePath: exercises.imagePath,
    })
    .from(exercises)
    .where(
      and(
        eq(exercises.creator, ADMIN_CREATOR),
        inArray(
          exercises.enName,
          STARTERS.map((s) => s.enName),
        ),
      ),
    );

  return STARTERS.flatMap((starter) => {
    const row = rows.find((r) => r.enName === starter.enName);
    if (!row) return [];
    return [
      {
        exerciseId: row.id,
        name: nameOf(row),
        imagePath: row.imagePath,
        type: starter.type,
        best: null,
        last: null,
        recordAt: null,
        seasonBest: null,
      },
    ];
  });
}

// ------------------------------------------------------------
// A period's figures
// ------------------------------------------------------------

export type RecordMention = {
  at: Date;
  kind: StoredRecord["t"];
  /** The movement, for a movement record. */
  exerciseName: Localized | null;
};

export type PeriodFigures = {
  quests: number;
  outings: number;
  /** Every result as reps, a held second at a third of one: the conversion the village uses. */
  reps: number;
  /** Seconds in quests. An outing's time is its own figure and not counted here. */
  questSeconds: number;
  /** Quests that kept a duration: the divisor of an average, which a row with none would drag down. */
  timedQuests: number;
  /** Moving time on outings, or the clock where no fix gave a moving time. */
  outingSeconds: number;
  /** Ground from any session: a mixed quest that walked a stretch counts it too. */
  leaguesM: number;
  xp: number;
  records: number;
  latestRecord: RecordMention | null;
};

/** How many records a period's sessions set, and the latest one, with its movement's name. */
async function readRecordRows(
  rows: readonly { performedAt: Date; recordsJson: string | null }[],
): Promise<{ records: number; latestRecord: RecordMention | null }> {
  let records = 0;
  let latest: { at: Date; record: StoredRecord | null } | null = null;
  for (const row of rows) {
    const parsed = parseRecords(row.recordsJson);
    // A row from before `0051` has its flag and no detail: one record, unnamed.
    records += Math.max(1, parsed.length);
    latest ??= { at: row.performedAt, record: parsed[0] ?? null };
  }

  let latestRecord: RecordMention | null = null;
  if (latest) {
    const exerciseId = latest.record?.e;
    const [exercise] =
      exerciseId == null
        ? []
        : await db
            .select({
              enName: exercises.enName,
              frName: exercises.frName,
              deName: exercises.deName,
              esName: exercises.esName,
            })
            .from(exercises)
            .where(eq(exercises.id, exerciseId));
    latestRecord = {
      at: latest.at,
      kind: latest.record?.t ?? "",
      exerciseName: exercise ? nameOf(exercise) : null,
    };
  }

  return { records, latestRecord };
}

/**
 * One period's figures, every one of them over the same `[from, to]`. `from` null is all time.
 *
 * One call per period rather than one screen's worth of scattered totals, so "September so far"
 * and "vs. August, same 15 days" are the same function over two windows and cannot count
 * differently. Two tiles on the old stats tab were both called "Ground covered" and summed
 * different rows, which is the thing this shape exists to make impossible.
 */
export async function getPeriodFigures(from: Date | null, to: Date): Promise<PeriodFigures> {
  const window = and(
    from ? gte(completedQuest.performedAt, from) : undefined,
    lte(completedQuest.performedAt, to),
  );

  const [head] = await db
    .select({
      quests: sql<number>`COALESCE(SUM(CASE WHEN ${completedQuest.outing} IS NULL THEN 1 ELSE 0 END), 0)`,
      outings: sql<number>`COALESCE(SUM(CASE WHEN ${completedQuest.outing} IS NOT NULL THEN 1 ELSE 0 END), 0)`,
      questSeconds: sql<number>`COALESCE(SUM(CASE WHEN ${completedQuest.outing} IS NULL THEN COALESCE(${completedQuest.durationSeconds}, 0) ELSE 0 END), 0)`,
      timedQuests: sql<number>`COALESCE(SUM(CASE WHEN ${completedQuest.outing} IS NULL AND ${completedQuest.durationSeconds} > 0 THEN 1 ELSE 0 END), 0)`,
      outingSeconds: sql<number>`COALESCE(SUM(CASE WHEN ${completedQuest.outing} IS NOT NULL THEN COALESCE(${completedQuest.movingSeconds}, ${completedQuest.durationSeconds}, 0) ELSE 0 END), 0)`,
      leaguesM: sql<number>`COALESCE(SUM(${completedQuest.leaguesM}), 0)`,
      xp: sql<number>`COALESCE(SUM(${completedQuest.xpEarned}), 0)`,
    })
    .from(completedQuest)
    .where(window);

  const [work] = await db
    .select({
      reps: sql<number>`COALESCE(SUM(${repEquivalentSql(completedExercises.resultValue, completedExercises.resultType, exercises.style)}), 0)`,
    })
    .from(completedExercises)
    .innerJoin(completedQuest, eq(completedQuest.id, completedExercises.sessionId))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(window);

  const recordRows = await db
    .select({
      performedAt: completedQuest.performedAt,
      recordsJson: completedQuest.recordsJson,
    })
    .from(completedQuest)
    .where(and(window, eq(completedQuest.hasNewRecords, 1)))
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id));

  const { records, latestRecord } = await readRecordRows(recordRows);

  return {
    quests: Number(head?.quests ?? 0),
    outings: Number(head?.outings ?? 0),
    reps: Number(work?.reps ?? 0),
    questSeconds: Number(head?.questSeconds ?? 0),
    timedQuests: Number(head?.timedQuests ?? 0),
    outingSeconds: Number(head?.outingSeconds ?? 0),
    leaguesM: Number(head?.leaguesM ?? 0),
    xp: Number(head?.xp ?? 0),
    records,
    latestRecord,
  };
}

/**
 * This month from its first day to now, and the previous month over the same number of days.
 *
 * "Same 15 days" rather than the whole previous month, because the whole month always wins on
 * the fifteenth. Whole days, to the end of the same date, because that is what the label says: a
 * window cut at the current hour dropped an evening session a hero could count. The previous
 * window stops at that month's last day when it is shorter: the thirty-first of March compares
 * against all of February, not against the third of March.
 */
export function monthWindows(now: Date): {
  current: { from: Date; to: Date };
  previous: { from: Date; to: Date };
  days: number;
} {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(from.getTime() - 1);
  const sameDayEnd =
    new Date(now.getFullYear(), now.getMonth() - 1, now.getDate() + 1).getTime() - 1;
  const previousTo = new Date(Math.min(sameDayEnd, previousEnd.getTime()));
  return {
    current: { from, to: now },
    previous: { from: previousFrom, to: previousTo },
    days: now.getDate(),
  };
}

export type DayActivity = "quest" | "outing" | "both";

/**
 * What each day held, keyed by the local day. A quest and an outing on the same day is its own
 * mark: a walker's longest outing of the month shared a day with a quest and vanished under it.
 */
export async function getActivityDays(from: Date, to: Date): Promise<Map<string, DayActivity>> {
  const rows = await db
    .select({ performedAt: completedQuest.performedAt, outing: completedQuest.outing })
    .from(completedQuest)
    .where(and(gte(completedQuest.performedAt, from), lte(completedQuest.performedAt, to)));

  const days = new Map<string, DayActivity>();
  for (const row of rows) {
    const key = dayKey(row.performedAt);
    const kind: DayActivity = row.outing == null ? "quest" : "outing";
    const had = days.get(key);
    days.set(key, had === undefined || had === kind ? kind : "both");
  }
  return days;
}

// ------------------------------------------------------------
// Lifetime
// ------------------------------------------------------------

/** When the hero's history starts, for "three years" in the veteran's sentence. */
export async function getOldestSessionAt(): Promise<Date | null> {
  const [row] = await db
    .select({ at: completedQuest.performedAt })
    .from(completedQuest)
    .orderBy(completedQuest.performedAt)
    .limit(1);
  return row?.at ?? null;
}

/** Movement records standing: one per movement and unit with something logged. */
export async function getRecordsStanding(): Promise<number> {
  const rows = await db
    .select({ exerciseId: completedExercises.exerciseId })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(and(ne(exercises.style, NON_REP_STYLE), gt(completedExercises.resultValue, 0)))
    .groupBy(completedExercises.exerciseId, completedExercises.resultType);
  return rows.length;
}

export type SessionBest = {
  sessionId: number;
  value: number;
  at: Date;
  questTitle: Localized | null;
};

async function bestSessionBy(metric: "duration" | "xp" | "ground"): Promise<SessionBest | null> {
  const column =
    metric === "duration"
      ? completedQuest.durationSeconds
      : metric === "xp"
        ? completedQuest.xpEarned
        : completedQuest.leaguesM;
  const [row] = await db
    .select({
      sessionId: completedQuest.id,
      value: column,
      at: completedQuest.performedAt,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      deTitle: quests.deTitle,
      esTitle: quests.esTitle,
    })
    .from(completedQuest)
    .leftJoin(quests, eq(quests.id, completedQuest.questId))
    // A quest's records are about quests; the longest outing is the one record about outings.
    .where(and(metric === "ground" ? isNotNull(completedQuest.outing) : isWorkout(), gt(column, 0)))
    .orderBy(desc(column), desc(completedQuest.performedAt))
    .limit(1);
  if (!row || row.value == null) return null;
  return { sessionId: row.sessionId, value: row.value, at: row.at, questTitle: titleOf(row) };
}

async function mostRepsSession(): Promise<SessionBest | null> {
  const reps = sql<number>`SUM(${repEquivalentSql(completedExercises.resultValue, completedExercises.resultType, exercises.style)})`;
  const [row] = await db
    .select({
      sessionId: completedQuest.id,
      value: reps,
      at: completedQuest.performedAt,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      deTitle: quests.deTitle,
      esTitle: quests.esTitle,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .leftJoin(quests, eq(quests.id, completedQuest.questId))
    .where(isWorkout())
    .groupBy(completedQuest.id)
    .orderBy(desc(reps), desc(completedQuest.performedAt))
    .limit(1);
  if (!row?.value) return null;
  return {
    sessionId: row.sessionId,
    value: Number(row.value),
    at: row.at,
    questTitle: titleOf(row),
  };
}

/** The records that belong to a session rather than a movement. They live in Lifetime. */
export async function getSessionBests(): Promise<{
  longest: SessionBest | null;
  mostXp: SessionBest | null;
  mostReps: SessionBest | null;
  longestOuting: SessionBest | null;
}> {
  const [longest, mostXp, mostReps, longestOuting] = await Promise.all([
    bestSessionBy("duration"),
    bestSessionBy("xp"),
    mostRepsSession(),
    bestSessionBy("ground"),
  ]);
  return { longest, mostXp, mostReps, longestOuting };
}

export type BossKill = {
  adventureId: number;
  title: Localized;
  imagePath: string | null;
  felledAt: Date;
  /** The session that finished it, when one did. The report opens from it. */
  sessionId: number | null;
};

/**
 * Every boss campaign won, rematches included, newest first. A felled boss is a finished boss
 * run: `boss_fights.defeatedAt` is nulled when a rematch starts, and the run is never deleted.
 */
export async function getBossKills(): Promise<BossKill[]> {
  const runs = await db
    .select({
      runId: adventureRuns.id,
      adventureId: adventures.id,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      deTitle: adventures.deTitle,
      esTitle: adventures.esTitle,
      imagePath: adventures.imagePath,
      bossImagePath: adventures.bossImagePath,
      finishedAt: adventureRuns.finishedAt,
    })
    .from(adventureRuns)
    .innerJoin(adventures, eq(adventures.id, adventureRuns.adventureId))
    .where(
      and(
        eq(adventureRuns.status, "finished"),
        eq(adventures.kind, "boss"),
        isNotNull(adventureRuns.finishedAt),
      ),
    )
    .orderBy(desc(adventureRuns.finishedAt));

  if (runs.length === 0) return [];

  const steps = await db
    .select({
      runId: adventureRunSteps.runId,
      stepIndex: adventureRunSteps.stepIndex,
      sessionId: adventureRunSteps.completedSessionId,
    })
    .from(adventureRunSteps)
    .where(
      inArray(
        adventureRunSteps.runId,
        runs.map((r) => r.runId),
      ),
    );

  return runs.flatMap((run) => {
    if (!run.finishedAt) return [];
    const last = steps
      .filter((s) => s.runId === run.runId)
      .sort((a, b) => b.stepIndex - a.stepIndex)[0];
    return [
      {
        adventureId: run.adventureId,
        title: { en: run.enTitle, fr: run.frTitle, de: run.deTitle, es: run.esTitle },
        imagePath: run.bossImagePath ?? run.imagePath,
        felledAt: run.finishedAt,
        sessionId: last?.sessionId ?? null,
      },
    ];
  });
}

// ------------------------------------------------------------
// The quest log: one session
// ------------------------------------------------------------

/** Reps a session put into the world, the same conversion as everywhere else. */
export function sessionReps(session: Pick<CompletedSession, "exercises">): number {
  return session.exercises.reduce(
    (total, ex) => total + toRepEquivalent(ex.result.value, ex.result.type, ex.exercise.style),
    0,
  );
}

export type QuestStanding = {
  /** 1 is the best run. Ties count against this one, the reading `getSessionStanding` uses. */
  rank: number;
  outOf: number;
  /** Every run's value, best first. */
  values: number[];
  mine: number;
  bestAt: Date;
  unit: "reps" | "metres";
};

/**
 * Where this run sits among every run of the same quest, by reps; an outing among every outing,
 * by ground. Null on a first run: second of one is not a place.
 */
export async function getQuestStanding(session: CompletedSession): Promise<QuestStanding | null> {
  let rows: { sessionId: number; value: number; at: Date }[];

  if (session.outing != null) {
    rows = (
      await db
        .select({
          sessionId: completedQuest.id,
          value: completedQuest.leaguesM,
          at: completedQuest.performedAt,
        })
        .from(completedQuest)
        .where(and(isNotNull(completedQuest.outing), gt(completedQuest.leaguesM, 0)))
    ).map((r) => ({ sessionId: r.sessionId, value: r.value ?? 0, at: r.at }));
  } else {
    if (session.questId == null) return null;
    const reps = sql<number>`SUM(${repEquivalentSql(completedExercises.resultValue, completedExercises.resultType, exercises.style)})`;
    rows = (
      await db
        .select({ sessionId: completedQuest.id, value: reps, at: completedQuest.performedAt })
        .from(completedQuest)
        .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
        .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
        .where(and(eq(completedQuest.questId, session.questId), isWorkout()))
        .groupBy(completedQuest.id)
    ).map((r) => ({ sessionId: r.sessionId, value: Number(r.value ?? 0), at: r.at }));
  }

  return placeRun(rows, session.id, session.outing != null ? "metres" : "reps");
}

/** The ranking itself, apart from the reads, so it can be checked without a database. */
export function placeRun(
  rows: readonly { sessionId: number; value: number; at: Date }[],
  sessionId: number,
  unit: QuestStanding["unit"],
): QuestStanding | null {
  const mine = rows.find((r) => r.sessionId === sessionId);
  if (!mine || mine.value <= 0 || rows.length < 2) return null;

  const sorted = [...rows].sort((a, b) => b.value - a.value || a.at.getTime() - b.at.getTime());
  const ahead = rows.filter((r) => r.sessionId !== sessionId && r.value >= mine.value).length;
  const best = sorted[0] ?? mine;

  return {
    rank: ahead + 1,
    outOf: rows.length,
    values: sorted.map((r) => r.value),
    mine: mine.value,
    bestAt: best.at,
    unit,
  };
}

export type FallenRecord = {
  kind: StoredRecord["t"];
  exerciseId: number | null;
  name: Localized | null;
  imagePath: string | null;
  type: QuestTargetType | null;
  value: number;
  /** The best before this session. Null when there was none: the first time is a record. */
  previous: number | null;
};

/**
 * The records this session broke, with the value it set and the one it beat.
 *
 * `records_json` says which records fell; what they were worth is still in the rows, and reading
 * it back rather than storing it keeps one writer for every result.
 */
export async function getFallenRecords(session: CompletedSession): Promise<FallenRecord[]> {
  const [row] = await db
    .select({ recordsJson: completedQuest.recordsJson })
    .from(completedQuest)
    .where(eq(completedQuest.id, session.id));
  const stored = parseRecords(row?.recordsJson ?? null);

  return await Promise.all(
    stored.map((record) =>
      record.e == null
        ? sessionRecordFell(session, record.t)
        : movementRecordFell(session, record.t, record.e),
    ),
  );
}

/** A movement's record: the session's best set on it, against every earlier session's best. */
async function movementRecordFell(
  session: CompletedSession,
  kind: StoredRecord["t"],
  exerciseId: number,
): Promise<FallenRecord> {
  const type: QuestTargetType = kind === "exercise_max_time" ? "time" : "reps";
  const mine = session.exercises.filter(
    (ex) => ex.exercise.id === exerciseId && ex.result.type === type,
  );
  const [before] = await db
    .select({ best: sql<number | null>`MAX(${completedExercises.resultValue})` })
    .from(completedExercises)
    .where(
      and(
        eq(completedExercises.exerciseId, exerciseId),
        eq(completedExercises.resultType, type),
        ne(completedExercises.sessionId, session.id),
        lt(completedExercises.performedAt, session.performedAt),
      ),
    );
  const exercise = mine[0]?.exercise;
  return {
    kind,
    exerciseId,
    name: exercise ? nameOf(exercise) : null,
    imagePath: exercise?.imagePath ?? null,
    type,
    value: Math.max(0, ...mine.map((ex) => ex.result.value)),
    previous: before?.best ?? null,
  };
}

/**
 * A session's own record: its length, its XP or its ground, against the sessions before it that
 * could hold the same record. The quest records compare workouts only, the rule
 * `checkForNewRecords` wrote them under.
 */
async function sessionRecordFell(
  session: CompletedSession,
  kind: StoredRecord["t"],
): Promise<FallenRecord> {
  const outing = kind === "longest_outing";
  const column = outing
    ? completedQuest.leaguesM
    : kind === "most_xp"
      ? completedQuest.xpEarned
      : completedQuest.durationSeconds;
  const value = outing
    ? (session.leaguesM ?? 0)
    : kind === "most_xp"
      ? session.xpEarned
      : (session.durationSeconds ?? 0);
  const [before] = await db
    .select({ best: sql<number | null>`MAX(${column})` })
    .from(completedQuest)
    .where(
      and(
        ne(completedQuest.id, session.id),
        lt(completedQuest.performedAt, session.performedAt),
        outing ? undefined : isWorkout(),
      ),
    );
  return {
    kind,
    exerciseId: null,
    name: null,
    imagePath: null,
    type: null,
    value,
    previous: before?.best ?? null,
  };
}

export type MuscleShift = { muscle: MuscleCode; before: number; after: number };

type MuscleRow = { sessionId: number; muscle: MuscleCode; volume: number };

/**
 * The muscle whose share of the last thirty days this session moved most, before and after it.
 * Whole percentages; null when nothing moved by a visible point.
 */
export function pickMuscleShift(rows: readonly MuscleRow[], sessionId: number): MuscleShift | null {
  const totals = (include: boolean) => {
    const byMuscle = new Map<MuscleCode, number>();
    let all = 0;
    for (const row of rows) {
      if (!include && row.sessionId === sessionId) continue;
      byMuscle.set(row.muscle, (byMuscle.get(row.muscle) ?? 0) + row.volume);
      all += row.volume;
    }
    return { byMuscle, all };
  };
  const before = totals(false);
  const after = totals(true);
  const share = (t: typeof before, m: MuscleCode) =>
    t.all > 0 ? Math.round(((t.byMuscle.get(m) ?? 0) / t.all) * 100) : 0;

  let best: MuscleShift | null = null;
  const mine = new Set(rows.filter((r) => r.sessionId === sessionId).map((r) => r.muscle));
  for (const muscle of mine) {
    const shift = { muscle, before: share(before, muscle), after: share(after, muscle) };
    if (shift.after <= shift.before) continue;
    if (!best || shift.after - shift.before > best.after - best.before) best = shift;
  }
  return best;
}

export async function getMuscleShift(session: CompletedSession): Promise<MuscleShift | null> {
  if (session.outing != null) return null;
  const from = new Date(session.performedAt.getTime() - 30 * DAY_MS);
  const rows = await db
    .select({
      sessionId: completedQuest.id,
      muscle: exerciseMuscles.muscle,
      value: completedExercises.resultValue,
      type: completedExercises.resultType,
      style: exercises.style,
    })
    .from(completedQuest)
    .innerJoin(completedExercises, eq(completedExercises.sessionId, completedQuest.id))
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .innerJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(
      and(
        gte(completedQuest.performedAt, from),
        lte(completedQuest.performedAt, session.performedAt),
      ),
    );

  return pickMuscleShift(
    rows.map((r) => ({
      sessionId: r.sessionId,
      muscle: r.muscle as MuscleCode,
      volume: toRepEquivalent(r.value, r.type, r.style),
    })),
    session.id,
  );
}

/** A later session exists: "toward level 9" is only true of the last one. */
export async function isLatestSession(session: CompletedSession): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(completedQuest)
    .where(
      and(ne(completedQuest.id, session.id), gte(completedQuest.performedAt, session.performedAt)),
    );
  return Number(row?.n ?? 0) === 0;
}

/** The rung this session's movements are climbing toward, the one closest to earned. */
export async function getSessionRung(session: CompletedSession): Promise<VariationStep | null> {
  const ids = [...new Set(session.exercises.map((ex) => ex.exercise.id))];
  let best: VariationStep | null = null;
  for (const id of ids) {
    const step = await getNextProgression(id);
    if (step && (!best || step.metTarget > best.metTarget)) best = step;
  }
  return best;
}

// ------------------------------------------------------------
// The kill report
// ------------------------------------------------------------

export type KillHurt = { exerciseId: number | null; name: Localized | null; damage: number };

export type KillReport = {
  adventureId: number;
  title: Localized;
  bossImagePath: string | null;
  felledAt: Date;
  /** Steps in the campaign, and how many days it took from its start to the kill. */
  steps: number;
  days: number;
  /** The damage it took, which is the health it had. */
  pool: number;
  lastBlow: {
    exerciseId: number | null;
    name: Localized | null;
    imagePath: string | null;
    value: number | null;
    type: QuestTargetType | null;
    /** Zero-based. Null before `0061`, and on the campaign's closing blow. */
    roundIndex: number | null;
    healthBefore: number;
  } | null;
  hurt: KillHurt[];
  xpSession: number;
  xpRun: number;
  victories: number;
  /** The next boss campaign never won, in gallery order. */
  nextBoss: Localized | null;
};

type Hit = {
  id: number;
  sessionId: number | null;
  exerciseId: number | null;
  damage: number;
  roundIndex: number | null;
  enName: string | null;
  frName: string | null;
  deName: string | null;
  esName: string | null;
  imagePath: string | null;
};

/**
 * A run's hits, read as a report: the pool they emptied, who dealt what, and the blow that ended
 * it. The last blow is the killing session's last hit in log order, which is the order the session
 * landed them; the health it took is whatever the hits before it had left.
 */
export function readHits(
  hits: readonly Hit[],
  session: Pick<CompletedSession, "id" | "exercises">,
): { pool: number; hurt: KillHurt[]; lastBlow: KillReport["lastBlow"] } {
  const pool = hits.reduce((total, hit) => total + hit.damage, 0);

  const hurtBy = new Map<string, KillHurt>();
  for (const hit of hits) {
    const key = String(hit.exerciseId);
    const entry = hurtBy.get(key) ?? {
      exerciseId: hit.exerciseId,
      name: joinedName(hit),
      damage: 0,
    };
    entry.damage += hit.damage;
    hurtBy.set(key, entry);
  }

  const blow = hits.filter((hit) => hit.sessionId === session.id).at(-1);
  if (!blow) return { pool, hurt: sortedHurt(hurtBy), lastBlow: null };

  const dealtBefore = hits
    .filter((hit) => hit.id < blow.id)
    .reduce((total, hit) => total + hit.damage, 0);
  // Only a hit that kept its round can point at one set; before 0061 the movement is all there is.
  const set =
    blow.roundIndex == null
      ? null
      : (session.exercises.find(
          (ex) => ex.exercise.id === blow.exerciseId && ex.roundIndex === blow.roundIndex,
        ) ?? null);

  return {
    pool,
    hurt: sortedHurt(hurtBy),
    lastBlow: {
      exerciseId: blow.exerciseId,
      name: joinedName(blow),
      imagePath: blow.imagePath,
      value: set?.result.value ?? null,
      type: set?.result.type ?? null,
      roundIndex: blow.roundIndex,
      healthBefore: pool - dealtBefore,
    },
  };
}

const sortedHurt = (hurtBy: Map<string, KillHurt>) =>
  [...hurtBy.values()].sort((a, b) => b.damage - a.damage);

/** The first boss campaign never won, in gallery order: the one still standing. */
async function nextStandingBoss(): Promise<Localized | null> {
  const won = await db
    .select({ adventureId: adventureRuns.adventureId })
    .from(adventureRuns)
    .where(eq(adventureRuns.status, "finished"));
  const wonIds = new Set(won.map((r) => r.adventureId));
  const bosses = await db
    .select({
      id: adventures.id,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      deTitle: adventures.deTitle,
      esTitle: adventures.esTitle,
    })
    .from(adventures)
    .where(and(eq(adventures.kind, "boss"), eq(adventures.isActive, 1)))
    .orderBy(adventures.sortOrder, adventures.id);
  const next = bosses.find((a) => !wonIds.has(a.id));
  return next ? { en: next.enTitle, fr: next.frTitle, de: next.deTitle, es: next.esTitle } : null;
}

/**
 * The report for the session that felled a boss, or null when this session felled nothing.
 *
 * Built from the damage log, which has carried the session and the movement of every hit since
 * sessions started committing their damage at save time. A rematch reuses the same fight row, so
 * the log is scoped to the run the session belongs to: the pool is the damage that run dealt.
 */
export async function getKillReport(session: CompletedSession): Promise<KillReport | null> {
  const [step] = await db
    .select({
      runId: adventureRunSteps.runId,
      stepIndex: adventureRunSteps.stepIndex,
      adventureId: adventureRuns.adventureId,
      status: adventureRuns.status,
      startedAt: adventureRuns.startedAt,
      finishedAt: adventureRuns.finishedAt,
      kind: adventures.kind,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      deTitle: adventures.deTitle,
      esTitle: adventures.esTitle,
      imagePath: adventures.imagePath,
      bossImagePath: adventures.bossImagePath,
    })
    .from(adventureRunSteps)
    .innerJoin(adventureRuns, eq(adventureRuns.id, adventureRunSteps.runId))
    .innerJoin(adventures, eq(adventures.id, adventureRuns.adventureId))
    .where(eq(adventureRunSteps.completedSessionId, session.id))
    .limit(1);

  if (step?.kind !== "boss" || step.status !== "finished") return null;

  const runSteps = await db
    .select({
      stepIndex: adventureRunSteps.stepIndex,
      sessionId: adventureRunSteps.completedSessionId,
    })
    .from(adventureRunSteps)
    .where(eq(adventureRunSteps.runId, step.runId));

  const lastIndex = Math.max(...runSteps.map((s) => s.stepIndex));
  if (step.stepIndex !== lastIndex) return null;

  const runSessionIds = runSteps.flatMap((s) => (s.sessionId == null ? [] : [s.sessionId]));
  if (runSessionIds.length === 0) return null;

  const hits = await db
    .select({
      id: bossDamageLog.id,
      sessionId: bossDamageLog.completedSessionId,
      exerciseId: bossDamageLog.exerciseId,
      damage: bossDamageLog.damageDealt,
      roundIndex: bossDamageLog.roundIndex,
      enName: exercises.enName,
      frName: exercises.frName,
      deName: exercises.deName,
      esName: exercises.esName,
      imagePath: exercises.imagePath,
    })
    .from(bossDamageLog)
    .innerJoin(bossFights, eq(bossFights.id, bossDamageLog.bossFightId))
    .leftJoin(exercises, eq(exercises.id, bossDamageLog.exerciseId))
    .where(
      and(
        eq(bossFights.adventureId, step.adventureId),
        inArray(bossDamageLog.completedSessionId, runSessionIds),
      ),
    )
    .orderBy(bossDamageLog.id);

  const { pool, hurt, lastBlow } = readHits(hits, session);

  const [xp] = await db
    .select({ total: sql<number>`COALESCE(SUM(${completedQuest.xpEarned}), 0)` })
    .from(completedQuest)
    .where(inArray(completedQuest.id, runSessionIds));

  const [victories] = await db
    .select({ n: count() })
    .from(adventureRuns)
    .where(
      and(eq(adventureRuns.adventureId, step.adventureId), eq(adventureRuns.status, "finished")),
    );

  const next = await nextStandingBoss();

  const felledAt = step.finishedAt ?? session.performedAt;
  const startedAt = step.startedAt ?? felledAt;

  return {
    adventureId: step.adventureId,
    title: { en: step.enTitle, fr: step.frTitle, de: step.deTitle, es: step.esTitle },
    bossImagePath: step.bossImagePath ?? step.imagePath,
    felledAt,
    steps: runSteps.length,
    days: Math.max(1, Math.ceil((felledAt.getTime() - startedAt.getTime()) / DAY_MS)),
    pool,
    lastBlow,
    hurt,
    xpSession: session.xpEarned,
    xpRun: Number(xp?.total ?? 0),
    victories: Number(victories?.n ?? 0),
    nextBoss: next,
  };
}

// ------------------------------------------------------------
// The shelf
// ------------------------------------------------------------

/**
 * The locked achievement closest to done. One already at its target is skipped: the unlock is
 * written when a session is saved, so "10 of 10" can sit locked until the next one, and naming it
 * as the next thing to earn would be naming something already earned.
 */
export function nextOnShelf(progress: readonly AchievementProgress[]): AchievementProgress | null {
  let best: AchievementProgress | null = null;
  for (const entry of progress) {
    if (entry.isUnlocked || entry.currentValue >= entry.targetValue) continue;
    if (!best || entry.progress > best.progress) best = entry;
  }
  return best;
}
