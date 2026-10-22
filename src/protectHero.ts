import { differenceInCalendarDays } from "date-fns";
import { getSessionAggregates } from "@/db/completed";
import { dayKey } from "@/db/dates";
import { preferences } from "@/db/preferences";
import { dayOf } from "@/db/reminders";
import { deviceIsSecure } from "@/modules/bati-save";
import { databaseBytes } from "@/src/databaseSize";
import { syncAccount, syncHealth } from "@/src/deviceSync";

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

/**
 * Past this size the hero is heading for Google's 25 MB limit on Android's automatic backup, past
 * which it copies nothing new. Photos (J-01) and outing traces fill it; the warning leaves room to
 * act before the copy freezes.
 */
export const HEAVY_DATABASE_BYTES = 20 * 1024 * 1024;

/** A heavy hero is asked about once a month at most, whatever the earlier cards were told. */
export const HEAVY_SILENCE_DAYS = 30;

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

/**
 * Which card to show, if any. `"heavy"` is the same card with another text, for a hero whose
 * database is above `HEAVY_DATABASE_BYTES` with no backup of their own: the one case where the
 * silence after a third close must not be for good, because the cost of ignoring it grows with
 * every photo. It returns monthly instead. `"noLock"` outranks it, with the same monthly return: a
 * phone with no screen lock gets no Android backup at all, so this phone is the only copy.
 */
export type ProtectCardKind = "plain" | "heavy" | "noLock";

export async function protectCardKind(now: Date = new Date()): Promise<ProtectCardKind | null> {
  const { totalSessions } = await getSessionAggregates();
  if (totalSessions < PROTECT_AFTER_SESSIONS) return null;
  if (await heroIsProtected(now)) return null;

  const kind: ProtectCardKind = !deviceIsSecure()
    ? "noLock"
    : databaseBytes() > HEAVY_DATABASE_BYTES
      ? "heavy"
      : "plain";
  const closed = await preferences.getProtectDismissedDay();
  if (closed !== null) {
    const silence =
      kind !== "plain"
        ? Math.min(
            HEAVY_SILENCE_DAYS,
            PROTECT_SILENCE_DAYS[(await closings()) - 1] ?? HEAVY_SILENCE_DAYS,
          )
        : PROTECT_SILENCE_DAYS[(await closings()) - 1];
    if (silence === undefined || daysSince(closed, now) < silence) return null;
  }
  return kind;
}

/** Whether Home has a card to show for this: the notice slot only needs the yes or no. */
export async function protectCardVisible(now: Date = new Date()): Promise<boolean> {
  return (await protectCardKind(now)) !== null;
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
