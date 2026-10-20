import { differenceInCalendarDays } from "date-fns";
import { dayKey } from "./dates";
import type { Locomotion } from "./schema";

/**
 * The rules of a session the hero writes down, with no database in sight so the form, the writer
 * and the tests read one definition. What the entry is worth is `HAND_ENTRY_XP` (`db/xp.ts`).
 */

/** "workout" is a session of the gym, the pitch, the dojo; the others are the three ways out. */
export type HandKind = "workout" | Locomotion;

const HAND_MIN_SECONDS = 10 * 60;
const HAND_MAX_SECONDS = 4 * 3600;
export const HAND_MAX_DAYS_BACK = 7;
/** Average speeds above these are a typo, not a person (km/h). */
export const HAND_MAX_KMH: Record<Locomotion, number> = { walk: 8, run: 20, ride: 45 };

/** A session or outing Bati measured, as far as an overlap needs it. */
export type MeasuredSpan = {
  id: number;
  startedAt: Date;
  endedAt: Date;
  questId: number | null;
  outing: Locomotion | null;
};

export type HandEntryDraft = {
  kind: HandKind;
  /** When the hero says it finished; the entry's `performedAt` is this minus the duration. */
  endedAt: Date;
  durationSeconds: number;
  /** Metres, an outing's only; null for "I do not know". */
  distanceM: number | null;
};

export type HandRefusal =
  | { key: "too_old" }
  | { key: "one_per_day"; day: string }
  | { key: "duration" }
  | { key: "future" }
  | { key: "overlap"; with: MeasuredSpan }
  | {
      key: "implausible";
      speedKmh: number;
      /** The distance divided by ten when that passes (a forgotten comma), else null. */
      fixM: number | null;
    };

export type HandContext = {
  /** `dayKey` of every other hand-written entry (the one being corrected left out). */
  handDays: ReadonlySet<string>;
  /** Sessions and outings Bati measured, near the days an entry can land on. */
  measured: readonly MeasuredSpan[];
};

/** The farthest a hand can claim in one entry: four hours at the plausible speed. */
export function maxHandDistanceM(kind: Locomotion): number {
  return (HAND_MAX_SECONDS / 3600) * HAND_MAX_KMH[kind] * 1000;
}

function speedKmh(distanceM: number, seconds: number): number {
  return distanceM / 1000 / (seconds / 3600);
}

/** Refusal 5: the average speed a hand claims, with the forgotten-comma fix when it passes. */
function implausible(
  kind: Locomotion,
  seconds: number,
  distanceM: number | null,
): Extract<HandRefusal, { key: "implausible" }> | null {
  if (distanceM === null || distanceM <= 0) return null;
  const max = HAND_MAX_KMH[kind];
  const speed = speedKmh(distanceM, seconds);
  if (speed <= max) return null;
  const tenth = distanceM / 10;
  return {
    key: "implausible",
    speedKmh: Math.round(speed * 10) / 10,
    fixM: speedKmh(tenth, seconds) <= max ? tenth : null,
  };
}

/** Whether a session begun at `startedAt` can still be written down or corrected. */
export function withinHandWindow(startedAt: Date, now: Date): boolean {
  return differenceInCalendarDays(now, startedAt) <= HAND_MAX_DAYS_BACK;
}

/** The first rule the draft breaks, in the order of the sheet, or null. */
export function checkHandEntry(
  draft: HandEntryDraft,
  context: HandContext,
  now: Date = new Date(),
): HandRefusal | null {
  // A time still to come is refused, never moved to now behind the hero's back.
  if (draft.endedAt > now) return { key: "future" };
  const endedAt = draft.endedAt;
  const startedAt = new Date(endedAt.getTime() - draft.durationSeconds * 1000);
  const day = dayKey(startedAt);

  if (!withinHandWindow(startedAt, now)) return { key: "too_old" };
  if (context.handDays.has(day)) return { key: "one_per_day", day };
  if (draft.durationSeconds < HAND_MIN_SECONDS || draft.durationSeconds > HAND_MAX_SECONDS) {
    return { key: "duration" };
  }
  const clash = context.measured.find((m) => m.startedAt < endedAt && m.endedAt > startedAt);
  if (clash) return { key: "overlap", with: clash };

  return draft.kind === "workout"
    ? null
    : implausible(draft.kind, draft.durationSeconds, draft.distanceM);
}

/**
 * Only the distance's question, for an outing Bati already timed: its day, length and neighbours
 * were settled when it was measured, so the speed is all that remains to refuse.
 */
export function checkHandDistance(
  kind: Locomotion,
  durationSeconds: number,
  distanceM: number | null,
): Extract<HandRefusal, { key: "implausible" }> | null {
  // The real duration, not the ten minutes an entry needs: a short outing is still an outing.
  return implausible(kind, Math.max(durationSeconds, 1), distanceM);
}

/**
 * Whether the hero may type an outing's distance: Bati measured none. `movingSeconds` alone is not
 * the witness, every outing saved before 0046 has it null beside a GPS-measured `leaguesM`.
 */
export function takesHandDistance(row: {
  outing: Locomotion | null;
  byHand: string | null;
  movingSeconds: number | null;
  leaguesM: number | null;
}): boolean {
  if (row.outing == null || row.byHand === "session" || row.movingSeconds !== null) return false;
  return row.leaguesM === null || row.byHand === "distance";
}

/**
 * A time of day as a hero types it: `1930`, `19h30`, `19:30`, `7:30 pm`, `9`. Null when it is not
 * one. The keyboard is the default one (Android has no `numbers-and-punctuation`), so every shape
 * a person reaches for is read.
 */
export function parseClock(text: string): { hours: number; minutes: number } | null {
  const m = /^\s*(\d{1,2})(?:\s*(?:[:h.]\s*(\d{2})|(\d{2})))?\s*(am|pm)?\s*h?\s*$/i.exec(text);
  if (!m) return null;
  let hours = Number(m[1]);
  const minutes = Number(m[2] ?? m[3] ?? 0);
  const meridiem = m[4]?.toLowerCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === "pm" ? 12 : 0);
  }
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}
