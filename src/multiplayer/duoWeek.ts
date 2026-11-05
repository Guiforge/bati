import {
  addDays,
  getISODay,
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  startOfISOWeek,
} from "date-fns";
import { WEEKLY_TARGETS } from "@/constants/weeklyTargets";
import type { WeekState } from "./envelope";

/**
 * One ISO week of a duo, decided from what this phone knows: the hero's own counted days, the
 * companion's latest envelope for that week, both frozen goals and the pauses. Pure, so the same
 * inputs give the same answer on both phones and in every test. The rules, numbered as the tests
 * name them, are in docs/designs/multiplayer/LOT1-SPEC.md § 1.
 */
export type IsoWeek = { isoYear: number; isoWeek: number };

export type DuoResult = "fallen" | "frozen" | "inProgress" | "waiting" | "fled";

export type DuoWeekInput = {
  week: IsoWeek;
  /** Monday first: whether the hero landed a hit that local day (F1 to F4 already applied). */
  myDays: readonly boolean[];
  myGoal: number;
  /** A pause of this hero touched the week (S5). */
  myPaused: boolean;
  /** The companion's latest envelope for this week, merged (S4), or none yet. */
  theirs: WeekState | null;
  /** When this phone first saw the week fall, if it has: a fallen week stays fallen (S2). */
  fallenAt: Date | null;
  now: Date;
};

export type DuoWeek = {
  result: DuoResult;
  mine: { hits: number; goal: number };
  /** Null until the companion's first envelope for this week. */
  theirs: { hits: number; goal: number; receivedAt: Date } | null;
};

/** How long a finished week waits for the companion's last word before it reads as fled. */
export const WAIT_DAYS = 7;

/**
 * A stamp is an instant and the companion may live up to 14 hours behind: an envelope written on
 * their Sunday evening is not their last word on the week, whatever this phone's Monday says.
 */
const LAST_WORD_SLACK_MS = 14 * 3_600_000;

/** O1, O2: between the oath's bounds, on both sides. A goal of 1 would fell a boss for nothing. */
export const clampGoal = (goal: number) =>
  Math.min(Math.max(...WEEKLY_TARGETS), Math.max(Math.min(...WEEKLY_TARGETS), goal));

export const isoWeekOf = (date: Date): IsoWeek => ({
  isoYear: getISOWeekYear(date),
  isoWeek: getISOWeek(date),
});

/** Local Monday 00:00 of an ISO week. Built from 4 January, which is always in week 1. */
export function weekStart({ isoYear, isoWeek }: IsoWeek): Date {
  return startOfISOWeek(setISOWeek(new Date(isoYear, 0, 4, 12), isoWeek));
}

/** Local Monday 00:00 of the week after: the moment this one ends. */
export const weekEnd = (week: IsoWeek) => addDays(weekStart(week), 7);

export const previousWeek = (week: IsoWeek) => isoWeekOf(addDays(weekStart(week), -3));

export const sameWeek = (a: IsoWeek, b: IsoWeek) =>
  a.isoYear === b.isoYear && a.isoWeek === b.isoWeek;

/** 0 for Monday: where a local calendar day sits in its ISO week. */
export const weekdayIndex = (date: Date) => getISODay(date) - 1;

/**
 * F4: the companion's days after tomorrow on this phone's clock are not hits yet. A clock moved
 * ahead on their side invents nothing here; a day of grace covers two honest clocks.
 */
function theirHits(week: IsoWeek, days: readonly number[], now: Date): number {
  const start = weekStart(week);
  const latest = addDays(now, 1);
  return days.filter((n, i) => n > 0 && addDays(start, i) <= latest).length;
}

/** Once neither fall nor pause decides: is the week over, and has their last word come? */
function afterTheWeek(end: Date, receivedAt: Date | null, now: Date): DuoResult {
  if (now < end) return "inProgress";
  if (receivedAt !== null && receivedAt.getTime() >= end.getTime() + LAST_WORD_SLACK_MS) {
    return "fled";
  }
  return now.getTime() - end.getTime() < WAIT_DAYS * 86_400_000 ? "waiting" : "fled";
}

export function duoWeek(input: DuoWeekInput): DuoWeek {
  const { week, theirs, now } = input;
  const mine = { hits: input.myDays.filter(Boolean).length, goal: clampGoal(input.myGoal) };
  const them =
    theirs === null
      ? null
      : {
          hits: theirHits(week, theirs.days, now),
          goal: clampGoal(theirs.goal),
          receivedAt: new Date(theirs.stamp * 1000),
        };
  const both = them !== null && mine.hits >= mine.goal && them.hits >= them.goal;
  const result: DuoResult =
    input.fallenAt !== null || both
      ? "fallen"
      : input.myPaused || theirs?.paused
        ? "frozen"
        : afterTheWeek(weekEnd(week), them?.receivedAt ?? null, now);
  return { result, mine, theirs: them };
}
