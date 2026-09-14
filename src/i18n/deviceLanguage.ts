import { getLocales } from "expo-localization";

/**
 * Every language the app ships, in the order a picker offers them.
 *
 * The one list. A type derived from it, a guard derived from it, and nothing else in the code
 * names a language code: adding one here is what makes `tsc` point at every table, row and
 * branch that does not have it yet.
 */
export const APP_LANGUAGES = ["en", "fr", "de", "es"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

/**
 * Each language in its own words, the way a picker has to show it: a hero who landed in the wrong
 * language cannot read a label translated into it.
 */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
};

/** The language after this one, wrapping: what one tap on the settings row moves to. */
export function nextAppLanguage(language: AppLanguage): AppLanguage {
  const index = APP_LANGUAGES.indexOf(language);
  return APP_LANGUAGES[(index + 1) % APP_LANGUAGES.length] ?? "en";
}

/** A value in every language the app ships. A table missing one is a compile error. */
export type Localized<T = string> = Record<AppLanguage, T>;

export function isAppLanguage(value: unknown): value is AppLanguage {
  return APP_LANGUAGES.includes(value as AppLanguage);
}

/**
 * The one rule for "which language does this surface speak": an explicit stored choice is
 * honoured then narrowed, and the device answers only when the hero never chose. Every
 * surface must resolve it here — while the app read the device and the home screen widget
 * had its own ternary defaulting to `fr`, a fresh install spoke French on an English phone
 * (F-Droid MR !45076, finding 4).
 */
export function resolveAppLanguage(stored: string | null | undefined): AppLanguage {
  if (stored == null) return getDevicePreferredAppLanguage();
  return isAppLanguage(stored) ? stored : "en";
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
      if (isAppLanguage(code)) return code;
    }

    return "en";
  } catch {
    return "en";
  }
}
