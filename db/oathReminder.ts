/**
 * When — if ever — the oath should speak up.
 *
 * The OS does the scheduling, so there is no system here: just a date. The app keeps exactly
 * one pending notification and recomputes it on launch and after every session, which is why a
 * one-shot date is enough and no repeating trigger, no ids and no queue are needed.
 */

/** Days without a session before the oath speaks up. */
export const OATH_REMINDER_IDLE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Same day, at the hero's chosen hour. Wall-clock, so DST shifts don't drift the reminder. */
function atTime(day: Date, time: { hour: number; minute: number }): Date {
  const d = new Date(day);
  d.setHours(time.hour, time.minute, 0, 0);
  return d;
}

/**
 * The moment to fire, given the hero's last activity.
 *
 * Normally that is `OATH_REMINDER_IDLE_DAYS` after the last session. If that moment has already
 * passed — the hero has been idle a while and just opened the app — it rolls to the next
 * occurrence of the chosen hour instead of firing immediately or being dropped.
 */
export function nextOathReminder(
  lastActivity: Date,
  time: { hour: number; minute: number },
  now: Date = new Date(),
): Date {
  const due = atTime(new Date(lastActivity.getTime() + OATH_REMINDER_IDLE_DAYS * DAY_MS), time);
  if (due.getTime() > now.getTime()) {
    return due;
  }

  const today = atTime(now, time);
  return today.getTime() > now.getTime() ? today : atTime(new Date(now.getTime() + DAY_MS), time);
}
