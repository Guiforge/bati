import * as SecureStore from "expo-secure-store";

import { reportError } from "@/src/reportError";

/**
 * How long a format 2 vault is left alone after this version first runs.
 *
 * A hero with two phones updates one of them. If that one moved its vault to format 3 at once, the
 * other (still on 2.9; F-Droid sometimes arrives days later) could no longer read what it writes.
 * For these days a format 2 vault keeps writing format 2 and the "update the protection" line is
 * hidden. New vaults are format 3 from the start, and nothing is ever migrated without a gesture.
 * It also bounds a bug in format 3: for two weeks it can only reach vaults made after the update.
 */
export const UPDATE_DELAY_DAYS = 14;

/**
 * SecureStore, not the database: the database is replaced by a restore and merged by a sync, and a
 * count that restarts, or comes from another phone, is the one way this delay could be wrong. It
 * is not in Android's backup either, so a new phone is a new first run, which is the safe side.
 */
const FIRST_SEEN = "bati.vault.firstSeen";
/** Set once the line has been shown, so a clock moved back cannot take it away again. */
const OFFERED = "bati.vault.updateOffered";

const DAY_MS = 86_400_000;

/** Called once per launch; the first call is the one that counts. Never throws. */
export async function noteFirstLaunch(now: Date = new Date()): Promise<void> {
  try {
    if (parsed(await SecureStore.getItemAsync(FIRST_SEEN)) === null) {
      await SecureStore.setItemAsync(FIRST_SEEN, String(now.getTime()));
    }
  } catch (error) {
    reportError("vault.firstSeen", error);
  }
}

/**
 * Whether "update the protection" may be shown: from day 14 on, and for good once shown. A clock
 * set back before that keeps it hidden and breaks nothing; set far forward it only shows the line
 * early. A keystore that cannot be read answers no, the cautious side.
 */
export async function vaultUpdateOffered(now: Date = new Date()): Promise<boolean> {
  try {
    if ((await SecureStore.getItemAsync(OFFERED)) === "1") return true;

    const first = parsed(await SecureStore.getItemAsync(FIRST_SEEN));
    if (first === null) {
      // Never noted (the launch hook has not run, or the value is unreadable): start counting now.
      await SecureStore.setItemAsync(FIRST_SEEN, String(now.getTime()));
      return false;
    }
    if (now.getTime() - first < UPDATE_DELAY_DAYS * DAY_MS) return false;

    await SecureStore.setItemAsync(OFFERED, "1");
    return true;
  } catch (error) {
    reportError("vault.updateOffered", error);
    return false;
  }
}

function parsed(value: string | null): number | null {
  const n = Number(value);
  return value !== null && Number.isFinite(n) && n > 0 ? n : null;
}
