import { and, eq, sql } from "drizzle-orm";
import { getLocales } from "expo-localization";
import { reportError } from "../src/reportError";
import { db, schema, type TransactionTx, transactionOrFallback } from "./client";
import { isEquipmentCode } from "./equipment";
import type { EquipmentCode } from "./schema";
import { uuidv7 } from "./uuid";

const { userPreferences } = schema;

export type TrainingLevel = "beginner" | "regular" | "advanced";

function isTrainingLevel(value: string | null): value is TrainingLevel {
  return value === "beginner" || value === "regular" || value === "advanced";
}

/** Which units a distance is *read* in. Never which units it is stored in — see below. */
export type DistanceUnit = "metric" | "imperial";

function isDistanceUnit(value: string | null): value is DistanceUnit {
  return value === "metric" || value === "imperial";
}

/**
 * What the device says the hero measures in, for a hero who never chose. The one place that asks:
 * language does the same through `resolveAppLanguage`. `us` and `uk` both road-sign in miles.
 */
function deviceDistanceUnit(): DistanceUnit {
  try {
    const system = getLocales()[0]?.measurementSystem;
    return system === "us" || system === "uk" ? "imperial" : "metric";
  } catch {
    return "metric";
  }
}

/**
 * How a session waits before a movement: ten seconds that run on their own, or until GO.
 *
 * One answer for every wait, the warm-up's transitions and the screen before the first exercise
 * alike: a hero who wants to be asked wants it everywhere, and a hero whose phone is on the floor
 * wants nothing to touch anywhere.
 */
export type PrepMode = "timer" | "tap";

function isPrepMode(value: string | null): value is PrepMode {
  return value === "timer" || value === "tap";
}

/** One set-aside exercise: which, and since when (epoch ms). */
export type SetAsideExercise = { id: number; at: number };

function isSetAsideExercise(value: unknown): value is SetAsideExercise {
  if (typeof value !== "object" || value === null) return false;
  const { id, at } = value as Record<string, unknown>;
  return Number.isInteger(id) && typeof at === "number" && Number.isFinite(at);
}

/**
 * Get a preference value by key.
 *
 * Projected down to `value` rather than `select()`-ing the row: `src/autoBackup.ts` calls this
 * *before* the migration runner, so the SQL it emits must only name columns that have existed
 * since `0000_schema.sql`. A `select()` asks for every column the TypeScript schema declares —
 * so the first migration to add one to `user_preferences` would make this read fail with
 * "no such column" on exactly the launches the pre-migration backup exists for.
 */
export async function getPreference(key: string): Promise<string | null> {
  const result = await db
    .select({ value: userPreferences.value })
    .from(userPreferences)
    .where(eq(userPreferences.key, key))
    .limit(1);

  return result[0]?.value ?? null;
}

// Set a preference value. Pass `tx` to run as part of a caller's transaction.
export async function setPreference(
  key: string,
  value: string,
  tx: TransactionTx | typeof db = db,
): Promise<void> {
  await tx
    .insert(userPreferences)
    .values({ key, value })
    .onConflictDoUpdate({
      target: userPreferences.key,
      set: { value, updatedAt: new Date() },
    });
}

const DEVICE_ID_KEY = "deviceId";
let deviceId: Promise<string> | null = null;

/**
 * Which install is writing. Generated once, then it is this database's own name.
 *
 * Stamped into `completed_sessions.originDevice` so a merged journal can say where a session
 * came from. It is provenance, not identity — the identity is the session's `uuid` (db/uuid.ts),
 * which is unique whatever this returns.
 *
 * The *promise* is memoised, not the name: two callers arriving before the first read returns
 * would otherwise both find nothing, both draw, and both write — leaving the memo holding the
 * loser of a race the database already decided. Same pattern as `ensureMigrations`, including
 * dropping a rejection so the next caller retries rather than inheriting one bad read.
 *
 * ponytail: the id lives *in* the database, so restoring a backup onto a second phone makes both
 *           claim the same origin. Harmless while nothing reads the column back; re-draw it on
 *           restore the day a merge actually attributes rows by it.
 */
export function getDeviceId(): Promise<string> {
  if (deviceId !== null) return deviceId;

  const promise = (async () => {
    const existing = await getPreference(DEVICE_ID_KEY);
    if (existing !== null) return existing;

    const fresh = uuidv7();
    await setPreference(DEVICE_ID_KEY, fresh);
    return fresh;
  })();

  promise.catch(() => {
    if (deviceId === promise) deviceId = null;
  });
  deviceId = promise;
  return promise;
}

