import * as SecureStore from "expo-secure-store";

import type { Locomotion } from "@/db/schema";
import { reportError } from "@/src/reportError";

/**
 * The activities for which the screen stays on during an outing, on this phone.
 *
 * SecureStore, not the database: `DEVICE_LOCAL_PREFERENCES` protects a Bati restore on a build
 * that knows the key, but an older build restoring this backup, or Android's own backup carrying
 * the whole database to a new phone (`plugins/withAndroidBackupRules.js`), would hand a pocket
 * phone the handlebar phone's lit screen. Outside the database, a new phone starts with the screen
 * going off. Same reasoning as `src/vaultUpdateDelay.ts`.
 *
 * Off by default, and every failure reads as off: a lit screen in a pocket is the costly side.
 */
const KEY = "bati.outing.keepAwake";

const CODES: readonly Locomotion[] = ["walk", "run", "ride"];

/** The set, in the order of `CODES`. Never throws. */
export async function keepAwakeSet(): Promise<Locomotion[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return CODES.filter((code) => Array.isArray(parsed) && parsed.includes(code));
  } catch (error) {
    reportError("outing.keepAwake.read", error);
    return [];
  }
}

/** Adds or removes one activity, and returns the set that is now stored. Throws on a write failure. */
export async function setKeepAwake(locomotion: Locomotion, on: boolean): Promise<Locomotion[]> {
  const current = await keepAwakeSet();
  const next = CODES.filter((code) => (code === locomotion ? on : current.includes(code)));
  if (next.length === current.length && next.every((c, i) => c === current[i])) return current;
  if (next.length === 0) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}
