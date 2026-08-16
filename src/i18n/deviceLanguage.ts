import { getLocales } from "expo-localization";

export type AppLanguage = "en" | "fr";

/**
 * The one rule for "which language does this surface speak": an explicit stored choice is
 * honoured then narrowed, and the device answers only when the hero never chose. Every
 * surface must resolve it here — while the app read the device and the home screen widget
 * had its own ternary defaulting to `fr`, a fresh install spoke French on an English phone
 * (F-Droid MR !45076, finding 4).
 */
export function resolveAppLanguage(stored: string | null | undefined): AppLanguage {
  if (stored == null) return getDevicePreferredAppLanguage();
  return stored === "fr" ? "fr" : "en";
}

export function getDevicePreferredAppLanguage(): AppLanguage {
  try {
    const locales = getLocales();
    const codes = locales
      .map((l) => l.languageCode ?? l.languageTag?.split("-")[0] ?? null)
      .filter((c): c is string => typeof c === "string" && c.length > 0);

    // In preference order: Android prepends a per-app locale to the system list, so
    // [en, fr-FR] means the user asked for English — matching "fr" anywhere would flip it.
    for (const code of codes) {
      if (code === "fr" || code === "en") return code;
    }

    return "en";
  } catch {
    return "en";
  }
}
