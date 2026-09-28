import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameWeek,
  parse,
  startOfWeek,
  subDays,
} from "date-fns";
import { gte } from "drizzle-orm";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";
import { db, schema } from "./client";
import { OUTING_COUNTS_AFTER_SECONDS } from "./completed";
import { dayKey } from "./dates";
import { formatDurationEstimate } from "./estimate";
import type { HomeOffer } from "./homeOffer";
import { DEFAULT_WEEKLY_TARGET, type Oath, oathWeekStart } from "./oaths";
import { getPreference, setPreference } from "./preferences";
import { REST_LOOKBACK_DAYS, restSuggestionAt } from "./restSuggestions";

const { completedQuest } = schema;

/**
 * The reminders' rule, whole: which days ring, when, and what they say (docs/designs/rappels.md).
 *
 * Everything that decides lives here, in functions that take the world as arguments. The native
 * module (`modules/bati-reminders`) stores what it is handed, arms it and posts it; it decides
 * nothing, so every promise the design makes is a unit test rather than a device check.
 */

/** Indexed like `Date.getDay()`: Sunday is 0. */
export const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * The hero's days and the hour each one rings, `"HH:mm"`. One hour per day, so a different hour on
 * Saturday one day is a Settings change and not a migration. Synced (`MERGED_PREFERENCES`): it is
 * the hero's rhythm, not this phone's. Whether this phone rings at all is the native switch's.
 */
export type ReminderDays = Partial<Record<Weekday, string>>;

/** Days of reminders armed ahead. Past it, a hero who has not opened the app hears nothing more. */
export const REMINDER_HORIZON_DAYS = 14;
/** What "Pause 7 days" on the notification skips, and so the margin the plan carries past the horizon. */
export const REMINDER_PAUSE_DAYS = 7;
/**
 * Days of entries handed to the native side: the horizon, plus room for a pause tapped on the
 * notification without the app being opened, after which the native side still has fourteen days.
 */
// ponytail: the margin fully covers a pause tapped on the plan's own day. Tapped on day 5 without
//           the app being opened, the native side gets 9 days after it rather than 14, then goes
//           quiet as it would anyway. Size the plan by the horizon twice if testers hit it.
export const REMINDER_PLAN_DAYS = REMINDER_HORIZON_DAYS + REMINDER_PAUSE_DAYS;
/** A reminder that would arrive later than this after its hour is dropped, never caught up. */
export const REMINDER_LATE_MINUTES = 60;
/** Ignored days in a row before Home asks whether the reminders land well. */
export const IGNORED_BEFORE_ASKING = 3;
/** Days between two of those questions, at least. */
export const DAYS_BETWEEN_ASKING = 30;
/** The hour offered when nothing in the journal says better. */
export const DEFAULT_REMINDER_TIME = "18:00";

/** A session as the plan needs it: when, and whether it was an outing. */
export type ReminderSession = {
  performedAt: Date;
  outing: string | null;
  movingSeconds: number | null;
  durationSeconds: number | null;
};

/**
 * `isWorkout()` for a row already in memory: training, never an outing. Kept beside the SQL one in
 * `db/completed.ts`, and `__tests__/reminders-session-rows.test.ts` holds the two to one answer.
 */
export function isWorkoutRow(row: Pick<ReminderSession, "outing">): boolean {
  return row.outing === null;
}

/** `countsAsSession()` for a row in memory: a workout, or ten minutes on the road. */
export function countsAsSessionRow(row: ReminderSession): boolean {
  return (
    row.outing === null ||
    (row.movingSeconds ?? row.durationSeconds ?? 0) >= OUTING_COUNTS_AFTER_SECONDS
  );
}

/** One day the native side posted, as its journal keeps it (the last ten). */
export type ReminderLogEntry = {
  date: string;
  /** Which sentence it said, `"<case>.<n>"`, so the next plan says another. */
  variant: string | null;
  /** "In 1 hour" was tapped: the day rang twice and counts once. */
  snoozed: boolean;
  /** The hero tapped it into the app. */
  opened: boolean;
  /** "Pause 7 days" was tapped on it. */
  paused: boolean;
  /** `HH:mm` it actually rang at, which an inexact alarm decides. Null before the native side kept it. */
  postedAt?: string | null;
};

