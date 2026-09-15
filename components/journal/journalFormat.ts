import type { TFunction } from "i18next";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import type { CompletedExercise } from "@/db/completed";
import type { QuestTargetType } from "@/db/schema";

/**
 * The Journal's small arithmetic, apart from the screens so it can be checked without rendering.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** A hold as a clock: 70 → "1:10", 56 → "0:56". The wall's column, where holds line up. */
export function formatHold(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** A set as it reads in a row of sets: "12", "39s" ("39 s" in French), "1:04". */
export function formatSet(t: TFunction, value: number, type: QuestTargetType | null): string {
  if (type !== "time") return String(value);
  return value < 60 ? t("journal.set_seconds", { value }) : formatHold(value);
}

/** A movement's value in the wall's column: reps as a count, holds as a clock. */
export function formatWallValue(value: number, type: QuestTargetType, language: string): string {
  return type === "time" ? formatHold(value) : formatCount(language, value);
}

/**
 * What beats a record: one more in the movement's own unit. A rep for reps, a second for a hold.
 * A movement never logged is beaten by anything at all, so its target is one.
 */
export function targetToBeat(best: number | null): number {
  return best == null ? 1 : best + 1;
}

export type Age =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "date" }
  | { kind: "months"; count: number }
  | { kind: "years"; count: number };

/** Local midnight, so "yesterday" means the calendar day and not 24 hours. */
function midnight(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * How a date should be said. A date within two months is a date ("Sep 2"); an older one is an
 * age ("7 months ago"), because a date without a year is ambiguous past a season and a year on
 * every row is noise. Today and yesterday are words.
 */
export function ageOf(at: Date, now: Date): Age {
  const days = Math.round((midnight(now) - midnight(at)) / DAY_MS);
  if (days <= 0) return { kind: "today" };
  if (days === 1) return { kind: "yesterday" };
  if (days < 60) return { kind: "date" };
  const months = Math.floor(days / 30.44);
  if (months < 12) return { kind: "months", count: months };
  return { kind: "years", count: Math.floor(months / 12) };
}

export type MovementRow = {
  exercise: CompletedExercise["exercise"];
  sets: { value: number; met: boolean | null; type: QuestTargetType }[];
  /** The target, when every set had the same one. */
  target: { value: number; type: QuestTargetType } | null;
  /** Every set reached its target. Null when there was no target to reach. */
  cleared: boolean | null;
};

/**
 * A session's rounds folded into one row per movement, sets in round order: nine cards of
 * "Result / Target" become three lines a hero can read across.
 */
export function foldRounds(exercises: readonly CompletedExercise[]): MovementRow[] {
  const ordered = [...exercises].sort(
    (a, b) => a.roundIndex - b.roundIndex || a.sortOrder - b.sortOrder || a.id - b.id,
  );
  const rows = new Map<number, MovementRow>();

  for (const ex of ordered) {
    const met = ex.target ? ex.result.value >= ex.target.value : null;
    const row = rows.get(ex.exercise.id) ?? {
      exercise: ex.exercise,
      sets: [],
      target: ex.target ?? null,
      cleared: null,
    };
    row.sets.push({ value: ex.result.value, met, type: ex.result.type });
    if (
      row.target &&
      (!ex.target || ex.target.value !== row.target.value || ex.target.type !== row.target.type)
    ) {
      row.target = null;
    }
    rows.set(ex.exercise.id, row);
  }

  for (const row of rows.values()) {
    const judged = row.sets.filter((s) => s.met !== null);
    row.cleared = judged.length === 0 ? null : judged.every((s) => s.met);
  }

  return [...rows.values()];
}

/** The day a flame goes out: the day after its last lit one. */
export function dayAfter(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/** Whole days from today to a later day, by the calendar. */
export function daysUntil(date: Date, now: Date): number {
  return Math.round((midnight(date) - midnight(now)) / DAY_MS);
}

/** "Yesterday at 11:58", "Today at 07:12", else the date and the time. */
export function whenLabel(t: TFunction, language: string, at: Date, now = new Date()): string {
  const time = getDateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }).format(at);
  const days = Math.round((midnight(now) - midnight(at)) / DAY_MS);
  if (days === 0) return t("journal.at_today", { time });
  if (days === 1) return t("journal.at_yesterday", { time });
  const date = getDateTimeFormat(language, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(at.getFullYear() === now.getFullYear() ? null : { year: "numeric" }),
  }).format(at);
  return t("journal.at_date", { date, time });
}

/**
 * A short date, with its year when it is not this year's. A veteran's records are two years old,
 * and "Feb 3" on a record from 2024 reads as this February.
 */
export function shortDate(language: string, date: Date, now = new Date()): string {
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
  return getDateTimeFormat(language, options).format(date);
}

/** A count with the language's own thousands separator: "2,936", "2 936", "2.936". */
export function formatCount(language: string, value: number): string {
  return new Intl.NumberFormat(language).format(Math.round(value));
}

/** A share, 0 to 100, the way the language writes a percentage: "45%", "45 %". */
export function formatShare(language: string, percentage: number): string {
  return new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 0 }).format(
    percentage / 100,
  );
}

/** A length of time in quests: "2h 24m" in English, "2 h 24" in French. */
export function formatHoursMinutes(t: TFunction, seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("journal.duration_m", { m: minutes });
  return t("journal.duration_hm", {
    h: Math.floor(minutes / 60),
    m: String(minutes % 60).padStart(2, "0"),
  });
}
