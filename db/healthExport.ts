import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import type { ExportSession } from "@/src/healthExport/record";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { db, schema } from "./client";
import { ADMIN_CREATOR } from "./schema";

const { completedQuest, completedExercises, exercises, quests, healthExport } = schema;

/** What Health Connect is owed: sessions to write or rewrite, and records to take back. */
export type HealthExportWork = { write: ExportSession[]; remove: string[] };

/**
 * The version a session is written at: when its sets were last corrected, here or on another
 * device (`setsEditedAt` travels with sync, the later side wins), so it only ever goes up.
 */
function versionOf(setsEditedAt: Date | null): number {
  return setsEditedAt?.getTime() ?? 0;
}

/**
 * Derived from the journal every time, never queued: the ledger only says what Health Connect
 * already holds.
 *
 * A session is owed when this phone recorded it in the session player (`originDevice`, nothing
 * typed by hand, not an outing) and it ended after the switch was turned on, or when this phone
 * already wrote it and its sets were corrected since. A record is taken back when its session is
 * no longer in the journal, deleted here or through sync.
 */
export async function healthExportWork(
  deviceId: string,
  since: Date,
  language: AppLanguage,
  fallbackTitle: string,
): Promise<HealthExportWork> {
  const rows = await db
    .select({ session: completedQuest, quest: quests, written: healthExport.version })
    .from(completedQuest)
    .leftJoin(quests, eq(quests.id, completedQuest.questId))
    .leftJoin(healthExport, eq(healthExport.sessionUuid, completedQuest.uuid))
    .where(
      and(
        eq(completedQuest.originDevice, deviceId),
        isNull(completedQuest.byHand),
        isNull(completedQuest.outing),
        or(
          sql`${healthExport.sessionUuid} IS NOT NULL`,
          sql`${completedQuest.performedAt} + coalesce(${completedQuest.durationSeconds}, 0) >= ${Math.floor(since.getTime() / 1000)}`,
        ),
      ),
    )
    .orderBy(completedQuest.performedAt);

  const owed = rows.filter(
    (r) =>
      r.session.uuid !== null &&
      (r.written === null || r.written < versionOf(r.session.setsEditedAt)),
  );
  const sets = await setsOf(
    owed.map((r) => r.session.id),
    language,
  );

  const write = owed.map(({ session, quest }) => ({
    uuid: session.uuid ?? "",
    version: versionOf(session.setsEditedAt),
    title: quest ? localizedTitle(quest, language) : fallbackTitle,
    performedAt: session.performedAt,
    durationSeconds: session.durationSeconds,
    tzOffsetMin: session.tzOffsetMin,
    sets: sets.get(session.id) ?? [],
  }));

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

  return { write, remove: gone.map((r) => r.uuid) };
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

/** Health Connect now holds this session at this version. */
export async function markHealthExported(sessionUuid: string, version: number): Promise<void> {
  await db
    .insert(healthExport)
    .values({ sessionUuid, version })
    .onConflictDoUpdate({ target: healthExport.sessionUuid, set: { version } });
}

/** Health Connect no longer holds these. */
export async function forgetHealthExported(sessionUuids: string[]): Promise<void> {
  if (sessionUuids.length === 0) return;
  await db.delete(healthExport).where(inArray(healthExport.sessionUuid, sessionUuids));
}
