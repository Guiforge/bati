import { differenceInCalendarDays } from "date-fns";
import { getSessionAggregates } from "@/db/completed";
import { dayKey } from "@/db/dates";
import { preferences } from "@/db/preferences";
import { dayOf } from "@/db/reminders";
import { syncAccount, syncHealth } from "@/src/deviceSync";
import { checkForUpdate } from "@/src/updateCheck";
import { hasUnseenNotes } from "@/src/whatsNew";

/**
 * "Protect your hero": the card that asks for a backup before the phone is lost, not after.
 *
 * Without an account the only copy of a hero is on one phone, and the people who lose a year of
 * training are the ones who never opened Settings. So after a few sessions, and only while nothing
 * protects them, Home says so once and sends them to the setting. A hero who already has a backup
 * that works never sees it.
 */

/** Sessions before it speaks. The first few are the hero deciding whether to stay. */
export const PROTECT_AFTER_SESSIONS = 5;

/**
 * How long closing it keeps it quiet, by how many times it was closed: a month, then a quarter,
 * then for good. A hero who closed it three times has decided, and a card that returns forever
 * is the one thing in a backup feature that can make someone resent it.
 */
export const PROTECT_SILENCE_DAYS = [30, 90] as const;

/** A backup older than this is not protecting anyone: the daily run stopped. */
export const BACKUP_STALE_DAYS = 7;

/** Whole days between `day` (a `yyyy-MM-dd` key) and `now`, never negative. */
export function daysSince(day: string, now: Date): number {
  return Math.max(0, differenceInCalendarDays(now, dayOf(day)));
}

/**
 * A copy of this hero exists somewhere that is not this phone, and it is recent.
 *
 * Two ways: the automatic backup folder, or a device sync that has succeeded lately (the data is
 * on the server). A folder with no stamped day is not: `enableAutoBackup` and the daily run both
 * stamp after a write that landed, so a folder without a day is one whose writes keep failing (a
 * revoked permission, a card pulled out), which is the hero this card is for.
 */
export async function heroIsProtected(now: Date = new Date()): Promise<boolean> {
  const folder = await preferences.getBackupFolderUri();
  if (folder !== null) {
    const day = await preferences.getLastAutoBackupDay();
    if (day !== null && daysSince(day, now) < BACKUP_STALE_DAYS) return true;
  }

  if ((await syncAccount()) !== null) {
    const { lastSuccessAt } = await syncHealth();
    if (
      lastSuccessAt !== null &&
      daysSince(dayKey(new Date(lastSuccessAt)), now) < BACKUP_STALE_DAYS
    ) {
      return true;
    }
  }
  return false;
}

export async function protectCardVisible(now: Date = new Date()): Promise<boolean> {
  // Same silence as the reminder line: a new release or its notes already hold the column.
  if ((await hasUnseenNotes()) || (await checkForUpdate()) !== null) return false;

  const { totalSessions } = await getSessionAggregates();
  if (totalSessions < PROTECT_AFTER_SESSIONS) return false;

  const closed = await preferences.getProtectDismissedDay();
  if (closed !== null) {
    const silence = PROTECT_SILENCE_DAYS[(await closings()) - 1];
    if (silence === undefined || daysSince(closed, now) < silence) return false;
  }

  return !(await heroIsProtected(now));
}

/** How many times it was closed. A day with no count is a close from before the count existed. */
async function closings(): Promise<number> {
  const counted = await preferences.getProtectDismissals();
  return Math.max(counted, (await preferences.getProtectDismissedDay()) === null ? 0 : 1);
}

export async function dismissProtectCard(now: Date = new Date()): Promise<void> {
  const times = await closings();
  // The count first: a failure between the two leaves the shorter silence, never a close that
  // reads as "never closed".
  await preferences.setProtectDismissals(times + 1);
  await preferences.setProtectDismissedDay(dayKey(now));
}

/** Days since the last automatic backup, or `null` when there is none to speak of. */
export async function daysSinceLastBackup(now: Date = new Date()): Promise<number | null> {
  if ((await preferences.getBackupFolderUri()) === null) return null;
  const day = await preferences.getLastAutoBackupDay();
  return day === null ? null : daysSince(day, now);
}
