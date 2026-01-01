import { eq } from "drizzle-orm";
import { db, schema } from "./client";

const { userPreferences } = schema;

// Get a preference value by key
export async function getPreference(key: string): Promise<string | null> {
  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.key, key))
    .limit(1);

  return result[0]?.value ?? null;
}

// Set a preference value
export async function setPreference(key: string, value: string): Promise<void> {
  await db
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

  async getHapticsEnabled(): Promise<boolean> {
    const value = await getPreference("hapticsEnabled");
    // Default to true if not set
    return value !== "false";
  },

  async setHapticsEnabled(enabled: boolean): Promise<void> {
    await setPreference("hapticsEnabled", String(enabled));
  },

  async getReducedMotion(): Promise<boolean> {
    const value = await getPreference("reducedMotion");
    // Default to false (animations enabled by default)
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
      } catch {}
    }
    // Default to 18:00 (6 PM)
    return { hour: 18, minute: 0 };
  },

  async setNotificationTime(time: { hour: number; minute: number }): Promise<void> {
    await setPreference("notificationTime", JSON.stringify(time));
  },
};
