import type { TFunction } from "i18next";
import type { QuestLogData } from "@/components/journal/QuestLog";
import { getCompletedSessionById } from "@/db";
import { pointsOf } from "@/db/gps";
import {
  getFallenRecords,
  getKillReport,
  getMuscleShift,
  getQuestStanding,
  getSessionRung,
  isLatestSession,
  type KillReport as KillReportData,
} from "@/db/journal";
import { listQuestTemplates } from "@/db/quests";
import { getUserLevelInfo } from "@/db/userLevel";
import { type LngLat, toTrace } from "@/src/gps/trace";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";

/**
 * One finished session, read the way the journal shows it. The journal page and the share screen
 * both read through here, so the picture a hero sends says what the page they came from says.
 */
export type LoadedSession =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; log: QuestLogData; kill: KillReportData | null };

/**
 * The run's own line, or nothing.
 *
 * `toTrace` is what the recap draws from, and its `path` is already one part per unbroken run,
 * which is what puts the gaps in: the preview query downsamples and drops the clock. Never allowed
 * to fail the screen: a missing trace is not worth losing the session over.
 */
async function traceFor(uuid: string | null): Promise<readonly (readonly LngLat[])[]> {
  if (!uuid) return [];
  const fixes = await pointsOf(uuid).catch((error) => {
    reportError("journal.trace", error);
    return [];
  });
  if (fixes.length < 2) return [];
  return toTrace(fixes).path.geometry.coordinates as LngLat[][];
}

/**
 * The session as this screen shows it. Outside the component because the React Compiler cannot
 * lower a `try` holding `?.` or `??`, and skipped the whole screen over the one this used to sit in.
 */
export async function readSession(
  id: number,
  language: AppLanguage,
  t: TFunction,
): Promise<LoadedSession> {
  const session = await getCompletedSessionById(id);
  if (!session) {
    return { status: "error", message: t("journal.session_not_found") };
  }
  const [quests, trace, standing, records, shift, rung, latest, level, kill] = await Promise.all([
    listQuestTemplates(),
    traceFor(session.uuid),
    getQuestStanding(session),
    getFallenRecords(session),
    getMuscleShift(session),
    getSessionRung(session),
    isLatestSession(session),
    getUserLevelInfo(),
    getKillReport(session),
  ]);
  const quest = session.questId ? quests.find((q) => q.id === session.questId) : null;
  return {
    status: "ready",
    kill,
    log: {
      session,
      questTitle: quest ? localizedTitle(quest, language) : t("journal.own_quest"),
      questImage: quest?.imagePath ?? null,
      trace,
      standing,
      records,
      shift,
      rung,
      latest,
      level,
    },
  };
}
