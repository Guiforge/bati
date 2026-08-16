import { AccessibilityInfo } from "react-native";
import { create } from "zustand";
import { type AvatarId, avatarIds, isAvatarId } from "@/constants/avatars";
import { preferences } from "@/db";
import i18n from "@/i18n";
import {
  type AppLanguage,
  getDevicePreferredAppLanguage,
  resolveAppLanguage,
} from "@/src/i18n/deviceLanguage";

export type { AppLanguage };
export type ThemePreference = "light" | "dark" | "system";

function normalizeTheme(value: string | null | undefined): ThemePreference {
  return value === "dark" || value === "light" || value === "system" ? value : "system";
}

function normalizeAvatarId(value: string | null | undefined): AvatarId {
  return isAvatarId(value) ? value : avatarIds[0];
}

interface SettingsState {
  language: AppLanguage;
  theme: ThemePreference;
  avatarId: AvatarId;
  customAvatarUri: string | null;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  isLoaded: boolean;

  setLanguage: (language: AppLanguage) => Promise<void>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setAvatarId: (avatarId: AvatarId) => Promise<void>;
  setCustomAvatarUri: (uri: string | null) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setReducedMotion: (enabled: boolean) => Promise<void>;

  loadFromDatabase: () => Promise<void>;
}

/**
 * How long the accessibility service gets to answer before we stop waiting for it.
 *
 * `loadFromDatabase` gates the splash screen: nothing renders until `isLoaded` flips, and every
 * read sits in one `Promise.all`, so the slowest answer decides when the app first paints.
 * `AccessibilityInfo` talks to a system service that is not always up at cold start — logcat
 * shows `AccessibilityManagerService: wait for adding window timeout` on this device — and a
 * cosmetic preference must never be able to hold the first frame hostage.
 */
const ACCESSIBILITY_PROBE_MS = 1000;

/** The OS reduce-motion preference, or `false` if the service does not answer in time. */
function deviceReducedMotionWithin(ms: number): Promise<boolean> {
  return Promise.race([
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: getDevicePreferredAppLanguage(),
  theme: "system",
  // Same default the DB read normalises to (normalizeAvatarId). It used to say "guardian"
  // here and fall back to avatarIds[0] there, so a hero who never picked one watched their
  // avatar change from guardian to shadow a beat after every cold start.
  avatarId: avatarIds[0],
  customAvatarUri: null,
  hapticsEnabled: true,
  reducedMotion: false,
  isLoaded: false,

  setLanguage: async (language) => {
    set({ language });
    await preferences.setLanguage(language);
    i18n.changeLanguage(language).catch(() => {
      // Ignore i18n errors
    });
  },

  setTheme: async (theme) => {
    set({ theme });
    await preferences.setTheme(theme);
  },

  setAvatarId: async (avatarId) => {
    set({ avatarId, customAvatarUri: null });
    await preferences.setAvatarId(avatarId);
    await preferences.setCustomAvatarUri(null);
  },

  setCustomAvatarUri: async (uri) => {
    set({ customAvatarUri: uri });
    await preferences.setCustomAvatarUri(uri);
  },

  setHapticsEnabled: async (enabled) => {
    set({ hapticsEnabled: enabled });
    await preferences.setHapticsEnabled(enabled);
  },

  setReducedMotion: async (enabled) => {
    set({ reducedMotion: enabled });
    await preferences.setReducedMotion(enabled);
  },

  loadFromDatabase: async () => {
    try {
      const [
        language,
        theme,
        avatarId,
        customAvatarUri,
        hapticsEnabled,
        storedReducedMotion,
        deviceReducedMotion,
      ] = await Promise.all([
        preferences.getLanguage(),
        preferences.getTheme(),
        preferences.getAvatarId(),
        preferences.getCustomAvatarUri(),
        preferences.getHapticsEnabled(),
        preferences.getReducedMotion(),
        deviceReducedMotionWithin(ACCESSIBILITY_PROBE_MS),
      ]);

      const normalizedLanguage = resolveAppLanguage(language);

      // Same shape as the language above: the hero's own answer wins, and the device speaks
      // when they have not given one. Every animated component already honours this flag —
      // it just had no way of ever becoming true, since it defaulted to false and is not
      // exposed in Settings. PRODUCT.md asks for reduced-motion preferences to be respected,
      // and the OS is where that preference actually lives.
      const reducedMotion = storedReducedMotion ?? deviceReducedMotion;

      set({
        language: normalizedLanguage,
        theme: normalizeTheme(theme),
        avatarId: normalizeAvatarId(avatarId),
        customAvatarUri,
        hapticsEnabled,
        reducedMotion,
        isLoaded: true,
      });

      i18n.changeLanguage(normalizedLanguage).catch(() => {
        // Ignore i18n errors
      });
    } catch {
      // Fallback to defaults but mark as loaded so app doesn't hang
      set({ isLoaded: true });
    }
  },
}));
