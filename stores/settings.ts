import { create } from "zustand";
import { type AvatarId, isAvatarId } from "@/constants/avatars";
import { preferences } from "@/db";
import i18n from "@/i18n";

export type AppLanguage = "en" | "fr";
export type ThemePreference = "light" | "dark" | "system";

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "fr" ? "fr" : "en";
}

function normalizeTheme(value: string | null | undefined): ThemePreference {
  return value === "dark" || value === "light" || value === "system" ? value : "system";
}

function normalizeAvatarId(value: string | null | undefined): AvatarId {
  return isAvatarId(value) ? value : "gamin";
}

interface SettingsState {
  language: AppLanguage;
  theme: ThemePreference;
  avatarId: AvatarId;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
  notificationTime: { hour: number; minute: number };
  isLoaded: boolean;

  setLanguage: (language: AppLanguage) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setAvatarId: (avatarId: AvatarId) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setReducedMotion: (enabled: boolean) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (time: { hour: number; minute: number }) => Promise<void>;

  loadFromDatabase: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: "en",
  theme: "system",
  avatarId: "gamin",
  hapticsEnabled: true,
  reducedMotion: false,
  notificationsEnabled: true,
  notificationTime: { hour: 18, minute: 0 },
  isLoaded: false,

  setLanguage: async (language) => {
    set({ language });
    await preferences.setLanguage(language);
    void i18n.changeLanguage(language);
  },

  setTheme: async (theme) => {
    set({ theme });
    await preferences.setTheme(theme);
  },

  setAvatarId: async (avatarId) => {
    set({ avatarId });
    await preferences.setAvatarId(avatarId);
  },

  setHapticsEnabled: async (enabled) => {
    set({ hapticsEnabled: enabled });
    await preferences.setHapticsEnabled(enabled);
  },

  setReducedMotion: async (enabled) => {
    set({ reducedMotion: enabled });
    await preferences.setReducedMotion(enabled);
  },

  setNotificationsEnabled: async (enabled) => {
    set({ notificationsEnabled: enabled });
    await preferences.setNotificationsEnabled(enabled);
  },

  setNotificationTime: async (time) => {
    set({ notificationTime: time });
    await preferences.setNotificationTime(time);
  },

  loadFromDatabase: async () => {
    const [
      language,
      theme,
      avatarId,
      hapticsEnabled,
      reducedMotion,
      notificationsEnabled,
      notificationTime,
    ] = await Promise.all([
      preferences.getLanguage(),
      preferences.getTheme(),
      preferences.getAvatarId(),
      preferences.getHapticsEnabled(),
      preferences.getReducedMotion(),
      preferences.getNotificationsEnabled(),
      preferences.getNotificationTime(),
    ]);

    const normalizedLanguage = normalizeLanguage(language);

    set({
      language: normalizedLanguage,
      theme: normalizeTheme(theme),
      avatarId: normalizeAvatarId(avatarId),
      hapticsEnabled,
      reducedMotion,
      notificationsEnabled,
      notificationTime,
      isLoaded: true,
    });

    void i18n.changeLanguage(normalizedLanguage);
  },
}));
