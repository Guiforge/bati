import { AppState } from "react-native";
import { getChangeVersion } from "@/db/changeVersion";
import { getSessionAggregates } from "@/db/completed";
import { dayKey } from "@/db/dates";
import { decideHomeOffer } from "@/db/homeOffer";
import { getOath } from "@/db/oaths";
import { preferences } from "@/db/preferences";
import {
  getReminderDays,
  getReminderSessions,
  ignoredStreak,
  planReminders,
  REMINDER_HORIZON_DAYS,
  REMINDER_LATE_MINUTES,
  REMINDER_PAUSE_DAYS,
  reminderPrefs,
  shouldAskAboutReminders,
} from "@/db/reminders";
import { i18n } from "@/i18n";
import * as Reminders from "@/modules/bati-reminders";
import { resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import { useSessionStore } from "@/stores/session";
import { isSessionHeld } from "@/stores/sessionHold";
import { reportError } from "./reportError";
import { checkForUpdate } from "./updateCheck";
import { hasUnseenNotes } from "./whatsNew";

/**
 * Hands the native reminders a fresh plan (docs/designs/rappels.md): the days, the journal, the
 * Home's offer and the oath, read now, planned by `planReminders`, armed by the native half.
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

/** The one door to a new plan: whether a session holds today is read here, from the store. */
export function replanRemindersNow(): Promise<void> {
  const { status, savedSessionId } = useSessionStore.getState();
  return replanReminders(isSessionHeld(status, savedSessionId));
}

let plannedAt: string | null = null;

/**
 * Keeps the reminders' plan in step with the app, from the root layout:
 *
 * - whenever whether a session holds today changes. Entering a session holds today's reminder;
 *   quitting gives it back; the row a save writes cancels it. A session is only in the journal once
 *   `savedSessionId` is set, long after `finished`: so a session abandoned at 19:55 hands the 20:00
 *   reminder back, and one saved at 20:30 cancels the 21:00 snooze;
 * - whenever the app goes to the background after anything was written: a session, an oath, the
 *   language, the days, a session taken back out of the journal. `getChangeVersion` also moves with
 *   the day, so a new day plans again too. The one listener on `AppState` in the app.
 *
 * Here rather than in the session store: the store imports nothing of the reminders, whose planning
 * reads the Home's whole waterfall. Returned so the caller can remove it.
 *
 * ponytail: a session deleted from the journal while the app stays open plans again on the way out,
 *           not at once. A reminder due in that very window rings from the old plan. Ceiling: one
 *           reminder, rarely. Call `replanRemindersNow` from the journal's delete if testers hit it.
 */
export function keepRemindersInStep(): { remove(): void } {
  const unsubscribe = useSessionStore.subscribe(
    (s) => isSessionHeld(s.status, s.savedSessionId),
    () => {
      replanRemindersNow().catch((e: unknown) => reportError("reminders.replan", e));
    },
  );
  const appState = AppState.addEventListener("change", (status) => {
    if (status !== "background") return;
    getChangeVersion()
      .then(async (version) => {
        if (version === plannedAt) return;
        await replanRemindersNow();
        // After, not before: a plan that failed is tried again on the next way out.
        plannedAt = version;
      })
      .catch((e: unknown) => reportError("reminders.replan", e));
  });
  return {
    remove() {
      unsubscribe();
      appState.remove();
    },
  };
}

export type ReminderCardKind = "check" | "offer" | null;

/**
 * Which reminder card, if any. One card of this family at a time on Home, and never beside the
 * update or the release notes (docs/designs/rappels.md, "Où on le propose"):
 *
 * - `check`: three reminders in a row went by untouched, and Home has not asked this month;
 * - `offer`: the hero has logged a session, never chose days, and did not close this before.
 */
export async function reminderCardKind(now = new Date()): Promise<ReminderCardKind> {
  if (!Reminders.isAvailable()) return null;
  if ((await hasUnseenNotes()) || (await checkForUpdate()) !== null) return null;

  const state = Reminders.getState();
  const today = dayKey(now);
  if (state.enabled) {
    const [sessions, streakFrom, askedAt] = await Promise.all([
      getReminderSessions(now),
      reminderPrefs.streakFrom(),
      reminderPrefs.askedAt(),
    ]);
    const streak = ignoredStreak(state.log, sessions, today, streakFrom);
    return shouldAskAboutReminders(streak, askedAt, today) ? "check" : null;
  }

  const [days, dismissed, { totalSessions }] = await Promise.all([
    getReminderDays(),
    reminderPrefs.offerDismissed(),
    getSessionAggregates(),
  ]);
  return !dismissed && Object.keys(days).length === 0 && totalSessions > 0 ? "offer" : null;
}
