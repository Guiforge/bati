import { and, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { isWorkout } from "./completed";
import { getActivePause } from "./pause";
import { getPreference, setPreference } from "./preferences";
import { setMetSql } from "./progress";
import type { MovementPattern } from "./schema";
import { ROUNDS_RANGE } from "./targets";

const { completedExercises, completedQuest, exercises } = schema;

/**
 * "Semaine légère" (roadmap E-03, the Coach's rule table): offered after two sessions in a row
 * under the target, or five weeks at four sessions or more. Refusable. Nothing here is stored but
 * the hero's two answers, both device-local (`DEVICE_LOCAL_PREFERENCES`): the offer is derived from
 * the journal, and the week itself is one round fewer on a quest whose rounds the hero never set.
 */
export const UNDER_IN_A_ROW = 2;
export const BUSY_WEEKS = 5;
export const BUSY_WEEK_SESSIONS = 4;
/** A refusal silences the card this long. */
export const REFUSAL_SILENCE_DAYS = 14;
/** An accepted week lasts this long from the tap. */
export const LIGHT_WEEK_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const REFUSED_KEY = "lightWeekRefusedAt";
const ACCEPTED_KEY = "lightWeekAcceptedAt";
/** The hero ended the week early; it counts only if it is later than the acceptance. */
const ENDED_KEY = "lightWeekEndedAt";

/** A workout as the offer reads it: when, and whether more than half of its strength sets missed. */
export type LightWeekSession = { at: Date; under: boolean };

export type LightWeekAnswers = {
  refusedAt: number | null;
  acceptedAt: number | null;
  endedAt?: number | null;
};

/** Whether an accepted week is running at `now`, and not ended early. */
export function lightWeekRunning(
  acceptedAt: number | null,
  now: Date,
  endedAt: number | null = null,
): boolean {
  if (acceptedAt == null || (endedAt != null && endedAt >= acceptedAt)) return false;
  // Before the acceptance is not in the week: a session begun earlier and saved after the tap.
  if (now.getTime() < acceptedAt) return false;
  return now.getTime() - acceptedAt < LIGHT_WEEK_DAYS * DAY_MS;
}

/** The day the running week stops, for the line that says it is on. */
export const lightWeekEndsAt = (acceptedAt: number) =>
  new Date(acceptedAt + LIGHT_WEEK_DAYS * DAY_MS);

export type LightWeekReason = "under" | "busy";

/**
 * Why Home proposes the week, or null when it does not. `sessions` are workouts, newest first.
 *
 * Under-target counts only sessions after the hero's last answer, so an answered offer needs two
 * new ones. The busy-weeks trigger reads seven-day windows ending now; after an accepted week it
 * waits five weeks, or the next window would re-offer the rest the hero just took.
 */
export function lightWeekDue(
  sessions: readonly LightWeekSession[],
  { refusedAt, acceptedAt, endedAt = null }: LightWeekAnswers,
  now: Date,
): LightWeekReason | null {
  const t = now.getTime();
  if (lightWeekRunning(acceptedAt, now, endedAt)) return null;
  if (refusedAt != null && t - refusedAt < REFUSAL_SILENCE_DAYS * DAY_MS) return null;

  // An accepted week answers until it ends: its own sessions are judged again (D-52, a hero-written
  // quest keeps all its rounds), and two misses inside it must not offer the next week on day 8.
  const weekEnd =
    acceptedAt == null
      ? 0
      : endedAt != null && endedAt >= acceptedAt
        ? endedAt
        : lightWeekEndsAt(acceptedAt).getTime();
  const answeredAt = Math.max(refusedAt ?? 0, weekEnd);
  const fresh = sessions.filter((s) => s.at.getTime() > answeredAt).slice(0, UNDER_IN_A_ROW);
  if (fresh.length === UNDER_IN_A_ROW && fresh.every((s) => s.under)) return "under";

  if (acceptedAt != null && t - acceptedAt < BUSY_WEEKS * 7 * DAY_MS) return null;
  for (let week = 0; week < BUSY_WEEKS; week++) {
    const to = t - week * 7 * DAY_MS;
    const n = sessions.filter((s) => s.at.getTime() <= to && s.at.getTime() > to - 7 * DAY_MS);
    if (n.length < BUSY_WEEK_SESSIONS) return null;
  }
  return "busy";
}

/**
 * One round fewer, never under the floor, never over a number the hero set by hand, and never on
 * a quest the hero wrote: it runs exactly as written, like zone, global rest and the rung offer.
 */
export function lightenRounds<Q extends { rounds: number }>(
  quest: Q,
  config: { rounds?: number } | null,
  running: boolean,
  userQuest: boolean,
): Q {
  if (!running || config?.rounds !== undefined || userQuest) return quest;
  return { ...quest, rounds: Math.max(ROUNDS_RANGE.min, quest.rounds - 1) };
}

async function readMs(key: string): Promise<number | null> {
  const n = Number(await getPreference(key));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function getLightWeekAnswers(): Promise<LightWeekAnswers> {
  const [refusedAt, acceptedAt, endedAt] = await Promise.all([
    readMs(REFUSED_KEY),
    readMs(ACCEPTED_KEY),
    readMs(ENDED_KEY),
  ]);
  return { refusedAt, acceptedAt, endedAt };
}

export const acceptLightWeek = (now: Date) => setPreference(ACCEPTED_KEY, String(now.getTime()));
export const refuseLightWeek = (now: Date) => setPreference(REFUSED_KEY, String(now.getTime()));

/** Back to the normal rhythm. The acceptance stays on record, so the offer does not return at once. */
export const endLightWeek = (now: Date) => setPreference(ENDED_KEY, String(now.getTime()));

export async function isLightWeekRunning(now: Date): Promise<boolean> {
  const { acceptedAt, endedAt } = await getLightWeekAnswers();
  return lightWeekRunning(acceptedAt, now, endedAt);
}

/**
 * When the running week began, or null when none runs: the instant the ladder and tonight's
 * target are frozen at. Same answer as `isLightWeekRunning`, since both go through `lightWeekRunning`.
 */
export async function lightWeekSince(now: Date): Promise<number | null> {
  const { acceptedAt, endedAt } = await getLightWeekAnswers();
  return acceptedAt != null && lightWeekRunning(acceptedAt, now, endedAt) ? acceptedAt : null;
}

/** When the running week stops, or null when none runs. */
export async function lightWeekUntil(now: Date): Promise<Date | null> {
  const { acceptedAt, endedAt } = await getLightWeekAnswers();
  return acceptedAt != null && lightWeekRunning(acceptedAt, now, endedAt)
    ? lightWeekEndsAt(acceptedAt)
    : null;
}

/** Workouts of the last `BUSY_WEEKS` weeks, newest first, each with whether it was under. */
async function recentWorkouts(now: Date): Promise<LightWeekSession[]> {
  const since = new Date(now.getTime() - BUSY_WEEKS * 7 * DAY_MS);
  const rows = await db
    .select({ id: completedQuest.id, at: completedQuest.performedAt })
    .from(completedQuest)
    .where(and(isWorkout(), gte(completedQuest.performedAt, since)))
    .orderBy(desc(completedQuest.performedAt));
  if (rows.length === 0) return [];
  // Only strength sets vote: a neutral set (a lowered target, a movement left) is neither met nor
  // missed, and a stretch is not a target the week is meant to ease. A session is under when more
  // than half of its remaining sets missed; one left with none is not under.
  const votes = await db
    .select({
      id: completedExercises.sessionId,
      sets: sql<number>`COUNT(*)`,
      missed: sql<number>`SUM(1 - ${setMetSql})`,
    })
    .from(completedExercises)
    .where(
      and(
        inArray(
          completedExercises.sessionId,
          rows.map((r) => r.id),
        ),
        eq(completedExercises.ladderNeutral, false),
        sql`${completedExercises.exerciseId} NOT IN (SELECT id FROM exercises WHERE pattern = 'mobility')`,
      ),
    )
    .groupBy(completedExercises.sessionId);
  const under = new Set(
    votes.filter((v) => Number(v.missed) * 2 > Number(v.sets)).map((v) => v.id),
  );
  return rows.map((r) => ({ at: r.at, under: under.has(r.id) }));
}

export async function lightWeekReason(now: Date): Promise<LightWeekReason | null> {
  // A break is the rest already: offering a lighter week inside it would use up the seven days.
  if (await getActivePause(now)) return null;
  const [sessions, answers] = await Promise.all([recentWorkouts(now), getLightWeekAnswers()]);
  return lightWeekDue(sessions, answers, now);
}

/**
 * D-30: a hard set is every logged set of a movement that is not mobility, missed ones included.
 * A hero's own movement with no pattern is left out. Workouts only: an outing's legs are not sets.
 */
export async function hardSetsByPattern(
  from: Date,
): Promise<{ pattern: MovementPattern; sets: number }[]> {
  const rows = await db
    .select({ pattern: exercises.pattern, sets: sql<number>`COUNT(*)` })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .innerJoin(completedQuest, eq(completedQuest.id, completedExercises.sessionId))
    .where(
      and(
        isNotNull(exercises.pattern),
        ne(exercises.pattern, "mobility"),
        gte(completedExercises.performedAt, from),
        isWorkout(),
      ),
    )
    .groupBy(exercises.pattern)
    .orderBy(desc(sql`COUNT(*)`));
  return rows.flatMap((r) => (r.pattern ? [{ pattern: r.pattern, sets: Number(r.sets) }] : []));
}
