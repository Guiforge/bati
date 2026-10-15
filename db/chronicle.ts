import { inArray, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { countsAsSession } from "./completed";
import {
  getBossKills,
  getOldestSessionAt,
  getPeriodFigures,
  type PeriodFigures,
  periodWindow,
} from "./journal";
import { getWeeklyQuota, longestFlameSince } from "./streaks";
import { calculateLevelFromXp, getTotalXp } from "./userLevel";
import { getVillageTier, type VillageTier } from "./village";

const { completedQuest } = schema;

/** How far back a day's flame looks: its own week and the one before it. */
const FLAME_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

export type ChronicleWindow = { year: number; from: Date; to: Date };

/**
 * The year a chronicle is about, or null outside December and January. December is the year so
 * far, because that is when such a recap is shared; January is the year just finished, whole.
 */
export function chronicleWindow(now: Date): ChronicleWindow | null {
  const month = now.getMonth();
  if (month === 11) {
    const year = now.getFullYear();
    return { year, from: new Date(year, 0, 1), to: now };
  }
  if (month === 0) {
    const year = now.getFullYear() - 1;
    return {
      year,
      from: new Date(year, 0, 1),
      to: new Date(new Date(year + 1, 0, 1).getTime() - 1),
    };
  }
  return null;
}

export type Chronicle = {
  year: number;
  /** The first of January, or the hero's first session when they arrived during the year. */
  since: Date;
  to: Date;
  figures: PeriodFigures;
  bosses: number;
  /** The longest lit run inside the year, in days: a run carried over from December is cut there. */
  longestFlame: number;
  /** The tier the village stood at when the window closed, not today's. */
  villageTier: VillageTier;
};

/**
 * The chronicle the Journal offers today: this month's window, when it holds a session. The door
 * is never drawn on a year with nothing in it, so the empty screen behind it is a deep link's.
 */
export async function chronicleToOpen(now: Date): Promise<ChronicleWindow | null> {
  const window = chronicleWindow(now);
  if (!window) return null;
  const [row] = await db
    .select({ id: completedQuest.id })
    .from(completedQuest)
    .where(periodWindow(window.from, window.to))
    .limit(1);
  return row ? window : null;
}

/** The year's figures, every one of them over the same window. Null for a year with no session. */
export async function getChronicle({ year, from, to }: ChronicleWindow): Promise<Chronicle | null> {
  // From two weeks before the year: a day's flame looks that far back, so the 1st of January is
  // lit or not as the hero saw it, though December's days are not counted.
  const rows = await db
    .select({ at: completedQuest.performedAt, counts: sql<number>`${countsAsSession()}` })
    .from(completedQuest)
    .where(periodWindow(new Date(from.getTime() - FLAME_LOOKBACK_MS), to))
    .orderBy(completedQuest.performedAt);
  const first = rows.find((r) => r.at >= from)?.at;
  if (!first) return null;
  // The flame reads only what counts as showing up, as every other flame does: a walk to the
  // letterbox is in the year's sessions and not in its flame.
  const dates = rows.filter((r) => Number(r.counts) === 1).map((r) => r.at);

  const [figures, kills, quota, xp, oldest] = await Promise.all([
    getPeriodFigures(from, to),
    getBossKills(),
    getWeeklyQuota(),
    getTotalXp(to),
    getOldestSessionAt(),
  ]);

  // A kill is dated by the session that finished it, as every other figure is: a run is stamped
  // when it was saved, and a session begun at 23:40 on the 31st is the old year's, boss and all.
  const killing = kills.flatMap((k) => (k.sessionId == null ? [] : [k.sessionId]));
  const startedAt = new Map(
    (killing.length === 0
      ? []
      : await db
          .select({ id: completedQuest.id, at: completedQuest.performedAt })
          .from(completedQuest)
          .where(inArray(completedQuest.id, killing))
    ).map((r) => [r.id, r.at]),
  );

  return {
    year,
    since: oldest && oldest < from ? from : first,
    to,
    figures,
    bosses: kills.filter((k) => {
      const at = (k.sessionId != null && startedAt.get(k.sessionId)) || k.felledAt;
      return at >= from && at <= to;
    }).length,
    longestFlame: longestFlameSince(dates, quota, from, to),
    villageTier: getVillageTier(calculateLevelFromXp(xp)),
  };
}
