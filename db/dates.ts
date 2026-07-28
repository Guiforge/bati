import { format } from "date-fns";

/**
 * The calendar day a moment belongs to, in the hero's own timezone.
 *
 * Six places used to write `date.toISOString().split("T")[0]` for this, which is the **UTC**
 * day. Every one of them then compared it against something built locally — a grid of
 * `new Date(year, month, date)`, a `setHours(0,0,0,0)` midnight, a `startOfDay` — so outside
 * UTC the two never lined up: workout dots landed on the wrong calendar square, the 7-day
 * chart dropped today's session, and the daily quest (with its 1.5x XP) rotated at 02:00 or
 * 19:00 local instead of midnight.
 *
 * Use this whenever a Date has to become a day, and never `toISOString()`.
 */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
