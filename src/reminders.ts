import { AppState } from "react-native";
import { getChangeVersion } from "@/db/changeVersion";
import { getSessionAggregates } from "@/db/completed";
import { dayKey } from "@/db/dates";
import { firstMeasuredAt } from "@/db/handEntries";
import { decideHomeOffer } from "@/db/homeOffer";
import { getOath, isOathFrozen } from "@/db/oaths";
import { getActivePause } from "@/db/pause";
import { preferences } from "@/db/preferences";
import {
  getReminderDays,
  getReminderSessions,
  ignoredStreak,
  planReminders,
  REMINDER_HORIZON_DAYS,
  REMINDER_LATE_MINUTES,
  REMINDER_PAUSE_DAYS,
  type ReminderDays,
  type ReminderSession,
  reminderPrefs,
  setReminderDays,
  shouldAskAboutReminders,
  suggestDays,
  suggestTime,
  type Weekday,
} from "@/db/reminders";
import { i18n } from "@/i18n";
import { requestNotificationPermission } from "@/modules/bati-location";
import * as Reminders from "@/modules/bati-reminders";
import { resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import { type SessionStatus, useSessionStore } from "@/stores/session";
import { reportError } from "./reportError";

/**
 * Hands the native reminders a fresh plan (docs/designs/rappels.md): the days, the journal, the
 * Home's offer and the oath, read now, planned by `planReminders`, armed by the native half.
 *
 * Nothing is read on a phone whose switch is off: the switch is the native half's, and turning it on
 * calls this again.
 */
let replans = 0;

export async function replanReminders(sessionHeld: boolean): Promise<void> {
  // Plans overlap: one started as a session begins can finish after the one its quit started. Only
  // the newest may reach the native half, or the older one's hold outlives the session.
  const mine = ++replans;
  if (!Reminders.isAvailable()) return;
  const state = Reminders.getState();
  if (!state.enabled) return;

  const now = new Date();
  // The stored language, not `i18n.language`: at a cold start the settings are still loading and
  // i18n still speaks the device's language. Same read as the widget's.
  const language = resolveAppLanguage(await preferences.getLanguage());
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key, { ...options, lng: language });
  const [days, sessions, offer, oath, pause, first] = await Promise.all([
    getReminderDays(),
    getReminderSessions(now),
    decideHomeOffer(language),
    getOath(),
    getActivePause(now),
    firstMeasuredAt(),
  ]);
  if (!offer || mine !== replans) return;

  const plan = planReminders({
    days,
    now,
    sessions,
    sessionActive: sessionHeld,
    state,
    pausedUntil: pause?.until ?? null,
    offer,
    // A frozen oath is not counted down in a notification (db/oaths.ts `isOathFrozen`).
    oath: oath && (await isOathFrozen(oath, now)) ? null : oath,
    language,
    t,
  });
  Reminders.setPlan({
    ...plan,
    horizonDays: REMINDER_HORIZON_DAYS,
    pauseDays: REMINDER_PAUSE_DAYS,
    lateMinutes: REMINDER_LATE_MINUTES,
    channelName: t("reminders.channel"),
    actionLabels: {
      // Before a first session, the sheet behind it could only refuse (`before_first`): an empty
      // label leaves the button off the notification.
      elsewhere: first === null ? "" : t("reminders.elsewhere"),
      snooze: t("reminders.snooze"),
      pause: t("reminders.pause"),
    },
  });
}

/**
 * Whether a session holds today's reminder: from the warm-up until the hero leaves the victory
 * screen. Not until `savedSessionId`: that is set as the save's first write, before the adventure,
 * the boss and the oath, and a plan made then read them as they were before the session.
 */
function sessionHeld(status: SessionStatus): boolean {
  return status !== "idle";
}

/** The one door to a new plan: whether a session holds today is read here, from the store. */
export function replanRemindersNow(): Promise<void> {
  return replanReminders(sessionHeld(useSessionStore.getState().status));
}

let plannedAt: string | null = null;

/**
 * Keeps the reminders' plan in step with the app, from the root layout:
 *
 * - whenever whether a session holds today changes. Entering a session holds today's reminder;
 *   leaving it gives it back, or cancels it once the journal has the session: so a session abandoned
 *   at 19:55 hands the 20:00 reminder back, and one saved at 20:30 cancels the 21:00 snooze;
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
    (s) => sessionHeld(s.status),
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
 * Which reminder card is due, if any. Whether it gets the
 * slot is `NoticeSlot`'s call (components/home/noticeOrder.ts), which shows one notice at a time:
 *
 * - `check`: three reminders in a row went by untouched, and Home has not asked this month;
 * - `offer`: the hero has logged a session, never chose days, and did not close this before.
 */
export async function reminderCardKind(now = new Date()): Promise<ReminderCardKind> {
  if (!Reminders.isAvailable()) return null;

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

/**
 * Turns the reminders on: the one writer, for Settings' switch and for the victory screen's offer.
 * Asks Android for the permission, and without it changes nothing (false). The first time, the days
 * the journal says the hero trains on at the usual hour; days already chosen are kept.
 */
export async function enableReminders(
  days: ReminderDays,
  sessions: readonly ReminderSession[],
  weeklyOath: number | null,
  now = new Date(),
): Promise<boolean> {
  if (!(await requestNotificationPermission()).granted) return false;
  const chosen =
    Object.keys(days).length > 0
      ? days
      : Object.fromEntries(
          suggestDays(sessions, now, weeklyOath).map((d) => [d, suggestTime(sessions)]),
        );
  Reminders.setEnabled(true);
  await setReminderDays(chosen);
  await reminderPrefs.setStreakFrom(dayKey(now));
  await replanRemindersNow();
  return true;
}

/** The victory screens that offer the reminder: the hero's 1st completed session, and the 3rd. */
export const WIN_OFFER_SESSIONS = [1, 3];
/** "Not now" answers after which the victory screen stops asking. */
export const WIN_OFFER_MAX_NOT_NOWS = 2;

/**
 * What the victory screen offers right after a session was kept: the weekdays to remind on, or null
 * when it stays quiet (reminders on, days chosen, the Home offer closed, two "Not now", or any
 * other session than the 1st and 3rd). Same rules as `ReminderCard`'s offer, plus the moment.
 */
export async function winReminderOffer(now = new Date()): Promise<{
  days: Weekday[];
  sessions: ReminderSession[];
} | null> {
  if (!Reminders.isAvailable() || Reminders.getState().enabled) return null;
  const [days, dismissed, notNows, { totalSessions }, sessions] = await Promise.all([
    getReminderDays(),
    reminderPrefs.offerDismissed(),
    reminderPrefs.winNotNows(),
    getSessionAggregates(),
    getReminderSessions(now),
  ]);
  if (
    dismissed ||
    notNows >= WIN_OFFER_MAX_NOT_NOWS ||
    Object.keys(days).length > 0 ||
    !WIN_OFFER_SESSIONS.includes(totalSessions)
  ) {
    return null;
  }
  // ponytail: the weekly oath is not read here, so a hero with a 4-a-week oath is offered the
  // default three days; Settings' gap line says so. Read `getOath` when someone reports it.
  return { days: suggestDays(sessions, now, null), sessions };
}
