import { localized } from "@/src/i18n/copy";
import type { AppLanguage, Localized } from "@/src/i18n/deviceLanguage";

/**
 * Shown when a finished session unlocked nothing notable (no record, no achievement, no level
 * up). Title and subtitle are paired by index, not drawn independently, so the tone never
 * mismatches (an upbeat title next to a flat subtitle).
 */
type EmptyVariant = { title: string; subtitle: string };

/**
 * Non-empty by contract: `pickSessionEmptyVariant` promises a variant, never `undefined`.
 * `__tests__/i18n-keys.test.ts` holds every pool in the locale files to that.
 */
export const SESSION_EMPTY_VARIANTS: Localized<EmptyVariant[]> = localized(
  (l) => l.session.empty_variants,
);

export function pickSessionEmptyVariant(language: AppLanguage): EmptyVariant {
  const pool = SESSION_EMPTY_VARIANTS[language];
  // The pools are non-empty (see above) and the index is modulo their own length, so the
  // assertion the return type makes is one the compiler could not derive on its own.
  return pool[Math.floor(Math.random() * pool.length)] as EmptyVariant;
}
