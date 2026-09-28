import { useLocales } from "expo-localization";
import { useEffect } from "react";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * Applies a language picked in Android's own settings while the app is open.
 *
 * Android 13+ lists every app language in its per-app picker, and `locale` is in the activity's
 * `configChanges`, so the change arrives without a restart: `useLocales` re-renders on it, and
 * the store settles whether it outranks the hero's in-app choice. Without this the app kept its
 * old language until the next cold start. A component of its own so that a locale change
 * re-renders nothing else.
 */
export function LanguageWatch() {
  const deviceLanguage = useLocales()[0].languageCode;
  const loaded = useSettingsStore((s) => s.isLoaded);
  const refreshLanguage = useSettingsStore((s) => s.refreshLanguage);

  useEffect(() => {
    // The first load already resolved this device answer; only a later one is news.
    if (!loaded || deviceLanguage == null) return;
    refreshLanguage().catch((e) => reportError("settings.refreshLanguage", e));
  }, [deviceLanguage, loaded, refreshLanguage]);

  return null;
}
