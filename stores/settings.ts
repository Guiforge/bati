import { AccessibilityInfo } from "react-native";
import { create } from "zustand";
import { type AvatarId, avatarIds, isAvatarId } from "@/constants/avatars";
import { preferences } from "@/db";
import { i18n } from "@/i18n";
import {
  type AppLanguage,
  getDevicePreferredAppLanguage,
  resolveAppLanguage,
} from "@/src/i18n/deviceLanguage";
import { reportError } from "@/src/reportError";
import { requestWidgetsUpdate } from "@/src/widget";

export type { AppLanguage };

function normalizeAvatarId(value: string | null | undefined): AvatarId {
  return isAvatarId(value) ? value : avatarIds[0];
}

interface SettingsState {
  language: AppLanguage;
  avatarId: AvatarId;
  customAvatarUri: string | null;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  villagersEnabled: boolean;
  isLoaded: boolean;

  setLanguage: (language: AppLanguage) => Promise<void>;
  setAvatarId: (avatarId: AvatarId) => Promise<void>;
  setCustomAvatarUri: (uri: string | null) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setVillagersEnabled: (enabled: boolean) => Promise<void>;

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
  // Same default the DB read normalises to (normalizeAvatarId). It used to say "guardian"
  // here and fall back to avatarIds[0] there, so a hero who never picked one watched their
  // avatar change from guardian to shadow a beat after every cold start.
  avatarId: avatarIds[0],
  customAvatarUri: null,
  hapticsEnabled: true,
  reducedMotion: false,
  villagersEnabled: true,
  isLoaded: false,

  setLanguage: async (language) => {
    set({ language });
    await preferences.setLanguage(language);
    i18n.changeLanguage(language).catch(() => {
      // Ignore i18n errors
    });
    // The widgets resolve the language themselves, but only when they redraw — and nothing
    // redraws them for up to 30 minutes. Without this poke a hero who switches to English
    // watches FLAMME sit on the home screen until the next OS tick or cold start, which is
    // the tail of F-Droid MR !45076 finding 4: re-adding the widget was the only cure.
    // Non-blocking: never fail a settings write over a widget redraw.
    requestWidgetsUpdate().catch((e) => reportError("widget.update", e));
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

  setVillagersEnabled: async (enabled) => {
    set({ villagersEnabled: enabled });
    await preferences.setVillagersEnabled(enabled);
  },

  loadFromDatabase: async () => {
    try {
      const [language, avatarId, customAvatarUri, hapticsEnabled, reducedMotion, villagersEnabled] =
        await Promise.all([
          preferences.getLanguage(),
          preferences.getAvatarId(),
          preferences.getCustomAvatarUri(),
          preferences.getHapticsEnabled(),
          deviceReducedMotionWithin(ACCESSIBILITY_PROBE_MS),
          preferences.getVillagersEnabled(),
        ]);

      const normalizedLanguage = resolveAppLanguage(language);

      // The OS is the only source. There used to be a stored override read here and preferred
      // over the device — but no screen ever exposed a way to write it, so it was permanently
      // null and the `??` never chose the left side. PRODUCT.md asks for reduced-motion to be
      // respected; the place the hero actually expresses it is Android's own accessibility
      // settings. If Bati ever wants its own toggle, it comes back with a Settings row, not
      // before.

      set({
        language: normalizedLanguage,
        avatarId: normalizeAvatarId(avatarId),
        customAvatarUri,
        hapticsEnabled,
        reducedMotion,
        villagersEnabled,
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
