import { AppState } from "react-native";
import { getChangeVersion } from "@/db/changeVersion";
import { decideHomeOffer } from "@/db/homeOffer";
import { getOath } from "@/db/oaths";
import { getReminderDays, getReminderSessions, planReminders } from "@/db/reminders";
import { i18n } from "@/i18n";
import * as Reminders from "@/modules/bati-reminders";
import { resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import { reportError } from "./reportError";

/**
 * Hands the native reminders a fresh plan (docs/designs/rappels.md): the days, the journal, the
 * Home's offer and the oath, read now, planned by `planReminders`, armed by the native half.
 *
 * `sessionHeld` comes from the session store (`isSessionHeld`), which is the one caller that knows
 * it: every other door goes through `replanRemindersNow` there, so this module never imports the
 * store that imports it.
 *
 * Nothing is read on a phone whose switch is off: the switch is the native half's, and turning it on
 * calls this again.
 */
export async function replanReminders(sessionHeld: boolean): Promise<void> {
  if (!Reminders.isAvailable()) return;
  const state = Reminders.getState();
  if (!state.enabled) return;

  const now = new Date();
  const language = resolveAppLanguage(i18n.language);
  const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
  const [days, sessions, offer, oath] = await Promise.all([
    getReminderDays(),
    getReminderSessions(now),
    decideHomeOffer(language),
    getOath(),
  ]);
  if (!offer) return;

  const plan = planReminders({
    days,
    now,
    sessions,
    sessionActive: sessionHeld,
    state,
    offer,
    oath,
    language,
    t,
  });
  Reminders.setPlan({
    ...plan,
    channelName: t("reminders.channel"),
    actionLabels: { snooze: t("reminders.snooze"), pause: t("reminders.pause") },
  });
}

let plannedAt: string | null = null;

/**
 * Plans again whenever the app goes to the background after anything was written: a session, an
 * oath, the language, the days. `getChangeVersion` also moves with the day, so a new day plans
 * again too. The one listener on `AppState` in the app, returned so the caller can remove it.
 */
export function replanWhenBackgrounded(replan: () => Promise<void>): { remove(): void } {
  return AppState.addEventListener("change", (status) => {
    if (status !== "background") return;
    getChangeVersion()
      .then(async (version) => {
        if (version === plannedAt) return;
        plannedAt = version;
        await replan();
      })
      .catch((e: unknown) => reportError("reminders.replan", e));
  });
}
