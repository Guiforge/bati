import { localized } from "./copy";
import type { AppLanguage } from "./deviceLanguage";

const LIST_AND = localized((locale) => locale.common.list_and);

/**
 * Several names as the language writes a list: "A", "A and B", "A, B and C".
 *
 * Seven screens joined names with ", " and one of them ended up in a reminder's title. Hermes has
 * no `Intl.ListFormat`, so the conjunction is a string of the locale file (`common.list_and`),
 * and it takes the language as an argument because `db/` builds a list for a notification planned
 * while `i18n.language` is still the device's.
 */
export function formatList(items: readonly string[], language: AppLanguage): string {
  const last = items.at(-1) ?? "";
  if (items.length < 2) return last;
  return LIST_AND[language]
    .replace("{{a}}", () => items.slice(0, -1).join(", "))
    .replace("{{b}}", () => last);
}