/**
 * `"yes"`: today may still ring, and a snooze in waiting may too.
 * `"hold"`: a session is under way. Nothing rings, and a snooze waits rather than being dropped.
 * `"no"`: today is done or a rest day. A snooze in waiting is cancelled.
 */
export type DueToday = "yes" | "hold" | "no";

export type ReminderEntry = {
  /** Local `yyyy-MM-dd`, never an instant: 20:00 stays 20:00 wherever the phone is. */
  date: string;
  /** Local `HH:mm`. Kotlin turns the pair into an instant when it arms it, in the zone of the day. */
  time: string;
  title: string;
  /** The oath's line for the week, or empty. The native side adds the quiet line to the last one. */
  body: string;
  variant: string;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type PlanInput = {
  days: ReminderDays;
  now: Date;
  /** At least the `REST_LOOKBACK_DAYS` before `now`: the rest advice reads that far. */
  sessions: readonly ReminderSession[];
  /**
   * A session is on screen, or won and not yet saved. Read from the session store, never kept by
   * the native side: a flag written there would stay set in an app killed mid-session.
   */
  sessionActive: boolean;
  state: { resumeDate: string | null; log: readonly ReminderLogEntry[] };
  offer: HomeOffer;
  oath: Oath | null;
  language: AppLanguage;
  t: Translate;
};

export type ReminderPlan = {
  entries: ReminderEntry[];
  dueToday: DueToday;
  quietText: string;
};

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function timeOf(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** A local day key read back as that day's local midnight. Never `new Date(key)`, which is UTC. */
export function dayOf(key: string): Date {
  return parse(key, "yyyy-MM-dd", new Date(0));
}

/** The moment `time` on day `key`, local. In a spring-forward gap it lands an hour on, harmlessly. */
function at(key: string, time: string): Date {
  const day = dayOf(key);
  const minutes = minutesOf(time);
  // From parts, not `setMinutes` on the day: where daylight saving starts at midnight (Chile,
  // Lebanon) that day's "midnight" is 01:00, and 20:00 would land at 21:00.
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), minutes / 60, minutes % 60);
}

/** Rest the reminders stay quiet for: the acute reasons. A deload says go easy, not stay home. */
function restsOn(workouts: readonly Date[], moment: Date): boolean {
  const { reason } = restSuggestionAt(workouts, moment);
  return reason === "consecutive_days" || reason === "high_volume" || reason === "overtraining";
}

/** Sentences per case, in the locale files as `reminders.<case>.<n>`. */
export const VARIANT_COUNTS = {
  adventure: 3,
  boss: 2,
  oath_exercise: 2,
  oath_leagues: 2,
  weak_muscles: 2,
  first_day: 2,
  gallery: 2,
} as const;
type VariantCase = keyof typeof VARIANT_COUNTS;

type Sentence = { case: VariantCase; params: Record<string, unknown>; only?: readonly number[] };

/** What the reminder can say about the Home's offer, and with which words. */
function sentenceFor(offer: HomeOffer, language: AppLanguage): Sentence {
  switch (offer.kind) {
    case "adventure":
      if (offer.boss) return { case: "boss", params: { boss: offer.boss.name, hp: offer.boss.hp } };
      return {
        case: "adventure",
        params: { n: offer.step, total: offer.total, adventure: offer.title },
        // Only "Step 2 of 5" can be said without the adventure's name.
        only: offer.title === null ? [2] : undefined,
      };
    case "oath_exercise": {
      const quest = localizedTitle(offer.quest, language);
      return offer.rung
        ? {
            case: "oath_exercise",
            params: { n: offer.rung.position, total: offer.rung.total, quest },
          }
        : { case: "oath_exercise", params: { quest }, only: [1] };
    }
    case "oath_leagues":
      return { case: "oath_leagues", params: { done: offer.done, total: offer.target } };
    case "weak_muscles":
      return {
        case: "weak_muscles",
        params: { quest: localizedTitle(offer.quest, language), muscles: offer.muscles },
      };
    case "first_day":
      return {
        case: "first_day",
        params: {
          quest: localizedTitle(offer.quest, language),
          duration: formatDurationEstimate(offer.seconds, language),
        },
      };
    case "gallery":
      return { case: "gallery", params: {} };
  }
}

/**
 * The sentence after `previous` among the ones this case can say, so two reminders in a row never
 * say the same thing when the case has more than one. `previous` is `"<case>.<n>"` or null.
 */
