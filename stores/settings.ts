import { AccessibilityInfo } from "react-native";
import { create } from "zustand";
import { type AvatarId, avatarIds, isAvatarId } from "@/constants/avatars";
import type { MapStyleId } from "@/constants/mapStyle";
import type { OutingDisplay } from "@/constants/outingDisplay";
import { preferences } from "@/db";
import type { DistanceUnit, PrepMode, WarmupTransition } from "@/db/preferences";
import type { Locomotion } from "@/db/schema";
import { i18n } from "@/i18n";
import { portLegacyAvatar } from "@/src/customAvatar";
import {
  type AppLanguage,
  getDevicePreferredAppLanguage,
  resolveAppLanguage,
} from "@/src/i18n/deviceLanguage";
import { keepAwakeSet, setKeepAwake } from "@/src/outingKeepAwake";
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
  soundEnabled: boolean;
  villagersEnabled: boolean;
  /** How distances are drawn. Storage is metres either way — constants/distanceFormat.ts. */
  distanceUnit: DistanceUnit;
  /** Whether the recap may fetch its basemap. One of two network calls, and it starts off. */
  mapTilesEnabled: boolean;
  /** Which basemap look, under the tiles consent above; per device. */
  mapStyle: MapStyleId;
  /**
   * Whether the app may ask GitHub, once a day, whether a newer version has been published. The
   * other network call, off until asked for the same reason. See `src/updateCheck.ts`.
   */
  updateCheckEnabled: boolean;
  /**
   * How a session waits before a movement. Held here rather than read once by `startSession`, so
   * the session store asks it at every transition: changed mid-session, it applies to the next
   * wait, and a recovered session needs no copy of it in its snapshot.
   */
  prepMode: PrepMode;
  /** The gap between two warm-up movements, read at each one the same way as `prepMode`. */
  warmupTransition: WarmupTransition;
  /** What the hero chose to see on the outing panel, per activity. Synced; see constants/outingDisplay. */
  outingDisplay: OutingDisplay;
  /** The activities whose screen stays on during an outing. This phone only: src/outingKeepAwake. */
  outingKeepAwake: Locomotion[];
  isLoaded: boolean;

  setLanguage: (language: AppLanguage) => Promise<void>;
  setAvatarId: (avatarId: AvatarId) => Promise<void>;
  setCustomAvatarUri: (uri: string | null) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  setVillagersEnabled: (enabled: boolean) => Promise<void>;
  setDistanceUnit: (unit: DistanceUnit) => Promise<void>;
  setMapTilesEnabled: (enabled: boolean) => Promise<void>;
  setMapStyle: (id: MapStyleId) => Promise<void>;
  setUpdateCheckEnabled: (enabled: boolean) => Promise<void>;
  setPrepMode: (mode: PrepMode) => Promise<void>;
  setWarmupTransition: (value: WarmupTransition) => Promise<void>;
  setOutingDisplay: (display: OutingDisplay) => Promise<void>;
  setOutingKeepAwake: (locomotion: Locomotion, on: boolean) => Promise<void>;

  loadFromDatabase: () => Promise<void>;
  /** Re-reads the language when the device's changes; see `components/LanguageWatch.tsx`. */
  refreshLanguage: () => Promise<void>;
}

/**
 * The stored language through `resolveAppLanguage`, anchored to what the device says now: a
 * choice made before the anchor existed, or a newer one made in Android's settings, which becomes
 * the hero's choice from here on.
 */
