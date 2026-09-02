import { eq, sql } from "drizzle-orm";
import type { LocationFix } from "@/modules/bati-location";
import { db, schema } from "./client";

const { gpsPoints, completedQuest } = schema;

/**
 * The scaled-integer codec, and the only place that knows the scales.
 *
 * Four consumers read these rows — the recap map, the history, the GPX exporter and the
 * orphan-resume recompute — and four copies of `/ 1e7` is how one of them ends up dividing by
 * 1e6 and drawing a track in the wrong hemisphere while the others look fine. Every read goes
 * through `decode`, every write through `encode`, and a property test round-trips them.
 */
export function encode(sessionId: string, fix: LocationFix) {
  return {
    sessionId,
    t: fix.t,
    latE7: Math.round(fix.lat * 1e7),
    lonE7: Math.round(fix.lon * 1e7),
    eleCm: fix.ele === null ? null : Math.round(fix.ele * 100),
    accDm: Math.round(fix.acc * 10),
    speedCms: fix.speed === null ? null : Math.round(fix.speed * 100),
    distFromPrevCm: Math.round(fix.distFromPrev * 100),
  };
}

export type GpsPointRow = ReturnType<typeof encode>;

export function decode(row: GpsPointRow): LocationFix {
  return {
    t: row.t,
    lat: row.latE7 / 1e7,
    lon: row.lonE7 / 1e7,
    ele: row.eleCm === null ? null : row.eleCm / 100,
    acc: row.accDm / 10,
    speed: row.speedCms === null ? null : row.speedCms / 100,
    distFromPrev: row.distFromPrevCm / 100,
  };
}

/**
 * Write a batch of fixes.
 *
 * `INSERT OR IGNORE`: the primary key is `(sessionId, t)` and `t` is the system clock, which
 * steps backwards when the phone syncs time. One duplicate timestamp must cost one point, never
 * the whole batch — the alternative is a trace that stops mid-run for a reason nothing reports.
 */
export async function appendPoints(sessionId: string, fixes: readonly LocationFix[]) {
  if (fixes.length === 0) return;
  await db
    .insert(gpsPoints)
    .values(fixes.map((fix) => encode(sessionId, fix)))
    .onConflictDoNothing();
}

/** Every fix of one session, in the order it arrived. */
export async function pointsOf(sessionId: string): Promise<LocationFix[]> {
  const rows = await db
    .select()
    .from(gpsPoints)
    .where(eq(gpsPoints.sessionId, sessionId))
    .orderBy(gpsPoints.t);
  return rows.map(decode);
}

/**
 * Whether a session recorded any ground at all.
 *
 * The journal's door to the recap, and the reason it is `limit(1)` rather than `pointsOf().length`:
 * every strength quest in the app has no points, and asking that question must not read a
 * 45-minute trace to answer "none".
 */
export async function hasPoints(sessionId: string): Promise<boolean> {
  const rows = await db
    .select({ t: gpsPoints.t })
    .from(gpsPoints)
    .where(eq(gpsPoints.sessionId, sessionId))
    .limit(1);
  return rows.length > 0;
}

/**
 * One league is a kilometre here. The one place that knows the scale: the road's floors, the
 * oath's target and every "N leagues" a screen prints divide by this.
 */
export const METRES_PER_LEAGUE = 1000;

/**
 * Leagues: the second currency, in metres.
 *
 * Summed over *sessions* rather than over fixes, and that is not a detail. A
 * `SUM(distFromPrevCm)` is exactly the sum `src/gps/track.ts` refuses: it counts drift while the
 * hero stood still, and it counts the length of a teleport the reducer broke the line at. It
 * also counted points no session owned — a run in progress, or one discarded before the next
 * sweep. One outing had two lengths, and the larger one grew the village.
 *
 * `completed_sessions.leaguesM` is what the reducer decided, written once at save. Metres and
 * never seconds; see docs/designs/expeditions.md.
 */
export async function totalLeaguesM(): Promise<number> {
  const rows = await db
    .select({ m: sql<number>`coalesce(sum(${completedQuest.leaguesM}), 0)` })
    .from(completedQuest);
  return rows[0]?.m ?? 0;
}

/** What the session that owns a trace says about itself: which quest, when, how far, how long. */
export type OutingSession = {
  questId: number | null;
  performedAt: Date;
  /** The reducer's metres, written once at save. Null on a session that measured no ground. */
  leaguesM: number | null;
  /**
   * The reducer's moving seconds, written once at save beside the metres. Null on a session that
   * measured no ground, and on every outing saved before 0046 — the recap says nothing about
   * their pace rather than replaying a trace it cannot prove is whole.
   */
  movingSeconds: number | null;
};

/**
 * The session behind a trace, found by the name the points are filed under.
 *
 * The recap is reached by `uuid` from two places and knows nothing else about the run, so
 * without this it had to re-derive the distance from the fixes — a third answer to "how far did
 * I go", next to the panel's and the village's. `leaguesM` is the one the road was paid in, and
 * it is what the recap prints.
 */
export async function outingSession(sessionId: string): Promise<OutingSession | null> {
  const rows = await db
    .select({
      questId: completedQuest.questId,
      performedAt: completedQuest.performedAt,
      leaguesM: completedQuest.leaguesM,
      movingSeconds: completedQuest.movingSeconds,
    })
    .from(completedQuest)
    .where(eq(completedQuest.uuid, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    questId: row.questId ?? null,
    performedAt: row.performedAt,
    leaguesM: row.leaguesM ?? null,
    movingSeconds: row.movingSeconds ?? null,
  };
}

/**
 * Sessions whose points were written but whose row never was: the app died mid-run.
 *
 * Points are written while the session is still going, so a crash leaves a trace with no session
 * to belong to. Finding them is a query rather than a flag because a flag would be a second
 * writer for a fact the data already carries.
 */
export async function orphanedSessionIds(): Promise<string[]> {
  // A subquery rather than reading every uuid into JS and building a `NOT IN (...)` from it: that
  // list grows one entry per session for the life of the install, and this runs on every home
  // mount.
  const rows = await db
    .selectDistinct({ sessionId: gpsPoints.sessionId })
    .from(gpsPoints)
    .where(
      sql`${gpsPoints.sessionId} not in (select ${completedQuest.uuid} from ${completedQuest} where ${completedQuest.uuid} is not null)`,
    );
  return rows.map((r) => r.sessionId);
}

/** Drop a run the hero chose not to keep. Points are the only thing an orphan ever wrote. */
export async function deletePoints(sessionId: string): Promise<void> {
  await db.delete(gpsPoints).where(eq(gpsPoints.sessionId, sessionId));
}

/**
 * Throw away ground nothing will ever claim.
 *
 * Points are written every second while a session runs, so an app that dies mid-outing leaves a
 * trace with no session and no snapshot to resume from. Nobody is coming for those: they are not
 * in the journal, no screen can reach them, and they would still be summed into the leagues that
 * grow the High Road — a village built by a run that, as far as the hero is concerned, never
 * happened.
 *
 * `keep` is the session the recovery banner is offering, whose points are exactly the ones that
 * must survive. Passing it is not optional in practice: sweeping without it deletes the trace of
 * the run the hero is about to resume.
 */
export async function sweepOrphanedPoints(keep: string | null): Promise<number> {
  const orphans = (await orphanedSessionIds()).filter((id) => id !== keep);
  for (const id of orphans) await deletePoints(id);
  return orphans.length;
}
