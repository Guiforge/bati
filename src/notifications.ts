import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { oathText } from "@/components/oath/useOathText";
import { nextOathReminder } from "@/db/oathReminder";
import { getOathProgress } from "@/db/oaths";
import { preferences } from "@/db/preferences";
import { getStreakInfo } from "@/db/streaks";
import i18n from "@/i18n";

/**
 * The whole notification system: one local reminder for the sworn oath.
 *
 * There is no scheduler, no background task and no server — the OS holds a single pending
 * notification, and `rescheduleOathReminder()` recomputes it on launch and after every session.
 * Cancelling everything before scheduling makes it idempotent, so no ids are ever tracked.
 */

/** Android needs a channel before anything can be posted. Creating it twice is a no-op. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Bati",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/**
 * Ask for permission, but only from a deliberate tap — never on launch. Returns whether
 * notifications can actually be posted.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (await hasNotificationPermission()) return true;
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/**
 * Replace the pending reminder with the one the current state deserves — possibly none.
 *
 * Silent by design: a hero who never granted permission, disabled the toggle, swore nothing or
 * already fulfilled their oath simply ends up with nothing scheduled.
 */
export async function rescheduleOathReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!(await preferences.getNotificationsEnabled())) return;
  if (!(await hasNotificationPermission())) return;

  const progress = await getOathProgress();
  if (!progress || progress.isFulfilled) return;

  // An oath sworn before the hero ever trained still deserves a nudge, counted from the promise.
  const { lastWorkoutDate } = await getStreakInfo();
  const lastActivity = new Date(lastWorkoutDate ?? progress.oath.swornAt);
  if (Number.isNaN(lastActivity.getTime())) return;

  const date = nextOathReminder(lastActivity, await preferences.getNotificationTime());

  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t("notifications.oath_title"),
      body: i18n.t("notifications.oath_body", {
        oath: oathText(progress, i18n),
        current: progress.current,
        target: progress.target,
      }),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}
