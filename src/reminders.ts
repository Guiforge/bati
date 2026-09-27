import { AppState } from "react-native";
import { getChangeVersion } from "@/db/changeVersion";
import { decideHomeOffer } from "@/db/homeOffer";
import { getOath } from "@/db/oaths";
import { preferences } from "@/db/preferences";
import {
  getReminderDays,
  getReminderSessions,
  planReminders,
  REMINDER_HORIZON_DAYS,
  REMINDER_LATE_MINUTES,
  REMINDER_PAUSE_DAYS,
} from "@/db/reminders";
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
  // The stored language, not `i18n.language`: at a cold start the settings are still loading and
  // i18n still speaks the device's language. Same read as the widget's.
  const language = resolveAppLanguage(await preferences.getLanguage());
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key, { ...options, lng: language });
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
    horizonDays: REMINDER_HORIZON_DAYS,
    pauseDays: REMINDER_PAUSE_DAYS,
    lateMinutes: REMINDER_LATE_MINUTES,
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
        await replan();
        // After, not before: a plan that failed is tried again on the next way out.
        plannedAt = version;
      })
      .catch((e: unknown) => reportError("reminders.replan", e));
  });
}
