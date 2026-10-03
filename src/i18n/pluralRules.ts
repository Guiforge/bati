/**
 * Hermes ships no `Intl.PluralRules` (libhermesvm.so carries Collator, DateTimeFormat and
 * NumberFormat only). i18next then falls back to a one/other rule that treats French 0 as plural
 * and never selects a `_many` key. This is the one rule for the four app languages, shared by the
 * i18next shim below and the widget's `widgetUnit`.
 *
 * ponytail: whole, non-negative counts only (all the app ever passes); fractions would need the
 * CLDR `v`/`f` operands. Swap for a real polyfill if a language with them is added.
 */
export type PluralCategory = "one" | "many" | "other";

export function pluralCategory(lang: string, count: number | null): PluralCategory {
  if (count === null) return "other";
  const base = lang.split(/[-_]/)[0];
  if (base === "fr") {
    if (count === 0 || count === 1) return "one";
    return count !== 0 && count % 1e6 === 0 ? "many" : "other";
  }
  if (count === 1) return "one";
  return base === "es" && count !== 0 && count % 1e6 === 0 ? "many" : "other";
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
    const base = this.lang.split(/[-_]/)[0];
    const many = base === "fr" || base === "es";
    return { pluralCategories: many ? ["one", "many", "other"] : ["one", "other"] };
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
