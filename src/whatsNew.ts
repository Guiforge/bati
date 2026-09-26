import Constants from "expo-constants";

import { preferences } from "@/db/preferences";
// The module, not the `@/db` barrel, for the reason `src/updateCheck.ts` gives: this is reached from Home.
import { getTotalXp } from "@/db/userLevel";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { appVersion } from "@/src/updateCheck";

/**
 * This build's release notes, one entry per line, in the hero's language.
 *
 * `app.config.js` embeds them from the fastlane changelogs the stores already show, so the app
 * says exactly what the store page says. Empty when the build has none (a dev build between
 * releases), and an empty list is what keeps both doors to them shut.
 */
export function releaseNotes(language: AppLanguage): string[] {
  const changelog = Constants.expoConfig?.extra?.changelog as
    | Partial<Record<AppLanguage, string>>
    | undefined;
  const text = changelog?.[language] ?? changelog?.en ?? "";
  return text
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Whether Home should offer this version's notes: once per version, after an update.
 *
 * A database that has never recorded a version is either a fresh install, whose hero has nothing
 * to compare the app with, or a hero updating to the release that shipped this screen. XP tells
 * them apart: it only comes from a finished session, and a fresh install reaches Home without one.
 */
export async function hasUnseenNotes(): Promise<boolean> {
  const seen = await preferences.getNotesSeenVersion();
  if (seen === appVersion) return false;
  if (seen === null && (await getTotalXp()) === 0) {
    await preferences.setNotesSeenVersion(appVersion);
    return false;
  }
  return true;
}

/** Every version's notes, for a hero who skipped a few. The page, in their own browser. */
export const ALL_RELEASES_URL = "https://github.com/Guiforge/bati/releases";

/** Closing the card or reading the notes answers for this version; the next one asks again. */
export function markNotesSeen(): Promise<void> {
  return preferences.setNotesSeenVersion(appVersion);
}