export function nextVariant(
  sentenceCase: VariantCase,
  previous: string | null,
  only?: readonly number[],
): number {
  const allowed = only ?? Array.from({ length: VARIANT_COUNTS[sentenceCase] }, (_, i) => i);
  const [prevCase, prevIndex] = previous?.split(".") ?? [];
  if (prevCase !== sentenceCase) return allowed[0] ?? 0;
  const i = Number(prevIndex);
  return allowed.find((n) => n > i) ?? allowed[0] ?? 0;
}

/**
 * Sessions that count toward `oath`'s current week, the calendar week the oath counts in, with its
 * `weekStartsOn` frozen at swear time. Same definition as the oath (`countsAsSession`).
 */
export function oathWeekCount(
  oath: Oath,
  sessions: readonly ReminderSession[],
  now: Date,
  language: AppLanguage,
): number {
  const weekStartsOn = oathWeekStart(oath, language);
  const start = startOfWeek(now, { weekStartsOn });
  return sessions.filter(
    (s) => countsAsSessionRow(s) && s.performedAt >= start && s.performedAt <= now,
  ).length;
}

/** The oath's line on the reminder of `date`: only its current week, and only while it holds. */
function oathLine(input: PlanInput, date: string, done: number | null): string {
  const { oath, now, language, t } = input;
  if (!oath || done === null) return "";
  const weekStartsOn = oathWeekStart(oath, language);
  const day = dayOf(date);
  if (!isSameWeek(day, now, { weekStartsOn })) return "";

  const left = Math.max(1, oath.weeklyTarget ?? DEFAULT_WEEKLY_TARGET) - done;
  if (left <= 0) return t("reminders.oath_won");
  const daysLeft = 7 - differenceInCalendarDays(day, startOfWeek(day, { weekStartsOn }));
  return left <= daysLeft ? t("reminders.oath_more", { count: left }) : "";
}

/**
 * The next `REMINDER_PLAN_DAYS` days of reminders, from today or from the end of a pause.
 *
 * A chosen day gets one entry, unless:
 * - a workout (`isWorkout`, a walk does not count) is already logged on it;
 * - the rest advice for that day, at that hour, is acute;
 * - it is today and a session is under way;
 * - it is today and it already rang (the journal has it), whatever the hour says now;
 * - it is today and its hour is more than `REMINDER_LATE_MINUTES` gone.
 */
export function planReminders(input: PlanInput): ReminderPlan {
  const { days, now, sessions, sessionActive, state, offer, t } = input;
  const today = dayKey(now);
  const workouts = sessions.filter(isWorkoutRow).map((s) => s.performedAt);
  const trainedToday = workouts.some((w) => dayKey(w) === today);
  const reminded = new Set(state.log.map((entry) => entry.date));
  const todayMuted = trainedToday || sessionActive;
  const start = state.resumeDate && state.resumeDate > today ? state.resumeDate : today;
  const weekDone = weeklyOathDone(input);
  const sentence = sentenceFor(offer, input.language);
  let previous = lastPostedVariant(state.log);

  const entries: ReminderEntry[] = [];
  for (let i = 0; i < REMINDER_PLAN_DAYS; i++) {
    const date = dayKey(addDays(dayOf(start), i));
    const time = timeOn(days, date);
    if (time === null) continue;
    // Any day the journal has, not only today: a clock moved back must not ring one twice.
    if (reminded.has(date)) continue;
    if (date === today && (todayMuted || tooLate(now, time))) continue;
    if (restsOn(workouts, at(date, time))) continue;

    const variant = `${sentence.case}.${nextVariant(sentence.case, previous, sentence.only)}`;
    previous = variant;
    entries.push({
      date,
      time,
      title: t(`reminders.${variant}`, sentence.params),
      body: oathLine(input, date, weekDone),
      variant,
    });
  }

  const done = trainedToday || restsOn(workouts, todayMoment(days, today, now));
  return { entries, dueToday: dueTodayFor(done, sessionActive), quietText: t("reminders.quiet") };
}

/**
 * When today's rest is judged: at today's hour while it is still ahead, as today's entry was, or the
 * two could disagree. Rest only fades with time, so an entry at 20:00 could stand beside a "no"
 * judged at 10:00.
 */
function todayMoment(days: ReminderDays, today: string, now: Date): Date {
  const time = timeOn(days, today);
  const hour = time === null ? null : at(today, time);
  return hour !== null && hour > now ? hour : now;
}

