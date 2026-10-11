import type { RestSuggestion } from "@/db/restSuggestions";
import { LOCALES } from "@/src/i18n/copy";

type RestReason = Exclude<RestSuggestion["reason"], "none">;

/**
 * Typed on `Exclude<..., "none">` so a fifth rest-suggestion reason added to
 * `getRestSuggestion()` without a matching pool in `locales/*.json` is a compile error, not a
 * silent blank line.
 *
 * A pool is an array of lines (`rest_messages`), and a line that counts carries the plural forms
 * of its language: `line_one`, `line_other`, and `line_few` where the noun changes above 4, as in
 * Russian (21 день, 22 дня, 25 дней). English is only read here for the size of each pool, which
 * `__tests__/i18n-keys.test.ts` holds equal in every language.
 */
const POOLS: Record<RestReason, readonly unknown[]> = LOCALES.en.rest_messages;

/** The key of the day's line for a reason, to read with `t(key, { count })`. */
export function restMessageKey(reason: RestReason, seed: string): string {
  return `rest_messages.${reason}.${pickDailyVariant(Object.keys(POOLS[reason]), seed)}.line`;
}

/**
 * Deterministic pick so the same seed (a day + a reason) always lands on the same variant —
 * revisiting Home later the same day must not change the sentence underneath it.
 */
export function pickDailyVariant(pool: string[], seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Modulo the pool's own length, so always in range; the type does not know that.
  return pool[Math.abs(hash) % pool.length] ?? "";
}
