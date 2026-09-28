import { getReminderSessions, reminderStats } from "@/db/reminders";
import * as Reminders from "@/modules/bati-reminders";

/**
 * One line for the bug report mail, in the technical block: how the reminders behaved on this
 * phone over the days its journal keeps (docs/designs/rappels.md, "Mesurer sans télémétrie").
 * Nothing leaves on its own: it travels in a mail the hero reads and sends, or does not.
 *
 * Null when the reminders were never used here, so the mail does not grow a line about nothing.
 */
export async function reminderReportLine(): Promise<string | null> {
  if (!Reminders.isAvailable()) return null;
  const { enabled, log } = Reminders.getState();
  if (!enabled && log.length === 0) return null;
  const stats = reminderStats(log, await getReminderSessions(new Date()));
  return [
    `Reminders: ${enabled ? "on" : "off"}`,
    `posted ${stats.posted}`,
    `workout within 2 h ${stats.followed}`,
    `snoozed ${stats.snoozed}`,
    `paused ${stats.paused}`,
  ].join(" · ");
}
