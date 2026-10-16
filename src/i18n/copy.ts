import de from "@/locales/de.json";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ru from "@/locales/ru.json";
import zh from "@/locales/zh.json";
import type { AppLanguage, Localized } from "./deviceLanguage";

type Locale = typeof en;

/**
 * `Locale` as a file is allowed to hold it: every key of English, minus one relaxation. A plural
 * family's `_one` form is optional, because which forms a language carries is the language's own:
 * `Intl.PluralRules("zh")` answers `other` alone, so `zh.json` writes one string per counted key
 * where English writes two, and holding the file to English's forms would fail every build. Every
 * other key stays required, so a key missing from a translation is still a compile error, and
 * `__tests__/i18n-keys.test.ts` holds the families themselves: a family whose `_other` has no
 * translation fails there.
 */
type PluralFormsOptional<T> = T extends string
  ? T
  : T extends readonly (infer Item)[]
    ? PluralFormsOptional<Item>[]
    : PluralFormsOptionalObject<T>;

type PluralFormsOptionalObject<T> = {
  // A `_one` whose `_other` sibling exists is a plural form: it moves to the optional half below.
  [K in keyof T as K extends `${infer Base}_one`
    ? `${Base}_other` extends keyof T
      ? never
      : K
    : K]: PluralFormsOptional<T[K]>;
} & {
  [K in keyof T as K extends `${infer Base}_one`
    ? `${Base}_other` extends keyof T
      ? K
      : never
    : never]?: T[K];
};

/** A locale file: English's keys, with its plural forms left to each language. */
export type LocaleFile = PluralFormsOptional<Locale>;

/**
 * Every locale file, by language. Typed on `en.json`, so a key missing from another file is a
 * compile error, and a language added to `APP_LANGUAGES` without its file fails here.
 *
 * Importing this module loads all of them. The home screen widget's headless task must never
 * reach it (`src/widget.tsx`), which `__tests__/widget.test.ts` holds.
 */
export const LOCALES: Localized<LocaleFile> = { en, fr, de, es, ru, zh };

/**
 * One value read out of every locale file at once.
 *
 * For copy the code hands around as a `Localized` instead of reading with `t()`: labels and pools
 * that `db/` returns to a screen, puts into a notification planned for another day, or picks a
 * line from. They take the language as an argument because `i18n.language` is still the device's
 * at a cold start (`src/reminders.ts`), and reading the files directly is what keeps that true.
 */
export function localized<T>(read: (locale: LocaleFile) => T): Localized<T> {
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
  read: (locale: LocaleFile) => Record<K, T>,
): Record<K, Localized<T>> {
  const codes = Object.keys(read(en)) as K[];
  return Object.fromEntries(
    codes.map((code) => [code, localized((locale) => read(locale)[code])]),
  ) as Record<K, Localized<T>>;
}
