import type { AppLanguage } from "@/stores/settings";

/** Any seeded row that carries both locales side by side. */
type Bilingual<K extends string> = Record<`en${Capitalize<K>}` | `fr${Capitalize<K>}`, string>;

/**
 * Pick the locale's side of a bilingual row.
 *
 * Content is seeded with both languages on the row — quests, adventures, achievements, trophies —
 * so choosing one is a ternary. That ternary was written out at fourteen call sites, and the
 * fifteenth (the session-recovery card) forgot it and showed English titles to French users.
 * One function instead, so there is nowhere left to forget it.
 */
export function localizedTitle(row: Bilingual<"title">, language: AppLanguage): string {
  return language === "fr" ? row.frTitle : row.enTitle;
}

/** Same idea for rows whose label field is `name` rather than `title`. */
export function localizedName(row: Bilingual<"name">, language: AppLanguage): string {
  return language === "fr" ? row.frName : row.enName;
}