/** Done or rested wins over a session under way: nothing left to hold today for. */
function dueTodayFor(done: boolean, sessionActive: boolean): DueToday {
  if (done) return "no";
  return sessionActive ? "hold" : "yes";
}

/** The hour `date` rings at, or null when its weekday is not one of the hero's. */
function timeOn(days: ReminderDays, date: string): string | null {
  const time = days[WEEKDAYS[dayOf(date).getDay()] as Weekday];
  return time && HH_MM.test(time) ? time : null;
}

/** More than `REMINDER_LATE_MINUTES` past today's hour: dropped rather than caught up. */
function tooLate(now: Date, time: string): boolean {
  return minutesOf(format(now, "HH:mm")) > minutesOf(time) + REMINDER_LATE_MINUTES;
}

/** What the newest day in the native journal said, so the next reminder says something else. */
function lastPostedVariant(log: readonly ReminderLogEntry[]): string | null {
  return [...log].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.variant ?? null;
}

/** This week's count for a weekly oath still being kept, or null when there is no line to write. */
function weeklyOathDone({ oath, sessions, now, language }: PlanInput): number | null {
  return oath?.metric === "weekly_sessions" && oath.fulfilledAt === null
    ? oathWeekCount(oath, sessions, now, language)
    : null;
}

/**
 * Days in a row, most recent last, the hero let a reminder pass: posted (a snooze counts once), not
 * tapped, no pause asked. Today never counts, it is not over. The run starts again after any
 * workout, after a day the hero tapped or paused (they answered it), and after any change to the
 * reminder settings (`streakFrom`, a day key: only the days after it count). A day that never rang
 * because the phone killed the alarm is not in the journal, and so does not count either.
 */
export function ignoredStreak(
  log: readonly ReminderLogEntry[],
  sessions: readonly ReminderSession[],
  today: string,
  streakFrom: string | null,
): number {
  const lastWorkout = sessions
    .filter(isWorkoutRow)
    .map((s) => dayKey(s.performedAt))
    .filter((day) => day < today)
    .sort()
    .at(-1);
  const since = [streakFrom, lastWorkout].filter((d): d is string => d !== null && d !== undefined);
  const after = since.sort().at(-1) ?? "";

  let streak = 0;
  for (const entry of [...log].sort((a, b) => a.date.localeCompare(b.date))) {
    if (entry.date >= today || entry.date <= after) continue;
    streak = entry.opened || entry.paused ? 0 : streak + 1;
  }
  return streak;
}

/** Whether Home asks "Do your reminders land well?": three ignored, and not asked this month. */
export function shouldAskAboutReminders(
  streak: number,
  askedAt: string | null,
  today: string,
): boolean {
  if (streak < IGNORED_BEFORE_ASKING) return false;
  return (
    askedAt === null ||
    differenceInCalendarDays(dayOf(today), dayOf(askedAt)) >= DAYS_BETWEEN_ASKING
  );
}

/** Days offered from a weekly count, spread across the week. */
const DAYS_FOR_QUOTA: Record<number, readonly Weekday[]> = {
  1: ["wed"],
  2: ["tue", "thu"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "fri"],
  5: ["mon", "tue", "wed", "thu", "fri"],
  6: ["mon", "tue", "wed", "thu", "fri", "sat"],
  7: WEEKDAYS,
};

/**
 * The days ticked the first time the switch is turned on: the weekdays the hero actually trained on
 * at least twice in the last four weeks. Without that history, the weekly oath's count spread over
 * the week, and without an oath, Monday, Wednesday and Friday.
 */
export function suggestDays(
  sessions: readonly ReminderSession[],
  now: Date,
  weeklyOath: number | null,
): Weekday[] {
  const since = subDays(now, 28);
  const byWeekday = new Map<Weekday, Set<string>>();
  for (const s of sessions) {
    if (!isWorkoutRow(s) || s.performedAt < since || s.performedAt > now) continue;
    const weekday = WEEKDAYS[s.performedAt.getDay()] as Weekday;
    const set = byWeekday.get(weekday) ?? new Set<string>();
    set.add(dayKey(s.performedAt));
    byWeekday.set(weekday, set);
  }
  const habitual = WEEKDAYS.filter((d) => (byWeekday.get(d)?.size ?? 0) >= 2);
  if (habitual.length > 0) return habitual;

  const quota = Math.min(7, Math.max(1, Math.round(weeklyOath ?? 3)));
  return [...(DAYS_FOR_QUOTA[quota] ?? DAYS_FOR_QUOTA[3] ?? [])];
}

