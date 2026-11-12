import { eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import type { ExportSession } from "@/src/healthExport/record";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { db, schema } from "./client";
import { pointsOf } from "./gps";
import { ADMIN_CREATOR } from "./schema";

const { completedQuest, completedExercises, exercises, quests, healthExport } = schema;

/** One journal entry the export could write, and what this phone's Health Connect holds of it. */
export type ExportKey = {
  uuid: string;
  version: number;
  /** Whether the record Health Connect holds carries the route; null when never written. */
  route: boolean | null;
};

/**
 * What Health Connect is owed, derived from the journal every time, never queued: the ledger only
 * says what Health Connect already holds.
 *
 * - `owed`: the normal path. Entries this phone already wrote whose version went up (a correction,
 *   here or merged by sync), and entries this phone recorded after the switch went on.
 * - `history`: what a "send my past sessions" run would write, newest first: every eligible entry
 *   Health Connect does not hold yet, whichever phone recorded it.
 * - `remove`: records whose entry left the journal.
 */
export type HealthExportPlan = {
  owed: ExportKey[];
  history: ExportKey[];
  remove: string[];
  /** Entries Health Connect refused at their current version. */
  failed: number;
  /** Eligible entries, and how many of them this phone has written or tried. */
  total: number;
  done: number;
};

/**
 * The version an entry is written at: when it was last corrected, its sets or (an outing) its typed
 * distance, here or on another device. Both stamps travel with sync and only go up.
 */
function versionOf(row: { setsEditedAt: Date | null; byHandEditedAt: Date | null }): number {
  return Math.max(row.setsEditedAt?.getTime() ?? 0, row.byHandEditedAt?.getTime() ?? 0);
}

/**
 * What can be sent: performed in Bati's session player. A quest session, or an outing, measured
 * or with the distance the hero typed for it. A session written down after the fact
 * (`byHand = 'session'`) never.
 */
const eligible = or(isNull(completedQuest.byHand), eq(completedQuest.byHand, "distance"));

type Row = {
  uuid: string | null;
  performedAt: Date;
  durationSeconds: number | null;
  originDevice: string | null;
  setsEditedAt: Date | null;
  byHandEditedAt: Date | null;
  written: number | null;
  route: boolean | null;
  failed: string | null;
};

const rowColumns = {
  uuid: completedQuest.uuid,
  performedAt: completedQuest.performedAt,
  durationSeconds: completedQuest.durationSeconds,
  originDevice: completedQuest.originDevice,
  setsEditedAt: completedQuest.setsEditedAt,
  byHandEditedAt: completedQuest.byHandEditedAt,
  written: healthExport.version,
  route: healthExport.route,
  failed: healthExport.failed,
};

/** Owed by the normal path, which writes on its own: see `HealthExportPlan.owed`. */
function owedNormally(row: Row, deviceId: string, sinceMs: number): boolean {
  if (row.written !== null) return row.written < versionOf(row);
  const endedMs = row.performedAt.getTime() + (row.durationSeconds ?? 0) * 1000;
  // Seconds, like the journal: a session ending in the switch's own second counts.
  return row.originDevice === deviceId && endedMs >= Math.floor(sinceMs / 1000) * 1000;
}

function keyOf(row: Row & { uuid: string }): ExportKey {
  return {
    uuid: row.uuid,
    version: versionOf(row),
    route: row.written === null ? null : !!row.route,
  };
}

export async function healthExportPlan(deviceId: string, since: Date): Promise<HealthExportPlan> {
  const rows = (await db
    .select(rowColumns)
    .from(completedQuest)
    .leftJoin(healthExport, eq(healthExport.sessionUuid, completedQuest.uuid))
    .where(sql`${completedQuest.uuid} IS NOT NULL AND ${eligible}`)
    .orderBy(completedQuest.performedAt, completedQuest.uuid)) as (Row & { uuid: string })[];

  const sinceMs = since.getTime();
  const owed: ExportKey[] = [];
  const history: ExportKey[] = [];
  let failed = 0;
  let done = 0;
  for (const row of rows) {
    if (row.written !== null) done++;
    if (owedNormally(row, deviceId, sinceMs)) owed.push(keyOf(row));
    else if (row.written === null) history.push(keyOf(row));
    else if (row.failed !== null) failed++;
  }
  history.reverse();

  const gone = await db
    .select({ uuid: healthExport.sessionUuid })
    .from(healthExport)
    .where(
      notInArray(
        healthExport.sessionUuid,
        db
          .select({ uuid: sql<string>`${completedQuest.uuid}` })
          .from(completedQuest)
          .where(sql`${completedQuest.uuid} IS NOT NULL`),
      ),
    );

  return { owed, history, remove: gone.map((r) => r.uuid), failed, total: rows.length, done };
}

/**
 * What the session detail says about one entry: "sent" when Health Connect holds its current
 * version, "waiting" when the export owes it, nothing otherwise (never sent, refused, or not this
 * phone's to send on its own).
 */
export async function healthExportStatusOf(
  sessionUuid: string,
  deviceId: string,
  since: Date,
  historyRunning: boolean,
): Promise<"sent" | "waiting" | null> {
  const [row] = (await db
    .select(rowColumns)
    .from(completedQuest)
    .leftJoin(healthExport, eq(healthExport.sessionUuid, completedQuest.uuid))
    .where(sql`${completedQuest.uuid} = ${sessionUuid} AND ${eligible}`)
    .limit(1)) as Row[];
  if (!row) return null;
  if (owedNormally(row, deviceId, since.getTime())) return "waiting";
  if (row.written === null) return historyRunning ? "waiting" : null;
  return row.failed === null ? "sent" : null;
}

/**
 * The entries behind `keys`, in the same order, as the mapper takes them. `withRoute` says, per
 * entry, whether its record carries the route; the fixes are only read for those.
 */
export async function exportSessions(
  keys: readonly ExportKey[],
  language: AppLanguage,
  fallbackTitle: string,
  withRoute: (key: ExportKey) => boolean,
): Promise<ExportSession[]> {
  if (keys.length === 0) return [];
  const rows = await db
    .select({ session: completedQuest, quest: quests })
    .from(completedQuest)
    .leftJoin(quests, eq(quests.id, completedQuest.questId))
    .where(
      inArray(
        completedQuest.uuid,
        keys.map((k) => k.uuid),
      ),
    );
  const byUuid = new Map(rows.map((r) => [r.session.uuid, r]));
  const sets = await setsOf(
    rows.filter((r) => r.session.outing === null).map((r) => r.session.id),
    language,
  );

  const sessions: ExportSession[] = [];
  for (const key of keys) {
    const row = byUuid.get(key.uuid);
    if (!row) continue;
    const { session, quest } = row;
    const route = session.outing !== null && withRoute(key);
    sessions.push({
      uuid: key.uuid,
      version: key.version,
      title: quest ? localizedTitle(quest, language) : fallbackTitle,
      performedAt: session.performedAt,
      durationSeconds: session.durationSeconds,
      tzOffsetMin: session.tzOffsetMin,
      sets: session.outing === null ? (sets.get(session.id) ?? []) : [],
      outing: session.outing,
      distanceM: session.outing === null ? null : session.leaguesM,
      route: route ? await pointsOf(key.uuid) : null,
    });
  }
  return sessions;
}

async function setsOf(sessionIds: number[], language: AppLanguage) {
  const bySession = new Map<number, ExportSession["sets"]>();
  if (sessionIds.length === 0) return bySession;
  const rows = await db
    .select({ set: completedExercises, exercise: exercises })
    .from(completedExercises)
    .innerJoin(exercises, eq(exercises.id, completedExercises.exerciseId))
    .where(inArray(completedExercises.sessionId, sessionIds));
  for (const { set, exercise } of rows) {
    const list = bySession.get(set.sessionId) ?? [];
    list.push({
      enName: exercise.enName,
      seed: exercise.creator === ADMIN_CREATOR,
      name: localizedName(exercise, language),
      type: set.resultType,
      value: set.resultValue,
      sides: set.sides,
      at: set.performedAt,
    });
    bySession.set(set.sessionId, list);
  }
  return bySession;
}

/** Health Connect now holds this entry at this version, with or without its route. */
export async function markHealthExported(
  sessionUuid: string,
  version: number,
  route = false,
): Promise<void> {
  await db
    .insert(healthExport)
    .values({ sessionUuid, version, route, failed: null })
    .onConflictDoUpdate({
      target: healthExport.sessionUuid,
      set: { version, route, failed: null },
    });
}

/**
 * Health Connect refused this version of the entry. Not tried again until it changes; whatever an
 * earlier version left in Health Connect stays, and so does its route choice.
 */
export async function markHealthFailed(
  sessionUuid: string,
  version: number,
  reason: string,
): Promise<void> {
  await db
    .insert(healthExport)
    .values({ sessionUuid, version, failed: reason })
    .onConflictDoUpdate({ target: healthExport.sessionUuid, set: { version, failed: reason } });
}

/** Health Connect no longer holds these. */
export async function forgetHealthExported(sessionUuids: string[]): Promise<void> {
  if (sessionUuids.length === 0) return;
  await db.delete(healthExport).where(inArray(healthExport.sessionUuid, sessionUuids));
}
