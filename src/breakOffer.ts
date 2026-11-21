import { differenceInCalendarDays } from "date-fns";
import { dayKey } from "@/db/dates";
import { breakOfferQuiet, getActivePause } from "@/db/pause";
import { getStreakInfo } from "@/db/streaks";

/** Days without a session after which a flame still burning (or asleep) is worth a word. */
export const BREAK_OFFER_AFTER_DAYS = 7;

/**
 * Whether Home offers a break before the flame goes out: a flame that is lit or asleep, a week
 * since the last session, no pause running, and the offer not closed this week. A pause is what
 * the flame skips, so this is the moment it helps (`getStreakInfo`, `db/pause.ts`).
 */
export async function breakOfferDue(now = new Date()): Promise<boolean> {
  const [streak, pause, quiet] = await Promise.all([
    getStreakInfo(),
    getActivePause(now),
    breakOfferQuiet(now),
  ]);
  if (pause || quiet || !streak.lastWorkoutDate) return false;
  if (streak.current === 0 && streak.dormant === 0) return false;
  const idle = differenceInCalendarDays(now, new Date(`${streak.lastWorkoutDate}T00:00:00`));
  return idle >= BREAK_OFFER_AFTER_DAYS && dayKey(now) > streak.lastWorkoutDate;
}