// Delete a preference
export async function deletePreference(key: string): Promise<void> {
  await db.delete(userPreferences).where(eq(userPreferences.key, key));
}

/**
 * Vidage complet des préférences en une lecture. `getAllQuestConfigs` s'en sert pour tarifer
 * les 34 cartes d'une galerie sans 34 requêtes — ne pas le remplacer par une boucle de
 * `getPreference`.
 */
export async function getAllPreferences(): Promise<Record<string, string>> {
  const results = await db.select().from(userPreferences);
  return Object.fromEntries(results.map((r: { key: string; value: string }) => [r.key, r.value]));
}

// Specific preference helpers
export const preferences = {
  async getVillageName(): Promise<string> {
    return (await getPreference("villageName")) ?? "";
  },

  async setVillageName(name: string): Promise<void> {
    await setPreference("villageName", name);
  },

  async getHasFinishedOnboarding(): Promise<boolean> {
    const value = await getPreference("hasFinishedOnboarding");
    return value === "true";
  },

  async setHasFinishedOnboarding(finished: boolean): Promise<void> {
    await setPreference("hasFinishedOnboarding", String(finished));
  },

  async getLanguage(): Promise<string | null> {
    return await getPreference("language");
  },

  /**
   * The hero's language and what the device answered at that moment, always together: the second
   * is how `resolveAppLanguage` tells a later choice made in Android's own settings from this one.
   */
  async setLanguage(lang: string, chosenOn: string): Promise<void> {
    await setPreference("language", lang);
    await setPreference("languageChosenOn", chosenOn);
  },

  async getLanguageChosenOn(): Promise<string | null> {
    return await getPreference("languageChosenOn");
  },

  async getAvatarId(): Promise<string | null> {
    return await getPreference("avatarId");
  },

  async setAvatarId(avatarId: string): Promise<void> {
    await setPreference("avatarId", avatarId);
  },

  /**
   * The photo the hero picked instead of an avatar, null for a preset.
   *
   * Stored as a data URI under `customAvatar` (`src/customAvatar.ts`), which travels with backups
   * and sync (`MERGED_PREFERENCES`). Installs from before it kept the image picker's cache path
   * under the device-local `customAvatarUri`, which Android could purge and no backup carried;
   * that path is still read here until `portLegacyAvatar` converts it at launch.
   */
  async getCustomAvatarUri(): Promise<string | null> {
    const portable = await getPreference("customAvatar");
    if (portable !== null) return portable || null;
    return await getPreference("customAvatarUri");
  },

  async setCustomAvatarUri(uri: string | null): Promise<void> {
    // An empty value rather than a delete for "back to a preset": a missing row never wins a
    // merge, so a preset chosen on this phone would lose to the other phone's older photo.
    await setPreference("customAvatar", uri ?? "");
    await deletePreference("customAvatarUri");
  },

  /**
   * Moves a legacy picker path to `customAvatar` as `portable`, in one transaction.
   *
   * Dated when the hero picked the photo, not now: a port stamped "now" would beat a preset chosen
   * on another phone in between, and bring the old photo back there at the next merge. Writes
   * nothing when the rows moved since `path` was read (a pick made while the photo was encoding),
   * and returns whether it wrote.
   *
   * ponytail: a preset chosen on another phone still on the old version wrote `avatarId` and no
   *           `""`, so this photo, older, still wins there once ported (once per multi-phone hero).
   *           `avatarId`'s date cannot settle it: onboarding writes it too, and a second phone set
   *           up after the photo would erase it. Losing a face is worse than showing an old one.
   */
  async portCustomAvatar(path: string, portable: string): Promise<boolean> {
    return await transactionOrFallback(async (tx) => {
      const [legacy] = await tx
        .select({ value: userPreferences.value, updatedAt: userPreferences.updatedAt })
        .from(userPreferences)
        .where(eq(userPreferences.key, "customAvatarUri"))
        .limit(1);
      const [current] = await tx
        .select({ id: userPreferences.id })
        .from(userPreferences)
        .where(eq(userPreferences.key, "customAvatar"))
        .limit(1);
      if (legacy?.value !== path || current) return false;
      await tx
        .insert(userPreferences)
        .values({
          key: "customAvatar",
          value: portable,
          updatedAt: legacy.updatedAt ?? new Date(),
        })
        // A pick written outside the queue lands inside this transaction (`transactionOrFallback`):
        // a UNIQUE failure would roll the pick back with the port, so the pick's row simply wins.
        .onConflictDoNothing();
      await tx.delete(userPreferences).where(eq(userPreferences.key, "customAvatarUri"));
      return true;
    });
  },

  /**
   * Forgets a legacy picker path once `customAvatar` exists, which the getter already prefers. A
   * restore or a merge can bring `customAvatar` in while this phone still holds its unported path
   * (device-local), and then the port never runs to delete it.
   */
  async dropSupersededLegacyAvatar(): Promise<void> {
    await db
      .delete(userPreferences)
      .where(
        and(
          eq(userPreferences.key, "customAvatarUri"),
          sql`EXISTS (SELECT 1 FROM user_preferences WHERE key = 'customAvatar')`,
        ),
      );
  },

  // Training level captured at onboarding (null = skipped). Read by the coach/
  // suggestion layer as a starting signal; no store field until a reactive reader exists.
  async getTrainingLevel(): Promise<TrainingLevel | null> {
    const value = await getPreference("trainingLevel");
    return isTrainingLevel(value) ? value : null;
  },

  async setTrainingLevel(level: TrainingLevel): Promise<void> {
    await setPreference("trainingLevel", level);
  },

  // Equipment the hero actually owns. `null` means "never answered" and is treated as
  // "show me everything" — the default must not silently hide content from existing users.
  // An empty array is a real answer: bodyweight only.
  async getOwnedEquipment(): Promise<EquipmentCode[] | null> {
    const raw = await getPreference("ownedEquipment");
    if (raw === null) return null;

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isEquipmentCode) : null;
    } catch {
      return null;
    }
  },

  // The warm-up runs by default: it is the one part of a session with evidence behind it for
  // injury risk. The toggle exists so someone who always skips it does not have to tap twice.
  async getWarmupEnabled(): Promise<boolean> {
    return (await getPreference("warmupEnabled")) !== "false";
  },

  async setWarmupEnabled(enabled: boolean): Promise<void> {
    await setPreference("warmupEnabled", String(enabled));
  },

  // The timer by default: a warm-up is done with the phone on the floor, and a wait that needs
  // a tap is a wait that needs the hero to walk back to it.
  async getPrepMode(): Promise<PrepMode> {
    const value = await getPreference("prepMode");
    return isPrepMode(value) ? value : "timer";
  },

  async setPrepMode(mode: PrepMode): Promise<void> {
    await setPreference("prepMode", mode);
  },

  /**
   * The Storage Access Framework tree the hero chose for automatic backups, or `null` when the
   * feature is off. Off is the only default: writing files into someone's storage is not
   * something an app gets to assume.
   *
   * The URI is persistable — expo-file-system takes the permission for us when the picker
   * resolves — so it is expected to survive a reboot. It is *not* guaranteed to survive a
   * deleted folder or a permission cleared from Android's settings, which is why the one writer
   * of this key (`src/autoBackup.ts`) clears it the moment a write fails: a folder the hero can
   * see in Settings is the only honest report that backups have stopped.
   */
  async getBackupFolderUri(): Promise<string | null> {
    return await getPreference("backupFolderUri");
  },

  async setBackupFolderUri(uri: string): Promise<void> {
    await setPreference("backupFolderUri", uri);
  },

  async clearBackupFolderUri(): Promise<void> {
    await deletePreference("backupFolderUri");
  },

  /**
   * The hero's own day the last automatic snapshot was written on, `yyyy-MM-dd`, or `null` for
   * never. One key so `backupIfStale` can answer "already done today" without listing a Storage
   * Access Framework tree — a listing there is an IPC round trip per entry, and `File.name` is
   * not reliable on a document URI (see src/backupFiles.ts `SNAPSHOT_URI`).
   */
  async getLastAutoBackupDay(): Promise<string | null> {
    return await getPreference("lastAutoBackupDay");
  },

  async setLastAutoBackupDay(day: string): Promise<void> {
    await setPreference("lastAutoBackupDay", day);
  },

  async clearLastAutoBackupDay(): Promise<void> {
    await deletePreference("lastAutoBackupDay");
  },

  /**
   * The day the hero closed the "protect your hero" card, `yyyy-MM-dd`. It comes back after thirty
   * days. Device-local: a restore onto a new phone must not inherit the old phone's silence.
   */
  async getProtectDismissedDay(): Promise<string | null> {
    return await getPreference("protectDismissedDay");
  },

  async setProtectDismissedDay(day: string): Promise<void> {
    await setPreference("protectDismissedDay", day);
  },

  /** How many times the hero closed it. The silence grows with it, see `src/protectHero.ts`. */
  async getProtectDismissals(): Promise<number> {
    return Number(await getPreference("protectDismissals")) || 0;
  },

  async setProtectDismissals(count: number): Promise<void> {
    await setPreference("protectDismissals", String(count));
  },

  /**
   * The exercises the hero asked never to be handed again (issue #145: "I can't jump"), with the
   * day each was set aside so the list can say how long ago. Quests serve a near substitute in
   * their place and the warm-up skips them; a picker the hero drives by hand still offers them.
   *
   * Read here, written only by `db/setAside.ts`, which also drops the saved swaps that would hand
   * the exercise back.
   *
   * ponytail: ids, and kept out of `MERGED_PREFERENCES` like favourites, because a seed row can
   * carry a different id on another device (`db/merge.ts`). Two devices keep two lists. Switch to
   * `enName` and merge it the day someone asks for the list to follow them.
   */
  async getSetAsideExercises(): Promise<SetAsideExercise[]> {
    const raw = await getPreference("setAsideExercises");
    if (raw === null) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isSetAsideExercise) : [];
    } catch (error) {
      reportError("preferences.setAside.parse", error);
      return [];
    }
  },

  async setSetAsideExercises(list: SetAsideExercise[]): Promise<void> {
    await setPreference("setAsideExercises", JSON.stringify(list));
  },

  async setOwnedEquipment(equipment: EquipmentCode[] | null): Promise<void> {
    if (equipment === null) {
      await deletePreference("ownedEquipment");
      return;
    }
    await setPreference("ownedEquipment", JSON.stringify(equipment));
  },

  /**
   * Metric or imperial, and it decides one thing only: how a number is drawn.
   *
   * Every distance in this database and in every GPX Bati writes is metres, whatever this says.
   * The conversion lives in `constants/distanceFormat.ts` and happens at render time — writing a
   * converted number anywhere durable would leave a column whose unit depends on a preference
   * the hero can change afterwards, which is `db/workUnits.ts`'s bug one storey up.
   *
   * Until the hero picks, the device answers (`deviceDistanceUnit`): a US phone read kilometres
   * on a fresh install while the language already followed the device. The row in Settings is
   * one tap, and a stored choice always wins.
   */
  async getDistanceUnit(): Promise<DistanceUnit> {
    const value = await getPreference("distanceUnit");
    return isDistanceUnit(value) ? value : deviceDistanceUnit();
  },

  async setDistanceUnit(unit: DistanceUnit): Promise<void> {
    await setPreference("distanceUnit", unit);
  },

  /**
   * Whether the recap may draw a basemap under the trace, which is the only thing in this app
   * that touches a network. Off until the hero says yes, out loud, on a screen that names the
   * host before the first byte moves.
   *
   * `=== "true"` and not the `!== "false"` every other boolean here uses, and that asymmetry is
   * the whole point: those default to on, and a database that has never seen this key is a hero
   * who has never been asked. An update that read "unset" as "yes" would start downloading from
   * a third party on behalf of someone who was never given the chance to refuse.
   */
  async getMapTilesEnabled(): Promise<boolean> {
    return (await getPreference("mapTiles")) === "true";
  },

  async setMapTilesEnabled(enabled: boolean): Promise<void> {
    await setPreference("mapTiles", String(enabled));
  },

  /**
   * Whether the app may ask GitHub, once a day, whether a newer version has been published.
   *
   * `=== "true"` for the same reason the map above uses it rather than the `!== "false"` every
   * other boolean here has: a database that has never seen this key belongs to a hero who has
   * never been asked, and an unanswered question about a second host is a no.
   */
  async getUpdateCheckEnabled(): Promise<boolean> {
    return (await getPreference("updateCheck")) === "true";
  },

  async setUpdateCheckEnabled(enabled: boolean): Promise<void> {
    await setPreference("updateCheck", String(enabled));
  },

  /** When the last ask happened, epoch ms, `0` for never. Holds the check to one a day. */
  async getUpdateCheckedAt(): Promise<number> {
    return Number(await getPreference("updateCheckedAt")) || 0;
  },

  async setUpdateCheckedAt(at: number): Promise<void> {
    await setPreference("updateCheckedAt", String(at));
  },

  /** The newest version GitHub has named, kept so a cold start knows without asking again. */
  async getUpdateLatest(): Promise<string | null> {
    return await getPreference("updateLatest");
  },

  async setUpdateLatest(version: string): Promise<void> {
    await setPreference("updateLatest", version);
  },

  /** The version whose card was closed. Stored per version, so the next release asks again. */
  async getUpdateDismissed(): Promise<string | null> {
    return await getPreference("updateDismissed");
  },

  async setUpdateDismissed(version: string): Promise<void> {
    await setPreference("updateDismissed", version);
  },

  /** The last version whose release notes were offered, `null` on a fresh install. */
  async getNotesSeenVersion(): Promise<string | null> {
    return await getPreference("notesSeenVersion");
  },

  async setNotesSeenVersion(version: string): Promise<void> {
    await setPreference("notesSeenVersion", version);
  },

  async getHapticsEnabled(): Promise<boolean> {
    const value = await getPreference("hapticsEnabled");
    // Default to true if not set
    return value !== "false";
  },

  async setHapticsEnabled(enabled: boolean): Promise<void> {
    await setPreference("hapticsEnabled", String(enabled));
  },

  // The 3-2-1 countdown beeps: before the first exercise, at the end of a rest, and at the target
  // of a timed exercise. On by default: a hero holding a plank is looking anywhere but at the
  // screen, which is the whole reason the cue exists. The key predates 1.8.1 on purpose —
  // someone who switched the old (silent) Sound Effects row off had a preference, and it counts.
  async getSoundEnabled(): Promise<boolean> {
    return (await getPreference("soundEnabled")) !== "false";
  },

  async setSoundEnabled(enabled: boolean): Promise<void> {
    await setPreference("soundEnabled", String(enabled));
  },

  /**
   * `null` means the hero has never answered, which is not the same as answering "no".
   * The settings store fills that case from the OS accessibility preference — without the
   * distinction, a device with reduce-motion turned on still got the full confetti.
   */

  // Session recovery - store serialized session state for crash recovery
  async getSavedSession(): Promise<string | null> {
    return await getPreference("savedSession");
  },

  async setSavedSession(sessionJson: string): Promise<void> {
    await setPreference("savedSession", sessionJson);
  },

  async clearSavedSession(): Promise<void> {
    await deletePreference("savedSession");
  },

  // The villager cameo layer. On by default: it carries the first-visit guides, and a new hero
  // switching it off before they have seen one would be switching off the only tutorial there is.
  async getVillagersEnabled(): Promise<boolean> {
    return (await getPreference("villagersEnabled")) !== "false";
  },

  async setVillagersEnabled(enabled: boolean): Promise<void> {
    await setPreference("villagersEnabled", String(enabled));
  },

  /**
   * The lines a villager said recently, so the next draw can avoid them.
   *
   * One key holding the whole ring rather than a row per line: it is read once at startup and
   * rewritten whole on every cameo, so there is nothing to gain from splitting it and a
   * multi-row write would be the slower half of showing a bubble. Malformed JSON reads as an
   * empty ring — the worst that costs is one repeatable line, which is not worth a crash.
   */
  async getRecentCameoLines(): Promise<string[]> {
    const raw = await getPreference("recentCameoLines");
    if (raw === null) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  },

  async setRecentCameoLines(keys: string[]): Promise<void> {
    await setPreference("recentCameoLines", JSON.stringify(keys));
  },

  /**
   * Which first-visit guides the hero has already met.
   *
   * One key holding the whole set, for the same reason as the cameo ring: it is read once per
   * screen mount and there are five of them for the lifetime of an install. "Review the guides"
   * in Settings clears it, which is why it is a set rather than five booleans — forgetting to
   * clear one of five is exactly the bug that would leave a hero with four guides back.
   */
  async getGuidesSeen(): Promise<string[]> {
    const raw = await getPreference("guidesSeen");
    if (raw === null) return [];

    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  },

  async setGuidesSeen(moments: string[]): Promise<void> {
    await setPreference("guidesSeen", JSON.stringify(moments));
  },

  /**
   * The last workout date the hero has already been welcomed back after.
   *
   * Keyed on *that* date rather than on "when did we last greet", so the greeting fires exactly
   * once per absence. Storing a greeting timestamp instead would re-greet every day the app was
   * opened without training — which is the one thing this moment must never do, because a hero
   * being reminded daily that they are away is the shame loop the whole pool is written against.
   */
  async getComebackGreetedAfter(): Promise<string | null> {
    return await getPreference("comebackGreetedAfter");
  },

  async setComebackGreetedAfter(lastWorkoutDate: string): Promise<void> {
    await setPreference("comebackGreetedAfter", lastWorkoutDate);
  },
};
