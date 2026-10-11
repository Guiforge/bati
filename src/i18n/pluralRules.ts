import type { Localized } from "./deviceLanguage";

/**
 * Hermes ships no `Intl.PluralRules` (libhermesvm.so carries Collator, DateTimeFormat and
 * NumberFormat only). i18next then falls back to a one/other rule that treats French 0 as plural
 * and never selects a `_many` or a `_few` key. These are the rules for the app languages, shared
 * by the i18next shim below and the widget's `widgetUnit`.
 *
 * One rule per language, typed on the language list: a language added without its rule does not
 * compile, and `__tests__/i18n-plural-shim.test.ts` holds each rule against the real
 * `Intl.PluralRules` of Node, so a rule written wrong fails there. Copy the rule from CLDR
 * (https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html).
 *
 * ponytail: whole, non-negative counts only (all the app ever passes); fractions would need the
 * CLDR `v`/`f` operands. Swap for a real polyfill if a screen ever counts in fractions.
 */
export type PluralCategory = "one" | "few" | "many" | "other";

type Rule = (count: number) => PluralCategory;

const roundMillion = (count: number) => count !== 0 && count % 1e6 === 0;

const oneOther: Rule = (count) => (count === 1 ? "one" : "other");

const RULES: Localized<Rule> = {
  en: oneOther,
  de: oneOther,
  fr: (count) => (count === 0 || count === 1 ? "one" : roundMillion(count) ? "many" : "other"),
  es: (count) => (count === 1 ? "one" : roundMillion(count) ? "many" : "other"),
};

function ruleFor(lang: string): Rule {
  const base = lang.split(/[-_]/)[0] ?? "";
  return (RULES as Record<string, Rule | undefined>)[base] ?? oneOther;
}

export function pluralCategory(lang: string, count: number | null): PluralCategory {
  return count === null ? "other" : ruleFor(lang)(count);
}

// Enough to meet every form of every CLDR rule: the units and teens, then a round million.
const SAMPLE = [...Array.from({ length: 200 }, (_, count) => count), 1e6];

/** The forms a language's rule can answer, which is the suffixes its locale file has to carry. */
export function pluralCategories(lang: string): PluralCategory[] {
  const rule = ruleFor(lang);
  return [...new Set<PluralCategory>([...SAMPLE.map(rule), "other"])];
}

class ShimPluralRules {
  private readonly lang: string;
  constructor(lang?: string | string[]) {
    this.lang = (Array.isArray(lang) ? lang[0] : lang) ?? "en";
  }
  select(count: number): PluralCategory {
    return pluralCategory(this.lang, count);
  }
  resolvedOptions() {
    return { pluralCategories: pluralCategories(this.lang) };
  }
}

/** Installs the rule only where the engine has none, so Node, jest and browsers keep the real one. */
export function installPluralRulesShim(): void {
  if (typeof Intl !== "undefined" && typeof Intl.PluralRules === "function") return;
  Object.defineProperty(globalThis.Intl, "PluralRules", {
    value: ShimPluralRules,
    configurable: true,
    writable: true,
  });
}