/**
 * The hour offered the first time: the circular median of the last ten workouts' hours, half an
 * hour early (the reminder comes before the habit), on the quarter. 23:30 and 00:30 make midnight,
 * not noon: the median is taken after cutting the clock at its widest empty stretch.
 */
export function suggestTime(sessions: readonly ReminderSession[]): string {
  const minutes = sessions
    .filter(isWorkoutRow)
    .map((s) => s.performedAt)
    .sort((a, b) => b.getTime() - a.getTime())
    .slice(0, 10)
    .map((d) => d.getHours() * 60 + d.getMinutes())
    .sort((a, b) => a - b);
  if (minutes.length === 0) return DEFAULT_REMINDER_TIME;

  // The widest gap between consecutive hours, the wrap from the last back to the first included.
  let cut = 0;
  let widest = -1;
  for (let i = 0; i < minutes.length; i++) {
    const here = minutes[i] ?? 0;
    const next = i + 1 < minutes.length ? (minutes[i + 1] ?? 0) : (minutes[0] ?? 0) + 1440;
    if (next - here > widest) {
      widest = next - here;
      cut = (i + 1) % minutes.length;
    }
  }
  const unrolled = minutes.map((_, i) => {
    const m = minutes[(cut + i) % minutes.length] ?? 0;
    return cut + i >= minutes.length ? m + 1440 : m;
  });
  const mid = unrolled.length / 2;
  const median =
    unrolled.length % 2 === 1
      ? (unrolled[Math.floor(mid)] ?? 0)
      : ((unrolled[mid - 1] ?? 0) + (unrolled[mid] ?? 0)) / 2;

  return timeOf(Math.round((median - 30) / 15) * 15);
}

/** Only the well-formed days: a hand-edited or future blob must not ring at 99:00. */
export function parseReminderDays(raw: string | null): ReminderDays {
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const days: ReminderDays = {};
    for (const day of WEEKDAYS) {
      const time = (parsed as Record<string, unknown>)[day];
      if (typeof time === "string" && HH_MM.test(time)) days[day] = time;
    }
    return days;
  } catch {
    // A corrupt value reads as no days chosen: the switch shows off-days, and the next save heals it.
    return {};
  }
}

const REMINDER_DAYS_KEY = "reminderDays";

export async function getReminderDays(): Promise<ReminderDays> {
  return parseReminderDays(await getPreference(REMINDER_DAYS_KEY));
}

/**
 * The sessions the plan reads: the rest advice's window (`REST_LOOKBACK_DAYS`), which also covers
 * the oath's week and the four weeks `suggestDays` looks at.
 */
export async function getReminderSessions(now: Date): Promise<ReminderSession[]> {
  return await db
    .select({
      performedAt: completedQuest.performedAt,
      outing: completedQuest.outing,
      movingSeconds: completedQuest.movingSeconds,
      durationSeconds: completedQuest.durationSeconds,
    })
    .from(completedQuest)
    .where(gte(completedQuest.performedAt, subDays(now, REST_LOOKBACK_DAYS)));
}

/** What Settings says under the switch about today and tomorrow, beside the next reminder. */
export type DayNote = {
  /** Why today, one of the hero's days, does not ring: already trained, or a rest day. */
  today: "done" | "rest" | null;
  /** Tomorrow is one of the hero's days and the rest advice for it is acute. */
  restTomorrow: boolean;
};

/**
 * The reasons behind the plan, so the preview can always say why: "today skipped, session done",
 * "no reminder tomorrow, Bati advises rest". The same rules `planReminders` applied, read again.
 */
export function describeDay({ days, now, sessions, state }: PlanInput): DayNote {
  const today = dayKey(now);
  const tomorrow = dayKey(addDays(now, 1));
  const workouts = sessions.filter(isWorkoutRow).map((s) => s.performedAt);
  const todayTime = timeOn(days, today);
  const tomorrowTime = timeOn(days, tomorrow);

  let todayNote: DayNote["today"] = null;
  // A day that already rang has nothing left to explain: "last reminder" says the rest.
  const rang = state.log.some((e) => e.date === today);
  if (todayTime !== null && !rang) {
    if (workouts.some((w) => dayKey(w) === today)) todayNote = "done";
    else if (restsOn(workouts, at(today, todayTime))) todayNote = "rest";
  }
  return {
    today: todayNote,
    restTomorrow: tomorrowTime !== null && restsOn(workouts, at(tomorrow, tomorrowTime)),
  };
}

