import type { TFunction } from "i18next";
import { formatShare } from "@/components/journal/journalFormat";
import type { MuscleBalance } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { inSentence } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/** Sessions in thirty days before the balance is worth a verdict. */
export const MIN_BALANCE_SESSIONS = 3;

/**
 * The one sentence about the thirty days' balance, said the same on the stats page and on the
 * balance page. The balance page used to add a "Needs Work" badge and a second message to it: three
 * verdicts on one number.
 *
 * Below three sessions a share is one quest's shape, and "Shoulders (0%) is behind" on a first day
 * is a verdict on nothing. Past it, every muscle behind is named with its share: a verdict that
 * named one muscle under a gold "8%" that belonged to another sent two auditors to the wrong number.
 */
export function workVerdict(
  t: TFunction,
  language: AppLanguage,
  balance: MuscleBalance,
): { text: string; behind: boolean } {
  if (balance.totalSessions < MIN_BALANCE_SESSIONS) {
    return { text: t("journal.work_early", { count: MIN_BALANCE_SESSIONS }), behind: false };
  }
  const label = (code: keyof typeof MUSCLE_LABELS) => MUSCLE_LABELS[code][language];
  const behind = balance.muscles
    .filter((m) => balance.weakAreas.includes(m.muscle))
    .map((m, index) =>
      t("journal.muscle_share", {
        muscle: index === 0 ? label(m.muscle) : inSentence(label(m.muscle), language),
        share: formatShare(language, m.percentage),
      }),
    );
  if (behind.length === 0) return { text: t("journal.work_balanced"), behind: false };
  const muscles =
    behind.length === 1
      ? (behind[0] ?? "")
      : t("journal.list_and", { a: behind.slice(0, -1).join(", "), b: behind.at(-1) });
  return { text: t("journal.work_behind", { count: behind.length, muscles }), behind: true };
}
