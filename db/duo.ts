import { and, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { PausePeriod } from "@/constants/pause";
import {
  clampGoal,
  type DuoWeek,
  duoWeek,
  type IsoWeek,
  isoWeekOf,
  sameWeek,
  weekdayIndex,
  weekEnd,
  weekStart,
} from "@/src/multiplayer/duoWeek";
import { mergeWeek, type WeekState } from "@/src/multiplayer/envelope";
import { db, schema } from "./client";
import { countsForPlay, type PainStop, type PlayContext, type PlaySession } from "./completed";
import { dayKey } from "./dates";
import { fetchLadderRows } from "./exercises";
import { getPausePeriods, getWeeklyQuota } from "./streaks";

const { completedExercises, completedQuest, duoWeeks, exercises, pairs } = schema;

/**
 * The duo challenge's storage (multiplayer lot 1): the hero's own week read back from the journal,
 * what companions said of theirs, and the weeks the boss fell. Rules: LOT1-SPEC.md § 1 and § 3.
 */

/** O1: the goal a pair freezes when it is written on this phone. */
export async function frozenGoal(): Promise<number> {
  return clampGoal(await getWeeklyQuota());
}

/** F3: the day on the hero's own calendar, from what the row wrote down, as a local noon. */
function ownCalendarDay(performedAt: Date, tzOffsetMin: number): Date {
  const there = new Date(performedAt.getTime() + tzOffsetMin * 60_000);
  return new Date(there.getUTCFullYear(), there.getUTCMonth(), there.getUTCDate(), 12);
}

async function playContext(): Promise<PlayContext> {
  const [ladderRows, stops] = await Promise.all([
    fetchLadderRows(),
    db
      .select({
        uuid: completedQuest.uuid,
        performedAt: completedQuest.performedAt,
        tzOffsetMin: completedQuest.tzOffsetMin,
      })
      .from(completedQuest)
      .where(eq(completedQuest.stopReason, "pain")),
  ]);
  return {
    ladder: new Map(ladderRows.map((row) => [row.id, row.prerequisiteExerciseId])),
    painStops: stops.map(
      (stop): PainStop => ({
        uuid: stop.uuid ?? "",
        performedAt: stop.performedAt,
        tzOffsetMin: stop.tzOffsetMin ?? 0,
      }),
    ),
  };
}

/**
 * F1 to F4: Monday first, whether the hero landed a hit each day of `week`. Read from the journal
 * every time, so a session synced from the hero's other device counts as soon as it arrives.
 */
export async function myWeekDays(week: IsoWeek, now = new Date()): Promise<boolean[]> {
  // A day of slack each side: a row's own calendar day can sit outside this phone's week bounds.
  const from = new Date(weekStart(week).getTime() - 86_400_000);
  const until = new Date(weekEnd(week).getTime() + 86_400_000);
  const rows = await db
    .select()
    .from(completedQuest)
    .where(and(gte(completedQuest.performedAt, from), lt(completedQuest.performedAt, until)));
  const days = Array.from({ length: 7 }, () => false);
  if (rows.length === 0) return days;

  const sets = await db
    .select({
      sessionId: completedExercises.sessionId,
      exerciseId: completedExercises.exerciseId,
      roundIndex: completedExercises.roundIndex,
      sortOrder: completedExercises.sortOrder,
      resultValue: completedExercises.resultValue,
      targetValue: completedExercises.targetValue,
      prescribedValue: completedExercises.prescribedValue,
      ladderNeutral: completedExercises.ladderNeutral,
      lightWeekNeutral: completedExercises.lightWeekNeutral,
      sides: completedExercises.sides,
      perSide: exercises.perSide,
    })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(
      inArray(
        completedExercises.sessionId,
        rows.map((row) => row.id),
      ),
    );
  const context = await playContext();

  for (const row of rows) {
    // F4: a session dated after now is a moved clock, not a hit.
    if (row.performedAt > now) continue;
    const day = ownCalendarDay(row.performedAt, row.tzOffsetMin ?? 0);
    if (!sameWeek(isoWeekOf(day), week)) continue;
    const session: PlaySession = {
      uuid: row.uuid ?? "",
      outing: row.outing,
      byHand: row.byHand,
      durationSeconds: row.durationSeconds,
      movingSeconds: row.movingSeconds,
      leaguesM: row.leaguesM,
      stopReason: row.stopReason,
      sets: sets.filter((set) => set.sessionId === row.id),
    };
    if (countsForPlay(session, context)) days[weekdayIndex(day)] = true;
  }
  return days;
}

/** S5, S6: a pause of this hero touched `week` (a period is `from` included, `until` excluded). */
export function pauseTouches(periods: readonly PausePeriod[], week: IsoWeek): boolean {
  const first = dayKey(weekStart(week));
  const end = dayKey(weekEnd(week));
  return periods.some((p) => p.from < end && p.until > first);
}

export async function myPauseTouches(week: IsoWeek): Promise<boolean> {
  return pauseTouches(await getPausePeriods(), week);
}

type DuoRow = typeof duoWeeks.$inferSelect;

const whereWeek = (pairId: string, week: IsoWeek) =>
  and(
    eq(duoWeeks.pairId, pairId),
    eq(duoWeeks.isoYear, week.isoYear),
    eq(duoWeeks.isoWeek, week.isoWeek),
  );

function stateOf(row: DuoRow | undefined): WeekState | null {
  if (!row || row.stamp === null || row.goal === null || row.days === null) return null;
  return {
    stamp: row.stamp,
    goal: row.goal,
    paused: row.paused ?? false,
    days: JSON.parse(row.days),
  };
}

/**
 * S4: a companion's envelope for a week, kept if it is newer than what this phone holds. Returns
 * whether anything changed, so the screen can say "nothing new" (E5).
 */
export async function recordTheirWeek(
  pairId: string,
  week: IsoWeek,
  incoming: WeekState,
): Promise<"new" | "same"> {
  const [row] = await db.select().from(duoWeeks).where(whereWeek(pairId, week));
  const known = stateOf(row);
  const kept = mergeWeek(known, incoming);
  if (known !== null && kept === known) return "same";
  const values = {
    stamp: kept.stamp,
    goal: kept.goal,
    paused: kept.paused,
    days: JSON.stringify(kept.days),
  };
  await db
    .insert(duoWeeks)
    .values({ pairId, ...week, ...values })
    .onConflictDoUpdate({
      target: [duoWeeks.pairId, duoWeeks.isoYear, duoWeeks.isoWeek],
      set: values,
    });
  return "new";
}

/** What this phone knows of a companion's week, if anything. */
export async function theirWeek(pairId: string, week: IsoWeek): Promise<WeekState | null> {
  const [row] = await db.select().from(duoWeeks).where(whereWeek(pairId, week));
  return stateOf(row);
}

/**
 * The week as both phones should read it, and S2 made durable: the first time a week reads fallen
 * here, `fallenAt` is written, and from then on nothing takes it back.
 */
export async function readDuoWeek(
  pair: { id: string; goal: number },
  week: IsoWeek,
  now = new Date(),
): Promise<DuoWeek> {
  const [row] = await db.select().from(duoWeeks).where(whereWeek(pair.id, week));
  const [myDays, myPaused] = await Promise.all([myWeekDays(week, now), myPauseTouches(week)]);
  const read = duoWeek({
    week,
    myDays,
    myGoal: pair.goal,
    myPaused,
    theirs: stateOf(row),
    fallenAt: row?.fallenAt ?? null,
    now,
  });
  if (read.result === "fallen" && !row?.fallenAt) {
    await db
      .insert(duoWeeks)
      .values({ pairId: pair.id, ...week, fallenAt: now })
      .onConflictDoUpdate({
        target: [duoWeeks.pairId, duoWeeks.isoYear, duoWeeks.isoWeek],
        set: { fallenAt: sql`ifnull(${duoWeeks.fallenAt}, ${Math.floor(now.getTime() / 1000)})` },
      });
  }
  return read;
}

/** S9: every week a boss fell, with any companion, unlinked ones too. Never goes down. */
export async function fallenTogether(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(duoWeeks)
    .where(isNotNull(duoWeeks.fallenAt));
  return Number(row?.n ?? 0);
}

/** D1: "compare our weeks", this hero's own switch for one pair. */
export async function setDuel(pairId: string, on: boolean): Promise<void> {
  await db.update(pairs).set({ duel: on, updatedAt: new Date() }).where(eq(pairs.id, pairId));
}
