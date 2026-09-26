import type { TFunction } from "i18next";

import type { SyncFailure } from "@/src/cloudSync";

/**
 * How sync puts things into words, for every place that shows its state: the Settings row and
 * sheet, the Home card, the prompt. Pure, so the prompt and the card can use it without loading
 * the encryption and the database with the hook.
 */

/** What the hero reads about a failure: the layer it failed at, and what to do about it. */
export function failureMessage(t: TFunction, failure: SyncFailure): string {
  return t(`sync.failure.${failure.kind}`, { status: failure.status ?? "" });
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", in the hero's language. */
export function syncAgo(t: TFunction, at: number): string {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 1) return t("sync.ago.now");
  if (minutes < 60) return t("sync.ago.minutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("sync.ago.hours", { count: hours });
  return t("sync.ago.days", { count: Math.round(hours / 24) });
}
