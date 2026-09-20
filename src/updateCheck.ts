import Constants from "expo-constants";

// The module, not the `@/db` barrel: that one re-exports quests, adventures and boss fights, and
// this is reached from Home. Same reason `src/autoBackup.ts` imports it this way.
import { preferences } from "@/db/preferences";

/**
 * The second host this app has ever talked to, and the second one that stays quiet until a hero
 * says otherwise.
 *
 * It exists for one population: whoever installed the APK by hand from GitHub Releases. F-Droid
 * and Play both notice a new version on their own and say so in their own notification; a copy
 * downloaded from a release page has nobody to tell it anything, so it sits on 2.1.0 for a year
 * while the fixes pile up somewhere it will never look.
 *
 * What it does *not* do is as deliberate as what it does: no download, no install, no APK ever
 * fetched here. The card this feeds opens the release page in the hero's own browser, which is
 * also what keeps the feature inside Play's rules for a build that ships there.
 *
 * The request carries no identifier of any kind. GitHub learns an IP address, a time, and that
 * something asked about this repository, which is what it learns from anyone opening the page in
 * a browser. That sentence is in the privacy policy and in the note under the Settings row, not
 * only here.
 */

/** Where the card sends a hero. The page, never a file. */
export const RELEASES_URL = "https://github.com/Guiforge/bati/releases/latest";

/** What gets asked: one JSON object, no auth, no body, no cookie. */
const LATEST_RELEASE_API = "https://api.github.com/repos/Guiforge/bati/releases/latest";

/** At most one ask a day. A release happens every few weeks; this is already generous. */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Longer than this and there is no network worth waiting for. Nothing on screen is blocked. */
const REQUEST_TIMEOUT_MS = 8000;

/**
 * This build's version, from the embedded manifest. `hooks/useBugReport.ts` reads the same one.
 *
 * Empty rather than `"0.0.0"` when the manifest has no version: an unparseable current version
 * makes `isNewer` false, so a build that cannot say what it is says nothing. `"0.0.0"` would make
 * every release newer than it and put a card on a screen that has no idea what it is running.
 */
export const appVersion = Constants.expoConfig?.version ?? "";

function parse(version: string): { major: number; minor: number; patch: number } | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/**
 * Whether `candidate` is a version to move to from `current`.
 *
 * Field by field rather than through the `versionCode` integer in `app.config.js`: that scheme
 * caps minor and patch at 99 on purpose, and a comparison that silently wraps would offer a
 * downgrade. Anything that does not parse is not newer, which is how a tag like `nightly` or a
 * renamed release stays invisible instead of becoming an update.
 */
export function isNewer(candidate: string, current: string): boolean {
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return false;
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

async function fetchPublishedVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || !("tag_name" in body)) return null;

    const tag = body.tag_name;
    return typeof tag === "string" ? tag.trim().replace(/^v/, "") : null;
  } catch {
    // Deliberate silence, and the one place in this app that earns it: a phone in a basement
    // fails here every single day, and `reportError` would fill the log a bug report carries
    // with the same "Network request failed" over and over, burying whatever a hero actually
    // wrote in to say. Nothing is shown and nothing is written, so the next launch simply asks
    // again.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The published version when it is newer than this build, `null` otherwise.
 *
 * Reads the cached answer first, so a cold start can draw the card without waiting for a
 * request, and asks again only once the day is up.
 */
export async function checkForUpdate(): Promise<string | null> {
  if (!(await preferences.getUpdateCheckEnabled())) return null;

  const checkedAt = await preferences.getUpdateCheckedAt();
  // Absolute, so a clock that moved backwards heals instead of locking the check out: a stamp
  // from the future would otherwise keep the difference negative until the phone caught up with
  // its own timestamp, which can be years.
  if (Math.abs(Date.now() - checkedAt) >= CHECK_INTERVAL_MS) {
    // Stamped before the request rather than after it, so a phone with no network makes one
    // attempt a day instead of one per mount of Home.
    await preferences.setUpdateCheckedAt(Date.now());
    const published = await fetchPublishedVersion();
    if (published) await preferences.setUpdateLatest(published);
  }

  const latest = await preferences.getUpdateLatest();
  if (!latest || !isNewer(latest, appVersion)) return null;

  // Closing the card answers for that version and no other: the next release asks again.
  return (await preferences.getUpdateDismissed()) === latest ? null : latest;
}
