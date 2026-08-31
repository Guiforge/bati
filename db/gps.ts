import { eq, notInArray, sql } from "drizzle-orm";
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
    // Bearing is not stored: nothing reads it, and a column nobody consumes is the thing this
    // codebase deletes rather than carries. `LocationFix` still declares it, so it is filled
    // with what a re-read can honestly say.
    bearing: null,
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
 * Leagues: the second currency, in metres.
 *
 * Metres and never seconds, and never a column holding both — an hour's walk at 3600 beside a
 * 3 km run at 3000 would land within a fifth of each other by accident, which is the unit-mixing
 * bug `db/workUnits.ts` exists to correct, one storey up. See docs/designs/expeditions.md.
 *
 * Its own query rather than `getStyleVolumes`, which reads `expedition` as 0 by design: that is
 * the point of two currencies. Nothing here ever becomes a rep-equivalent.
 */
export async function totalLeaguesM(): Promise<number> {
  const rows = await db
    .select({ cm: sql<number>`coalesce(sum(${gpsPoints.distFromPrevCm}), 0)` })
    .from(gpsPoints);
  return (rows[0]?.cm ?? 0) / 100;
}

/**
 * Sessions whose points were written but whose row never was: the app died mid-run.
 *
 * Points are written while the session is still going, so a crash leaves a trace with no session
 * to belong to. Finding them is a query rather than a flag because a flag would be a second
 * writer for a fact the data already carries.
 */
export async function orphanedSessionIds(): Promise<string[]> {
  const known = await db.select({ uuid: completedQuest.uuid }).from(completedQuest);
  const uuids = known.map((r) => r.uuid).filter((u): u is string => u !== null);
  const rows = await db
    .selectDistinct({ sessionId: gpsPoints.sessionId })
    .from(gpsPoints)
    .where(uuids.length === 0 ? undefined : notInArray(gpsPoints.sessionId, uuids));
  return rows.map((r) => r.sessionId);
}

/** Drop a run the hero chose not to keep. Points are the only thing an orphan ever wrote. */
export async function deletePoints(sessionId: string): Promise<void> {
  await db.delete(gpsPoints).where(eq(gpsPoints.sessionId, sessionId));
}
