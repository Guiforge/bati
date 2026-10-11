import type { TFunction } from "i18next";
import type { QuestExercise } from "@/db/quests";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/**
 * The line under a slot that does not run as written, on the quest screen and mid-session alike.
 * Each reason has its own sentence, because each promises something different:
 * - a rung not reached yet promises the written movement back ("Working up to X");
 * - a set-aside one was replaced and must not be promised back ("Instead of X, set aside");
 * - a set-aside one that runs anyway has to admit it, or "won't be suggested again" is broken in
 *   silence: nothing close enough stood in, or the quest is the hero's own.
 * - a movement the hero chose over their rung says whose choice it was ("Your choice, instead
 *   of X"), because the same panel holds the way back.
 * `null` for a slot that runs as written.
 */
export function slotCaption(
  t: TFunction,
  qex: Pick<QuestExercise, "substitutedFor" | "setAsideServed" | "pinnedOver">,
  language: AppLanguage,
): string | null {
  if (qex.setAsideServed === "no_substitute") return t("setAside.served_no_substitute");
  if (qex.setAsideServed === "own_quest") return t("setAside.served_own_quest");
  // The hero asked for the written movement over their rung: say so, or the way back in the
  // panel below has nothing on the shut row pointing at it.
  if (qex.pinnedOver) {
    return t("quests.pinned_over", { name: localizedName(qex.pinnedOver, language) });
  }
  if (!qex.substitutedFor) return null;
  const name = localizedName(qex.substitutedFor, language);
  return qex.substitutedFor.setAside
    ? t("setAside.instead_of", { name, defaultValue: `Instead of ${name}, set aside` })
    : t("quests.served_easier_rung", { name, defaultValue: `Working up to ${name}` });
}
