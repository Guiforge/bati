import type { Localized } from "@/src/i18n/deviceLanguage";
import type { AppLanguage } from "@/stores/settings";

/** Any seeded row that carries every locale side by side: `enTitle`, `frTitle`, … */
type Multilingual<K extends string> = Record<`${AppLanguage}${Capitalize<K>}`, string>;

/**
 * Pick the locale's side of a multilingual row.
 *
 * Content is seeded with every language on the row — quests, adventures, achievements, trophies —
 * so choosing one used to be a ternary. That ternary was written out at fourteen call sites, and
 * the fifteenth (the session-recovery card) forgot it and showed English titles to French users.
 * One function instead, so there is nowhere left to forget it.
 *
 * An empty column falls back to English. A hero's own row writes the same text into every column,
 * so only a seeded row can be empty, and an English line beats a blank card.
 */
export function localizedText<K extends string>(
  row: Multilingual<K>,
  field: K,
  language: AppLanguage,
): string {
  const suffix = `${field.charAt(0).toUpperCase()}${field.slice(1)}` as Capitalize<K>;
  return row[`${language}${suffix}`] || row[`en${suffix}`];
}

export function localizedTitle(row: Multilingual<"title">, language: AppLanguage): string {
  return localizedText(row, "title", language);
}

/**
 * Same rule for `enName`/`frName` rows — exercises, mostly. The title helper existed and the
 * name ternary still got copy-pasted nine times across session, oath and exercise screens,
 * which is the exact drift the docblock above describes.
 */
export function localizedName(row: Multilingual<"name">, language: AppLanguage): string {
  return localizedText(row, "name", language);
}

/**
 * Whether a language capitalises its nouns. German does, so a muscle or a style dropped into the
 * middle of a sentence keeps its capital there ("für Brust"); lower-casing it, which English, French
 * and Spanish want, is a spelling mistake in German.
 */
const CAPITALISED_NOUNS: Localized<boolean> = { en: false, fr: false, de: true, es: false };

/** A label written into the middle of a sentence, cased the way that language writes nouns. */
export function inSentence(label: string, language: AppLanguage): string {
  return CAPITALISED_NOUNS[language] ? label : label.toLowerCase();
}
