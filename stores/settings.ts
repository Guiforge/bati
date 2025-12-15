import { type AvatarId, isAvatarId } from "@/constants/avatars";
import { preferences } from "@/db";
import i18n from "@/i18n";
import { create } from "zustand";

export type AppLanguage = "en" | "fr";
export type ThemePreference = "light" | "dark" | "system";

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "fr" ? "fr" : "en";
}

function normalizeTheme(value: string | null | undefined): ThemePreference {
  return value === "dark" || value === "light" || value === "system"
    ? value
    : "system";
}

function normalizeAvatarId(value: string | null | undefined): AvatarId {
  return isAvatarId(value) ? value : "gamin";
}

interface SettingsState {
  language: AppLanguage;
  theme: ThemePreference;
  avatarId: AvatarId;
  isLoaded: boolean;

  setLanguage: (language: AppLanguage) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setAvatarId: (avatarId: AvatarId) => Promise<void>;

  loadFromDatabase: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: "en",
  theme: "system",
  avatarId: "gamin",
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

  loadFromDatabase: async () => {
    const [language, theme, avatarId] = await Promise.all([
      preferences.getLanguage(),
      preferences.getTheme(),
      preferences.getAvatarId(),
    ]);

    const normalizedLanguage = normalizeLanguage(language);

    set({
      language: normalizedLanguage,
      theme: normalizeTheme(theme),
      avatarId: normalizeAvatarId(avatarId),
      isLoaded: true,
    });

    void i18n.changeLanguage(normalizedLanguage);
  },
}));