/**
 * The last of the hero's days that should have rung and is not in the journal, or null. A phone
 * that kills alarms (Xiaomi, Huawei, some Samsung, see dontkillmyapp.com) is only visible this way:
 * the plan was there, nothing was posted. Days before `since` (the switch turned on, the settings
 * changed), during a pause ending `pausedUntil`, past the horizon of the plan made `plannedOn`, and
 * a day with a workout or acute rest never rang on purpose, so none of them count.
 */
export function missedReminder(
  days: ReminderDays,
  log: readonly ReminderLogEntry[],
  sessions: readonly ReminderSession[],
  now: Date,
  since: string | null,
  pausedUntil: string | null,
  plannedOn: string | null,
): string | null {
  const workouts = sessions.filter(isWorkoutRow).map((s) => s.performedAt);
  const posted = new Set(log.map((e) => e.date));
  for (let back = 0; back < 7; back++) {
    const date = dayKey(subDays(now, back));
    const time = timeOn(days, date);
    if (time === null || pastHorizon(date, plannedOn)) continue;
    const hour = at(date, time);
    if (hour.getTime() + REMINDER_LATE_MINUTES * 60_000 > now.getTime()) continue;
    if (since !== null && date <= since) return null;
    if (pausedOn(date, pausedUntil) || silentOnPurpose(workouts, date, hour)) return null;
    return posted.has(date) ? null : date;
  }
  return null;
}

/** Past the fourteen days of the plan made `plannedOn`: the phone went quiet on purpose. */
function pastHorizon(date: string, plannedOn: string | null): boolean {
  return plannedOn !== null && date >= dayKey(addDays(dayOf(plannedOn), REMINDER_HORIZON_DAYS));
}

/** Inside a pause ending `pausedUntil`, which lasted two weeks at most. */
function pausedOn(date: string, pausedUntil: string | null): boolean {
  if (pausedUntil === null) return false;
  return date < pausedUntil && date >= dayKey(subDays(dayOf(pausedUntil), 14));
}

/** A day that never rang on purpose: trained, or acute rest at its hour. */
function silentOnPurpose(workouts: readonly Date[], date: string, hour: Date): boolean {
  return workouts.some((w) => dayKey(w) === date) || restsOn(workouts, hour);
}

/**
 * The counts a tester can paste into a bug report, and nothing leaves on its own: reminders posted
 * in the journal, how many were followed by a workout within two hours, snoozed, paused.
 */
export function reminderStats(
  log: readonly ReminderLogEntry[],
  sessions: readonly ReminderSession[],
): { posted: number; followed: number; snoozed: number; paused: number } {
  const workouts = sessions.filter(isWorkoutRow).map((s) => s.performedAt.getTime());
  let followed = 0;
  for (const entry of log) {
    if (!entry.postedAt) continue;
    const rang = at(entry.date, entry.postedAt).getTime();
    if (workouts.some((w) => w >= rang && w - rang <= 2 * 60 * 60_000)) followed++;
  }
  return {
    posted: log.length,
    followed,
    snoozed: log.filter((e) => e.snoozed).length,
    paused: log.filter((e) => e.paused).length,
  };
}

export async function setReminderDays(days: ReminderDays): Promise<void> {
  await setPreference(REMINDER_DAYS_KEY, JSON.stringify(parseReminderDays(JSON.stringify(days))));
}

/**
 * What this phone did with its own reminders (`DEVICE_LOCAL_PREFERENCES`): when Home last asked
 * whether they land well, the day the settings last changed (ignored days count after it), and
 * whether the Home's offer was closed.
 */
export const reminderPrefs = {
  askedAt: () => getPreference("reminderAskedAt"),
  setAskedAt: (day: string) => setPreference("reminderAskedAt", day),
  streakFrom: () => getPreference("reminderStreakFrom"),
  setStreakFrom: (day: string) => setPreference("reminderStreakFrom", day),
  offerDismissed: async () => (await getPreference("reminderOfferDismissed")) === "true",
  dismissOffer: () => setPreference("reminderOfferDismissed", "true"),
};
