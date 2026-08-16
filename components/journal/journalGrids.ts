import { getDateTimeFormat, getWeekStart } from "@/constants/dateFormatters";

/**
 * The two grids the journal draws, lifted out of their components.
 *
 * Both were pure functions sitting inside 300-line screens with no tests, which is the worst
 * place for them: they decide what day a session appears on, and every wrong answer is *plausible*
 * — the calendar still renders, the histogram still has seven bars, they are simply shifted. That
 * reads as "my sessions moved", not as a bug, and nobody files it.
 *
 * `2023-01-01 was a Sunday` is the trick both used and it is worth keeping in one place: day
 * `1 + i` lands on `getDay() === i`, which lets Intl name any weekday without a hardcoded table.
 */

export type DayCell = {
  date: number;
  hasWorkout: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
};

export type MonthGrid = {
  year: number;
  /** 0-11, as `Date` counts them. */
  month: number;
  days: DayCell[];
  workoutCount: number;
};

/** The reference date whose `getDay()` equals `dayOfWeek`. Exported for the label helpers. */
export const weekdayReference = (dayOfWeek: number): Date => new Date(2023, 0, 1 + dayOfWeek);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const dayKey = (year: number, month: number, date: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

/**
 * Always 42 cells — six rows of seven — so the calendar never changes height between months.
 * Padding cells carry the neighbouring month's real dates, and are marked `isCurrentMonth: false`.
 *
 * `today` is a parameter rather than a `new Date()` inside, so the grid is a function of its
 * inputs alone and a test does not have to mock the clock to say what "today" means.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  workoutDates: ReadonlySet<string>,
  weekStartsOn: 0 | 1,
  today: Date = new Date(),
): MonthGrid {
  const midnight = new Date(today);
  midnight.setHours(0, 0, 0, 0);

  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7;

  const days: DayCell[] = [];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthLastDay - i;
    days.push({
      date,
      hasWorkout: workoutDates.has(dayKey(prevYear, prevMonth, date)),
      isToday: false,
      isCurrentMonth: false,
    });
  }

  let workoutCount = 0;
  for (let date = 1; date <= lastDay.getDate(); date++) {
    const dayDate = new Date(year, month, date);
    dayDate.setHours(0, 0, 0, 0);
    const hasWorkout = workoutDates.has(dayKey(year, month, date));
    if (hasWorkout) workoutCount++;

    days.push({
      date,
      hasWorkout,
      isToday: dayDate.getTime() === midnight.getTime(),
      isCurrentMonth: true,
    });
  }

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  // Computed before the loop: `days.length` grows on every push, so inlining this into the
  // condition makes the grid stop short — 38 cells instead of 42, and a calendar that changes
  // height between months.
  const remaining = 42 - days.length;
  for (let date = 1; date <= remaining; date++) {
    days.push({
      date,
      hasWorkout: workoutDates.has(dayKey(nextYear, nextMonth, date)),
      isToday: false,
      isCurrentMonth: false,
    });
  }

  return { year, month, days, workoutCount };
}

export type WeekdayBar = {
  day: string;
  count: number;
};

/**
 * Sessions per weekday, ordered from the locale's first day — Monday in French, Sunday in
 * English. The order is the whole point: the same data drawn from the wrong first day tells the
 * hero they train on days they do not.
 */
export function buildWeekdayBars(
  performedAts: readonly (Date | string | number)[],
  language: string,
): WeekdayBar[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const at of performedAts) {
    const day = new Date(at).getDay();
    counts[day] = (counts[day] ?? 0) + 1;
  }

  const weekStartsOn = getWeekStart(language);
  const shortWeekday = getDateTimeFormat(language, { weekday: "short" });

  return Array.from({ length: 7 }, (_, i) => {
    const day = (weekStartsOn + i) % 7;
    const label = shortWeekday.format(weekdayReference(day)).replace(/\.$/, "");
    return { day: capitalize(label), count: counts[day] ?? 0 };
  });
}
