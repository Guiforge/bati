import type { RestSuggestion } from "@/db/restSuggestions";
import { localizedTable } from "@/src/i18n/copy";
import type { Localized } from "@/src/i18n/deviceLanguage";

type MessagePool = Localized<string[]>;

// ponytail: the pools are arrays in `locales/*.json` (`rest_messages`), and `RestNote` fills
// `{{count}}` itself. An array has no plural suffix to hang a form on, and none of the four
// languages needs one: every count here is 5 or more. Ceiling: a language whose noun changes
// above 4 (Russian: 21 дней, 22 дня). Then these become keyed lines read with `t(…, { count })`.

/**
 * Typed on `Exclude<..., "none">` so a fifth rest-suggestion reason added to
 * `getRestSuggestion()` without a matching pool here is a compile error, not a silent blank line.
 */
export const REST_SUGGESTION_MESSAGES: Record<
  Exclude<RestSuggestion["reason"], "none">,
  MessagePool
> = localizedTable((l) => l.rest_messages);

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
