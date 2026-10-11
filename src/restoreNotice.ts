import * as SecureStore from "expo-secure-store";

import { getPeriodFigures } from "@/db/journal";
import { preferences } from "@/db/preferences";

/**
 * A restore ends with a reload and lands on Home, which does not show the village name: a hero
 * could not tell their restored village from a fresh install. This is the word left for after the
 * reload. SecureStore, not the database: the database is the thing a restore replaces.
 */
const STORE_RESTORED = "bati.restore.notice";

/** Before the reload a restore ends with, once the hero's data is in place. */
export function rememberRestoreNotice(): Promise<void> {
  return SecureStore.setItemAsync(STORE_RESTORED, "1");
}

/**
 * Once, after that reload: who came back, read from the database that came back. The count is the
 * journal's own (`getPeriodFigures`, what Lifetime shows), so the toast and the journal agree.
 * `null` when no restore just happened, or when it brought no session to speak of.
 */
export function takeRestoreNotice(): Promise<RestoreNotice | null> {
  // One reader at a time: two effects asking before the first had deleted the word both got it,
  // and the hero was welcomed back twice.
  if (taking) return Promise.resolve(null);
  taking = readRestoreNotice().finally(() => {
    taking = null;
  });
  return taking;
}

type RestoreNotice = { village: string; sessions: number };
let taking: Promise<RestoreNotice | null> | null = null;

async function readRestoreNotice(): Promise<RestoreNotice | null> {
  if ((await SecureStore.getItemAsync(STORE_RESTORED)) === null) return null;
  await SecureStore.deleteItemAsync(STORE_RESTORED);
  const [village, figures] = await Promise.all([
    preferences.getVillageName(),
    getPeriodFigures(null, new Date()),
  ]);
  const sessions = figures.quests + figures.outings;
  return sessions > 0 ? { village, sessions } : null;
}
