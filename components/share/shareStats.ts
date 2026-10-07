import type { TFunction } from "i18next";
import { HIDDEN_ENDS_M, trimEnds } from "@/components/journal/tracePreview";
import { formatDistance, formatElevation, formatRate, rateKind } from "@/constants/distanceFormat";
import { formatDuration } from "@/db";
import type { CompletedSession } from "@/db/completed";
import type { DistanceUnit } from "@/db/preferences";
import { formatCount } from "@/db/targets";
import type { LngLat } from "@/src/gps/trace";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

export type ShareStat = { value: string; label: string };

type Stats = (ShareStat | null)[];

/** What it paid, signed like the journal's row ("+30 XP"), so it reads as a gain and not a score. */
function xp(session: CompletedSession, t: TFunction, language: AppLanguage): ShareStat | null {
  if (session.xpEarned <= 0) return null;
  return { value: `+${formatCount(language, session.xpEarned)}`, label: t("share.xp") };
}

/** Ground first, then the figures the journal's own Ground panel gives, from the same columns. */
function outingStats(
  session: CompletedSession,
  t: TFunction,
  language: AppLanguage,
  unit: DistanceUnit,
): Stats {
  const metres = session.leaguesM ?? 0;
  const moving = session.movingSeconds ?? session.durationSeconds ?? 0;
  const ascent = session.ascentM ?? 0;
  const paced = metres > 0 && moving > 0;
  return [
    metres > 0
      ? { value: formatDistance(metres, unit, language), label: t("share.distance") }
      : null,
    moving > 0
      ? { value: formatDuration(moving, language), label: t("journal.ground_moving") }
      : null,
    paced
      ? {
          value: formatRate(metres, moving * 1000, unit, language, session.outing),
          label: t(`journal.ground_${rateKind(session.outing)}`),
        }
      : null,
    ascent > 0
      ? { value: formatElevation(ascent, unit), label: t("journal.ground_climbed") }
      : null,
    xp(session, t, language),
  ];
}

/** A workout's length, its rounds and what it paid. */
function workoutStats(session: CompletedSession, t: TFunction, language: AppLanguage): Stats {
  const rounds = new Set(session.exercises.map((e) => e.roundIndex)).size;
  const duration = session.durationSeconds ?? 0;
  return [
    duration > 0 ? { value: formatDuration(duration, language), label: t("share.duration") } : null,
    rounds > 0 ? { value: formatCount(language, rounds), label: t("share.rounds") } : null,
    xp(session, t, language),
  ];
}

/**
 * The numbers under a shared card, each one only when it measured something. A zero is left out
 * rather than drawn: "0 m climbed" on a flat walk reads as a failure.
 */
export function shareStats(
  session: CompletedSession,
  t: TFunction,
  language: AppLanguage,
  unit: DistanceUnit,
): ShareStat[] {
  const stats =
    session.outing != null
      ? outingStats(session, t, language, unit)
      : workoutStats(session, t, language);
  return stats.filter((s): s is ShareStat => s !== null);
}

/**
 * What the card's kicker calls the session: the boss it felled, else the record it set, else what
 * kind of session it was. A record counts from the row's flag as well as its detail, so a session
 * from before the detail was kept (`0051`) is announced as the journal's list announces it.
 */
export function shareKicker(
  log: { records: readonly unknown[]; session: Pick<CompletedSession, "hasNewRecords" | "outing"> },
  felledBoss: boolean,
): string {
  if (felledBoss) return "share.kicker_kill";
  if (log.records.length > 0 || log.session.hasNewRecords) return "share.kicker_record";
  return log.session.outing != null ? "share.kicker_outing" : "share.kicker_quest";
}

/**
 * The run as a picture that leaves the phone may show it: without its first and last stretch,
 * map or not, since a loop from the front door draws the street in front of it either way. Empty
 * for a run too short to keep anything, which then shares as a workout does, with its painting.
 */
export function sharedLine(trace: readonly (readonly LngLat[])[]): (readonly LngLat[])[] {
  return trimEnds(trace, HIDDEN_ENDS_M);
}
