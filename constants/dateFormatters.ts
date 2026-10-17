import type { AppLanguage, Localized } from "@/src/i18n/deviceLanguage";

// Intl.DateTimeFormat construction is one of the most expensive calls on Hermes (locale
// data resolution). Constructing one inside a render body — worse, inside a recycled list
// row — costs scroll frames. Formatters are immutable, so cache them per language+options.
const formatters = new Map<string, Intl.DateTimeFormat>();

/** First day of the week for each language's calendars: Sunday in English, Monday elsewhere. */
const WEEK_START: Localized<0 | 1> = { en: 0, fr: 1, de: 1, es: 1, ru: 1, zh: 1 };

export function getWeekStart(language: AppLanguage): 0 | 1 {
  return WEEK_START[language];
}

/**
 * A date a reader sees. French writes the first of a month as an ordinal ("1er mars"), which Intl
 * does not; every other language, and every other day, is what Intl writes.
 */
export function formatDay(
  language: string,
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  const text = getDateTimeFormat(language, options).format(date);
  return language === "fr" && date.getDate() === 1 ? text.replace(/^1(?!\d)/, "1er") : text;
}

export function getDateTimeFormat(
  language: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${language}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, options);
    formatters.set(key, formatter);
  }
  return formatter;
}
