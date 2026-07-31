import { eq } from "drizzle-orm";
import { reportError } from "@/src/reportError";
import { db, schema, type TransactionTx } from "./client";
import { isEquipmentCode } from "./equipment";
import type { EquipmentCode } from "./schema";

const { userPreferences } = schema;

export type TrainingLevel = "beginner" | "regular" | "advanced";

function isTrainingLevel(value: string | null): value is TrainingLevel {
  return value === "beginner" || value === "regular" || value === "advanced";
}

// Get a preference value by key
export async function getPreference(key: string): Promise<string | null> {
  const result = await db
    .select()
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

// Delete a preference
export async function deletePreference(key: string): Promise<void> {
  await db.delete(userPreferences).where(eq(userPreferences.key, key));
}

// Get all preferences as object
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

  async getTheme(): Promise<string | null> {
    return await getPreference("theme");
  },

  async setTheme(theme: string): Promise<void> {
    await setPreference("theme", theme);
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

  /**
   * `null` means the hero has never answered, which is not the same as answering "no".
   * The settings store fills that case from the OS accessibility preference — without the
   * distinction, a device with reduce-motion turned on still got the full confetti.
   */
  async getReducedMotion(): Promise<boolean | null> {
    const value = await getPreference("reducedMotion");
    if (value === null) return null;
    return value === "true";
  },

  async setReducedMotion(enabled: boolean): Promise<void> {
    await setPreference("reducedMotion", String(enabled));
  },

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

  async getNotificationsEnabled(): Promise<boolean> {
    const value = await getPreference("notificationsEnabled");
    // Default to true if not set
    return value !== "false";
  },

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await setPreference("notificationsEnabled", String(enabled));
  },

  async getSoundEnabled(): Promise<boolean> {
    const value = await getPreference("soundEnabled");
    return value !== "false"; // Default true
  },

  async setSoundEnabled(enabled: boolean): Promise<void> {
    await setPreference("soundEnabled", String(enabled));
  },

  async getNotificationTime(): Promise<{ hour: number; minute: number }> {
    const value = await getPreference("notificationTime");
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed.hour === "number" && typeof parsed.minute === "number") {
          return parsed;
        }
      } catch (error) {
        // Falling back to 18:00 is correct, but a stored value that will not parse means
        // the hero's chosen reminder time is being ignored every single day.
        reportError("preferences.notificationTime", error);
      }
    }
    // Default to 18:00 (6 PM)
    return { hour: 18, minute: 0 };
  },

  async setNotificationTime(time: { hour: number; minute: number }): Promise<void> {
    await setPreference("notificationTime", JSON.stringify(time));
  },
};
