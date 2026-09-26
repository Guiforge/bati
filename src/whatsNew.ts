import Constants from "expo-constants";

import { preferences } from "@/db/preferences";
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
 * A database that has never recorded a version is a fresh install, and a hero who just met the
 * app has nothing to compare it with, so the first launch records the version and says nothing.
 * ponytail: that also silences the one release that ships this, for heroes already installed.
 * Telling them apart would need a second signal (a finished session, say) for one release.
 */
export async function hasUnseenNotes(): Promise<boolean> {
  const seen = await preferences.getNotesSeenVersion();
  if (seen === appVersion) return false;
  if (seen === null) {
    await preferences.setNotesSeenVersion(appVersion);
    return false;
  }
  return true;
}

/** Closing the card or reading the notes answers for this version; the next one asks again. */
export function markNotesSeen(): Promise<void> {
  return preferences.setNotesSeenVersion(appVersion);
}