async function loadLanguage(): Promise<AppLanguage> {
  const [stored, chosenOn] = await Promise.all([
    preferences.getLanguage(),
    preferences.getLanguageChosenOn(),
  ]);
  const language = resolveAppLanguage(stored, chosenOn);
  const device = getDevicePreferredAppLanguage();
  if (stored != null && chosenOn !== device) {
    preferences
      .setLanguage(language, device)
      .catch((e) => reportError("settings.languageAnchor", e));
  }
  return language;
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

/**
 * The OS reduce-motion preference, as two answers from one system call.
 *
 * `first` is what the opening frame gets, and it gives up after `ms`. `settled` is the truth,
 * whenever it arrives.
 *
 * The timeout used to *replace* a late answer with `false` rather than outrun it, which made the
 * preference a coin toss on exactly the devices the comment above describes: a hero who had asked
 * Android for fewer animations got them anyway whenever the accessibility service was slow to
 * come up, silently, with nothing on any screen to say so and nothing to do about it but relaunch
 * until a cold start happened to be quick. The splash still must not wait, so the race stays and
 * only the discarding goes.
 */
function probeDeviceReducedMotion(ms: number): {
  first: Promise<boolean>;
  settled: Promise<boolean>;
} {
  const settled = AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
  return {
    first: Promise.race([
      settled,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
    ]),
    settled,
  };
}

/**
 * Attached once per process, never removed: the OS setting outlives any screen, and the root
 * layout remounts, so a subscription owned by a component would stack copies of itself.
 *
 * Without it the preference was read at cold start and never again, so a hero who turned
 * "Remove animations" on in Android's settings and came back to Bati found it still animating,
 * with a relaunch the only way to be heard. Reading the OS once is not following the OS.
 */
let motionWatch: { remove: () => void } | null = null;

/**
 * What the OS last said, or `null` while it has never said anything.
 *
 * The probe and the watch are two writers for one value, and two writers diverge: a cold start
 * whose service is slow can finish reading *after* the hero has already changed the setting, and
 * hand back what it saw before they touched it. So the watch is the authority the moment it has
 * spoken, and the probe only bootstraps the value until then. Narrow, and the kind of thing that
 * shows up once as "it forgot what I asked for" and is never reproduced.
 */
let osReducedMotion: boolean | null = null;

function watchDeviceReducedMotion(apply: (reducedMotion: boolean) => void): void {
  if (motionWatch !== null) return;
  motionWatch = AccessibilityInfo.addEventListener("reduceMotionChanged", (reducedMotion) => {
    osReducedMotion = reducedMotion;
    apply(reducedMotion);
  });
}

/**
 * The warm-up transition of a hero who never chose one: auto, unless they already asked
 * to be waited for, since someone who chose GO before this setting existed must not find a clock
 * running between movements. Written down at once, or it would follow `prepMode` until the next
 * launch and then turn into auto on its own.
 */
function settleWarmupTransition(prepMode: PrepMode): WarmupTransition {
  const value: WarmupTransition = prepMode === "tap" ? "tap" : "auto";
  preferences.setWarmupTransition(value).catch((error) => {
    reportError("settings.warmupTransitionSettle", error);
  });
  return value;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: getDevicePreferredAppLanguage(),
  // Same default the DB read normalises to (normalizeAvatarId). It used to say "guardian"
  // here and fall back to avatarIds[0] there, so a hero who never picked one watched their
  // avatar change from guardian to shadow a beat after every cold start.
  avatarId: avatarIds[0],
  customAvatarUri: null,
  hapticsEnabled: true,
  reducedMotion: false,
  soundEnabled: true,
  villagersEnabled: true,
  distanceUnit: "metric",
  // Off, and the same default the DB read returns for a key nobody has written: these two are
  // what reaches a third party, so an unanswered question is a no. Both of them.
  mapTilesEnabled: false,
  mapStyle: "ember",
  updateCheckEnabled: false,
  prepMode: "timer",
  warmupTransition: "auto",
  outingDisplay: {},
  outingKeepAwake: [],
  isLoaded: false,

  setLanguage: async (language) => {
    set({ language });
    await preferences.setLanguage(language, getDevicePreferredAppLanguage());
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

  setSoundEnabled: async (enabled) => {
    set({ soundEnabled: enabled });
    await preferences.setSoundEnabled(enabled);
  },

  setVillagersEnabled: async (enabled) => {
    set({ villagersEnabled: enabled });
    await preferences.setVillagersEnabled(enabled);
  },

  setDistanceUnit: async (unit) => {
    set({ distanceUnit: unit });
    await preferences.setDistanceUnit(unit);
  },

  setMapTilesEnabled: async (enabled) => {
    set({ mapTilesEnabled: enabled });
    await preferences.setMapTilesEnabled(enabled);
  },

  setMapStyle: async (id) => {
    set({ mapStyle: id });
    await preferences.setMapStyle(id);
  },

  setUpdateCheckEnabled: async (enabled) => {
    set({ updateCheckEnabled: enabled });
    await preferences.setUpdateCheckEnabled(enabled);
  },

  setPrepMode: async (mode) => {
    set({ prepMode: mode });
    await preferences.setPrepMode(mode);
  },

  setWarmupTransition: async (value) => {
    set({ warmupTransition: value });
    await preferences.setWarmupTransition(value);
  },

  // Written first, state after: a failed write must not leave the screen saying a choice that the
  // next launch will not find.
  setOutingDisplay: async (display) => {
    try {
      await preferences.setOutingDisplay(display);
      set({ outingDisplay: display });
    } catch (error) {
      reportError("settings.outingDisplay", error);
    }
  },

  setOutingKeepAwake: async (locomotion, on) => {
    try {
      set({ outingKeepAwake: await setKeepAwake(locomotion, on) });
    } catch (error) {
      reportError("settings.outingKeepAwake", error);
    }
  },

  loadFromDatabase: async () => {
    // Before the reads, not after: a database that fails still leaves the OS watched, and the
    // catch below only sets `isLoaded`.
    watchDeviceReducedMotion((reducedMotion) => set({ reducedMotion }));
    const motion = probeDeviceReducedMotion(ACCESSIBILITY_PROBE_MS);

    try {
      const [
        normalizedLanguage,
        avatarId,
        customAvatarUri,
        hapticsEnabled,
        reducedMotion,
        villagersEnabled,
        soundEnabled,
        distanceUnit,
        mapTilesEnabled,
        mapStyle,
        updateCheckEnabled,
        prepMode,
        warmupTransition,
        outingDisplay,
        outingKeepAwake,
      ] = await Promise.all([
        loadLanguage(),
        preferences.getAvatarId(),
        preferences.getCustomAvatarUri(),
        preferences.getHapticsEnabled(),
        motion.first,
        preferences.getVillagersEnabled(),
        preferences.getSoundEnabled(),
        preferences.getDistanceUnit(),
        preferences.getMapTilesEnabled(),
        preferences.getMapStyle(),
        preferences.getUpdateCheckEnabled(),
        preferences.getPrepMode(),
        preferences.getWarmupTransition(),
        preferences.getOutingDisplay(),
        keepAwakeSet(),
      ]);

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
        // The watch outranks the probe, always: this load may be a remount long after the hero
        // last changed the setting, and its own read can still time out.
        reducedMotion: osReducedMotion ?? reducedMotion,
        villagersEnabled,
        soundEnabled,
        distanceUnit,
        mapTilesEnabled,
        mapStyle,
        updateCheckEnabled,
        prepMode,
        warmupTransition: warmupTransition ?? settleWarmupTransition(prepMode),
        outingDisplay,
        outingKeepAwake,
        isLoaded: true,
      });

      // The answer that arrived after the splash gave up still counts, unless the OS has said
      // something newer in the meantime, in which case this one is a photograph of the past.
      motion.settled
        .then((settled) => {
          if (osReducedMotion !== null) return;
          if (settled !== reducedMotion) set({ reducedMotion: settled });
        })
        .catch((error: unknown) => reportError("settings.reducedMotionSettled", error));

      // Once per install from before `customAvatar`: the picker's cache path becomes a data URI
      // that backups carry, before Android purges the file under it.
      if (customAvatarUri && !customAvatarUri.startsWith("data:")) {
        portLegacyAvatar(customAvatarUri)
          .then((ported) => {
            if (get().customAvatarUri === customAvatarUri) set({ customAvatarUri: ported });
          })
          .catch((error: unknown) => reportError("settings.avatarPort", error));
      } else {
        preferences
          .dropSupersededLegacyAvatar()
          .catch((error: unknown) => reportError("settings.avatarLegacyDrop", error));
      }

      i18n.changeLanguage(normalizedLanguage).catch(() => {
        // Ignore i18n errors
      });
    } catch {
      // Fallback to defaults but mark as loaded so app doesn't hang
      set({ isLoaded: true });
    }
  },

  refreshLanguage: async () => {
    const language = await loadLanguage();
    if (language === get().language) return;
    set({ language });
    i18n.changeLanguage(language).catch(() => {
      // Ignore i18n errors
    });
    requestWidgetsUpdate().catch((e) => reportError("widget.update", e));
  },
}));
