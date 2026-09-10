import { getDateTimeFormat, getWeekStart } from "@/constants/dateFormatters";
import type { Locomotion } from "@/db/schema";

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

export type JournalSession = {
  performedAt: Date;
  durationSeconds: number | null;
  userLevel: string;
  /** Which kind of session this was (`0049`). Null is a workout. */
  outing: Locomotion | null;
  /** Moving seconds on an outing; null on a workout, and on one saved before `0046`. */
  movingSeconds: number | null;
  /** Ground covered in metres on an outing; null on a workout. */
  leaguesM: number | null;
};

export type JournalStatsSummary = {
  totalWorkouts: number;
  totalMinutes: number;
  avgMinutes: number;
  levels: { easy: number; medium: number; hard: number };
  thisWeekCount: number;
  thisWeekMinutes: number;
  thisMonthCount: number;
  /** Null until the first outing, so a hero who only lifts is never shown three empty tiles. */
  outings: { count: number; leaguesM: number; avgMinutes: number } | null;
};

const sumMinutes = (sessions: readonly JournalSession[]) =>
  sessions.reduce(
    (acc, s) => acc + (s.durationSeconds ? Math.round(s.durationSeconds / 60) : 0),
    0,
  );

/**
 * The stats tab's numbers, with walks kept out of the training ones.
 *
 * An hour on foot and twenty minutes of push-ups are two different things, and the average is the
 * tile that said so loudest: a hero training 20 min three times a week and walking an hour on
 * Sunday read "77 min" as their usual workout. So the three training tiles and the difficulty
 * split count workouts alone, and the outings get tiles of their own.
 *
 * Recent activity is deliberately *not* split. That block asks what the hero did this week, and a
 * walk is something they did — the same answer the flame gives (`countsAsSession`, `db/completed`).
 *
 * What tells the two apart is `outing` on the row, never `leaguesM`: a walk whose service never
 * started covered no ground and is still a walk, and a mixed quest covered ground and is still a
 * workout. An outing's own minutes are its *moving* ones, which is what its trace can prove and
 * what its XP was paid on; standing at a crossing is not time on the road.
 *
 * `today` is a parameter for the same reason `buildMonthGrid` takes one: the week boundary should
 * be a function of its inputs rather than of the clock at render time.
 */
export function buildJournalStats(
  sessions: readonly JournalSession[],
  language: string,
  today: Date = new Date(),
): JournalStatsSummary {
  const workouts = sessions.filter((s) => s.outing === null);
  const outings = sessions.filter((s) => s.outing !== null);

  const levels = { easy: 0, medium: 0, hard: 0 };
  for (const s of workouts) {
    if (s.userLevel === "easy") levels.easy++;
    else if (s.userLevel === "hard") levels.hard++;
    else levels.medium++;
  }

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() - getWeekStart(language) + 7) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const thisWeek = sessions.filter((s) => new Date(s.performedAt) >= startOfWeek);
  const thisMonth = sessions.filter((s) => new Date(s.performedAt) >= startOfMonth);

  const totalMinutes = sumMinutes(workouts);
  const movingMinutes = outings.reduce(
    (acc, s) => acc + Math.round((s.movingSeconds ?? s.durationSeconds ?? 0) / 60),
    0,
  );

  return {
    totalWorkouts: workouts.length,
    totalMinutes,
    avgMinutes: workouts.length > 0 ? Math.round(totalMinutes / workouts.length) : 0,
    levels,
    thisWeekCount: thisWeek.length,
    thisWeekMinutes: sumMinutes(thisWeek),
    thisMonthCount: thisMonth.length,
    outings:
      outings.length === 0
        ? null
        : {
            count: outings.length,
            leaguesM: outings.reduce((acc, s) => acc + (s.leaguesM ?? 0), 0),
            avgMinutes: Math.round(movingMinutes / outings.length),
          },
  };
}
