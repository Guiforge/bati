import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { type AchievementProgress, getAllAchievementsWithProgress } from "@/db/achievements";
import { dayKey } from "@/db/dates";
import {
  type DayActivity,
  getActivityDays,
  getBossKills,
  getJournalVersion,
  getOldestSessionAt,
  getPeriodFigures,
  getRecordWall,
  getStarterWall,
  monthWindows,
  nextOnShelf,
  type PeriodFigures,
  type WallEntry,
} from "@/db/journal";
import { getMuscleBalance, type MuscleBalance } from "@/db/muscleBalance";
import { type FlameDetail, getFlameDetail } from "@/db/streaks";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { getWeekXpPerSession } from "@/db/village";
import { reportError } from "@/src/reportError";

const DAY_MS = 24 * 60 * 60 * 1000;

export type JournalStats = {
  now: Date;
  /** Nothing logged, ever: the first day's wall and sentence. */
  isFirstDay: boolean;
  trainedToday: boolean;
  wall: WallEntry[];
  flame: FlameDetail;
  /** The last seven days, oldest first, today last. */
  week: (DayActivity | null)[];
  month: {
    current: PeriodFigures;
    previous: PeriodFigures;
    previousFrom: Date;
    previousTo: Date;
    days: number;
    activity: Map<string, DayActivity>;
    /** Days with a quest this month. */
    questDays: number;
  };
  /** Every period at once, for the veteran's sentence. */
  allTime: PeriodFigures;
  firstSessionAt: Date | null;
  balance: MuscleBalance;
  reps30: number;
  level: UserLevelInfo;
  xpPerSession: number | null;
  shelf: { unlocked: number; total: number; next: AchievementProgress | null };
  bosses: number;
};

async function loadJournalStats(): Promise<JournalStats> {
  const now = new Date();
  const windows = monthWindows(now);
  const weekFrom = new Date(now);
  weekFrom.setHours(0, 0, 0, 0);
  weekFrom.setDate(weekFrom.getDate() - 6);
  const from = weekFrom < windows.current.from ? weekFrom : windows.current.from;

  const [
    wall,
    flame,
    current,
    previous,
    allTime,
    activity,
    balance,
    last30,
    level,
    xpPerSession,
    achievements,
    kills,
  ] = await Promise.all([
    getRecordWall(4),
    getFlameDetail(now),
    getPeriodFigures(windows.current.from, now),
    getPeriodFigures(windows.previous.from, windows.previous.to),
    getPeriodFigures(null, now),
    getActivityDays(from, now),
    getMuscleBalance("30d"),
    getPeriodFigures(new Date(now.getTime() - 30 * DAY_MS), now),
    getUserLevelInfo(),
    getWeekXpPerSession(now),
    getAllAchievementsWithProgress(),
    getBossKills(),
  ]);

  const isFirstDay = allTime.quests + allTime.outings === 0;

  const week: (DayActivity | null)[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    week.push(activity.get(dayKey(day)) ?? null);
  }

  const monthPrefix = dayKey(windows.current.from).slice(0, 8);
  let questDays = 0;
  for (const [key, kind] of activity) {
    // A day with a quest and an outing is still a day trained: `"both"` counts, only a walk alone
    // does not.
    if (key.startsWith(monthPrefix) && kind !== "outing") questDays++;
  }

  return {
    now,
    isFirstDay,
    trainedToday: activity.has(dayKey(now)),
    wall: wall.length > 0 ? wall : await getStarterWall(),
    flame,
    week,
    month: {
      current,
      previous,
      previousFrom: windows.previous.from,
      previousTo: windows.previous.to,
      days: windows.days,
      activity,
      questDays,
    },
    allTime,
    firstSessionAt: isFirstDay ? null : await getOldestSessionAt(),
    balance,
    reps30: last30.reps,
    level,
    xpPerSession,
    shelf: {
      unlocked: achievements.filter((a) => a.isUnlocked).length,
      total: achievements.length,
      next: nextOnShelf(achievements),
    },
    bosses: kills.length,
  };
}

/**
 * Everything the stats page shows, read in one pass, and again only when something changed.
 *
 * One reader for the whole page rather than a fetch per card: the old tab mounted eight cards that
 * each fired their own query a frame apart, and a pull-to-refresh had to remount them all to be
 * sure. A focus reads `getJournalVersion` first and stops there when nothing moved since the last
 * read; `reload` (pull-to-refresh) always reads. Null until the first read lands; a failed read
 * keeps what was already on screen.
 */
export function useJournalStats(): { stats: JournalStats | null; reload: () => Promise<void> } {
  const [stats, setStats] = useState<JournalStats | null>(null);
  const shownVersion = useRef<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    // The read and its error path apart: the React Compiler cannot lower the `&&` inside a `try`,
    // and skipped this hook over it.
    const read = async () => {
      const version = await getJournalVersion();
      if (!force && version === shownVersion.current) return;
      setStats(await loadJournalStats());
      shownVersion.current = version;
    };
    await read().catch((error: unknown) => reportError("journal.stats", error));
  }, []);

  const reload = useCallback(() => load(true), [load]);

  useFocusEffect(
    useCallback(() => {
      load(false).catch((error) => reportError("journal.stats", error));
    }, [load]),
  );

  return { stats, reload };
}
