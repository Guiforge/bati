import { addDays, setHours, startOfDay, subDays } from "date-fns";
import { dayKey } from "@/db/dates";
import { HAND_MAX_DAYS_BACK, type MeasuredSpan } from "@/db/handEntryRules";

/**
 * The form of a session written down, minus the screen: what its chips offer and what it opens on.
 * Pure, so the "prefill never opens on a refusal" rule is held by a test and not by a device.
 */

export const DURATION_CHIPS_MIN = [20, 30, 45, 60, 90] as const;

/** Today first, then back to the seventh day: the days the sheet may land an entry on. */
export function dayChoices(now: Date): Date[] {
  return Array.from({ length: HAND_MAX_DAYS_BACK + 1 }, (_, back) =>
    startOfDay(subDays(now, back)),
  );
}

/** A link's `day`: a strict `yyyy-MM-dd` within the last week, or today. Anything else is today. */
export function dayFromLink(raw: string | undefined, now: Date): Date {
  const today = startOfDay(now);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return today;
  const [y, m, d] = raw.split("-").map(Number);
  const parsed = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  // Rolled over (31 February) or out of range: not a day the sheet offers.
  if (dayKey(parsed) !== raw) return today;
  return dayChoices(now).some((c) => dayKey(c) === raw) ? parsed : today;
}

/** The day an entry ending at `end` is filed under: the day it starts. */
export function filedDay(end: Date, durationSeconds: number): Date {
  return startOfDay(new Date(end.getTime() - durationSeconds * 1000));
}

/**
 * A picked day and its proposed end, settled on the day the entry is FILED under (its start). Just
 * after midnight a hand-picked "today" proposes an end whose start is the evening before, and the
 * entry would be filed there while the chip said today: the chip follows the filed day instead.
 * One rule for the opening and for a tap, so the two never disagree.
 */
export function settleDay(
  picked: Date,
  now: Date,
  durationSeconds: number,
  measured: readonly MeasuredSpan[],
): { day: Date; end: Date } {
  let day = picked;
  let end = proposedEnd(day, now, durationSeconds, measured);
  const filed = filedDay(end, durationSeconds);
  if (dayKey(filed) !== dayKey(day)) {
    day = filed;
    end = proposedEnd(day, now, durationSeconds, measured);
  }
  return { day, end };
}

/**
 * The day and end the sheet opens on. An entry is filed under the day it STARTS, so just after
 * midnight "today" would land on the evening before: that day is what the sheet opens on, and the
 * one-per-day check reads it. Skips days whose filed day already has an entry; all taken, the
 * newest day, and the refusal speaks.
 */
export function openingDay(
  now: Date,
  handDays: ReadonlySet<string>,
  durationSeconds: number,
  measured: readonly MeasuredSpan[],
): { day: Date; end: Date } {
  for (const choice of dayChoices(now)) {
    const { day, end } = settleDay(choice, now, durationSeconds, measured);
    if (!handDays.has(dayKey(filedDay(end, durationSeconds)))) return { day, end };
  }
  return {
    day: startOfDay(now),
    end: proposedEnd(startOfDay(now), now, durationSeconds, measured),
  };
}

/**
 * When the entry ends, proposed. Today: now, rounded down to five minutes, then moved back before
 * any measured session it would overlap (its end becomes that session's start). Another day: the
 * reminder's hour for it when the hero has one, else 18:00. Never later than now.
 */
export function proposedEnd(
  day: Date,
  now: Date,
  durationSeconds: number,
  measured: readonly MeasuredSpan[],
  reminderHour?: { hours: number; minutes: number } | null,
): Date {
  let end: Date;
  if (dayKey(day) === dayKey(now)) {
    end = new Date(now);
    end.setSeconds(0, 0);
    end.setMinutes(end.getMinutes() - (end.getMinutes() % 5));
  } else {
    end = setHours(startOfDay(day), reminderHour?.hours ?? 18);
    end.setMinutes(reminderHour?.minutes ?? 0);
  }
  const unshifted = end;
  // At most a handful of sessions a day: each pass either settles or moves strictly earlier.
  for (let pass = 0; pass < measured.length + 1; pass++) {
    const start = new Date(end.getTime() - durationSeconds * 1000);
    const clash = measured.find((m) => m.startedAt < end && m.endedAt > start);
    if (!clash) break;
    end = clash.startedAt;
  }
  // Pushed back across midnight the entry would land on another day: keep the chosen one and let
  // the overlap refusal speak.
  if (dayKey(end) !== dayKey(day)) end = unshifted;
  return end > now ? now : end;
}

/** The end on `day` at a typed time of day. */
export function endOn(day: Date, clock: { hours: number; minutes: number }): Date {
  const end = startOfDay(day);
  end.setHours(clock.hours, clock.minutes, 0, 0);
  return end;
}

/**
 * Where a typed time of day lands: on the day the chip shows (the one `current` is filed under),
 * the latest occurrence that is not in the future and still files the entry under that day, so
 * 23:50 typed at 00:20 under "yesterday" is last night, and 00:10 is just after midnight. Nothing
 * of the kind (a time still to come today): that day at the time, in the future, and the form
 * refuses it rather than moving it.
 */
export function typedEnd(
  current: Date,
  durationSeconds: number,
  clock: { hours: number; minutes: number },
  now: Date,
): Date {
  const day = filedDay(current, durationSeconds);
  const same = endOn(day, clock);
  for (const c of [endOn(addDays(day, 1), clock), same]) {
    if (c <= now && dayKey(filedDay(c, durationSeconds)) === dayKey(day)) return c;
  }
  return same;
}

/** Minutes typed into "Autre": whole minutes, or null for anything else. */
export function parseMinutes(text: string): number | null {
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null;
}

/** A distance typed in the hero's unit, comma accepted, in metres; null for empty or nonsense. */
export function parseDistanceM(text: string, metresPerUnit: number): number | null {
  if (text.trim() === "") return null;
  const n = Number(text.replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * metresPerUnit) : null;
}

/** Which of the three sentences the Toast says, read after the write. */
export function toastKey(result: {
  flameActive: boolean;
  oathKept: boolean;
}): "toast_oath" | "toast_flame" | "toast_noted" {
  if (result.oathKept) return "toast_oath";
  return result.flameActive ? "toast_flame" : "toast_noted";
}
