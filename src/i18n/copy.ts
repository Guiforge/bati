import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ru from "@/locales/ru.json";
import type { AppLanguage, Localized } from "./deviceLanguage";

type Locale = typeof en;

/**
 * Every locale file, by language. Typed on `en.json`, so a key missing from another file is a
 * compile error, and a language added to `APP_LANGUAGES` without its file fails here.
 *
 * Importing this module loads all of them. The home screen widget's headless task must never
 * reach it (`src/widget.tsx`), which `__tests__/widget.test.ts` holds.
 */
export const LOCALES: Localized<Locale> = { en, fr, de, es, ru };

/**
 * One value read out of every locale file at once.
 *
 * For copy the code hands around as a `Localized` instead of reading with `t()`: labels and pools
 * that `db/` returns to a screen, puts into a notification planned for another day, or picks a
 * line from. They take the language as an argument because `i18n.language` is still the device's
 * at a cold start (`src/reminders.ts`), and reading the files directly is what keeps that true.
 */
export function localized<T>(read: (locale: Locale) => T): Localized<T> {
  // Over the files themselves, not `APP_LANGUAGES`: this runs as modules load, and a suite that
  // mocks `deviceLanguage` to pin the device's language hands back no list.
  return Object.fromEntries(
    (Object.keys(LOCALES) as AppLanguage[]).map((language) => [language, read(LOCALES[language])]),
  ) as Localized<T>;
}

/**
 * A block of a locale file keyed by code, turned inside out: `{ code: { en, fr, … } }`.
 *
 * Annotate the result with the code's own type (`Record<MuscleCode, Localized>`): a code with no
 * entry in `en.json` then fails to compile, as it did when these tables were written in the code.
 */
export function localizedTable<K extends string, T>(
  read: (locale: Locale) => Record<K, T>,
): Record<K, Localized<T>> {
  const codes = Object.keys(read(en)) as K[];
  return Object.fromEntries(
    codes.map((code) => [code, localized((locale) => read(locale)[code])]),
  ) as Record<K, Localized<T>>;
}
