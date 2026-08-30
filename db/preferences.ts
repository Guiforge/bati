import { eq } from "drizzle-orm";
import { db, schema, type TransactionTx } from "./client";
import { isEquipmentCode } from "./equipment";
import type { EquipmentCode } from "./schema";
import { uuidv7 } from "./uuid";

const { userPreferences } = schema;

export type TrainingLevel = "beginner" | "regular" | "advanced";

function isTrainingLevel(value: string | null): value is TrainingLevel {
  return value === "beginner" || value === "regular" || value === "advanced";
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

  async setLanguage(lang: string): Promise<void> {
    await setPreference("language", lang);
  },

  async getAvatarId(): Promise<string | null> {
    return await getPreference("avatarId");
  },

  async setAvatarId(avatarId: string): Promise<void> {
    await setPreference("avatarId", avatarId);
  },

  async getCustomAvatarUri(): Promise<string | null> {
    return await getPreference("customAvatarUri");
  },

  async setCustomAvatarUri(uri: string | null): Promise<void> {
    if (uri === null) {
      await deletePreference("customAvatarUri");
      return;
    }
    await setPreference("customAvatarUri", uri);
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

  async setOwnedEquipment(equipment: EquipmentCode[] | null): Promise<void> {
    if (equipment === null) {
      await deletePreference("ownedEquipment");
      return;
    }
    await setPreference("ownedEquipment", JSON.stringify(equipment));
  },

  async getHapticsEnabled(): Promise<boolean> {
    const value = await getPreference("hapticsEnabled");
    // Default to true if not set
    return value !== "false";
  },

  async setHapticsEnabled(enabled: boolean): Promise<void> {
    await setPreference("hapticsEnabled", String(enabled));
  },

  // The 3-2-1 countdown beeps at the end of a rest and of a timed exercise. On by default: a
  // hero holding a plank is looking anywhere but at the screen, which is the whole reason the
  // cue exists. The key predates 1.8.1 on purpose — someone who switched the old (silent) Sound
  // Effects row off had a preference, and it still counts.
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
