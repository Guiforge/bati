/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import type { HomeOffer } from "@/db/homeOffer";
import type { Oath } from "@/db/oaths";
import {
  type PlanInput,
  planReminders,
  REMINDER_HORIZON_DAYS,
  REMINDER_PLAN_DAYS,
  type ReminderSession,
} from "@/db/reminders";

// Pure: nothing here touches the database, but the module that holds it does at import.
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

/**
 * `planReminders` is the whole rule: the native module arms what it is given and decides nothing,
 * so every promise the spec makes about *when* a reminder rings is held here (docs/designs/rappels.md).
 *
 * Paris, so both daylight-saving switches fall on known dates whatever zone the machine is in.
 */

/** Keys and params, so a test can see which sentence was chosen without the copy. */
const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key;

const quest = { id: 12, enTitle: "Chest Day", frTitle: "Jour des pecs", exercises: [] };
const weakMuscles = {
  kind: "weak_muscles",
  muscles: "chest",
  quest,
  startable: true,
  seconds: 1200,
} as unknown as HomeOffer;

const everyDay = {
  mon: "20:00",
  tue: "20:00",
  wed: "20:00",
  thu: "20:00",
  fri: "20:00",
  sat: "20:00",
  sun: "20:00",
};

/** Thursday 15 January 2026, 10:00. */
const thursday = new Date(2026, 0, 15, 10, 0);

function input(overrides: Partial<PlanInput> = {}): PlanInput {
  return {
    days: everyDay,
    now: thursday,
    sessions: [],
    sessionActive: false,
    state: { resumeDate: null, log: [] },
    offer: weakMuscles,
    oath: null,
    language: "en",
    t,
    ...overrides,
  };
}

const workout = (at: Date): ReminderSession => ({
  performedAt: at,
  outing: null,
  movingSeconds: null,
  durationSeconds: 1800,
});

const dates = (plan: ReturnType<typeof planReminders>) => plan.entries.map((e) => e.date);

describe("planReminders: the days", () => {
  test("one entry per chosen day, over the horizon and its pause margin", () => {
    const plan = planReminders(input());
    expect(REMINDER_PLAN_DAYS).toBe(REMINDER_HORIZON_DAYS + 7);
    expect(plan.entries).toHaveLength(REMINDER_PLAN_DAYS);
    expect(plan.entries[0]).toMatchObject({ date: "2026-01-15", time: "20:00" });
    expect(plan.entries.at(-1)?.date).toBe("2026-02-04");
  });

  test("only the chosen days, each at its own hour", () => {
    const plan = planReminders(input({ days: { mon: "07:15", thu: "20:00" } }));
    expect(plan.entries.slice(0, 3).map((e) => [e.date, e.time])).toEqual([
      ["2026-01-15", "20:00"],
      ["2026-01-19", "07:15"],
      ["2026-01-22", "20:00"],
    ]);
  });

  test("no day chosen, nothing planned", () => {
    expect(planReminders(input({ days: {} })).entries).toEqual([]);
  });

  test("an entry is a local date and a wall-clock hour, never an instant", () => {
    // 20:00 stays 20:00 wherever the phone is: Kotlin turns it into an instant at arming time,
    // in the zone the phone is in then.
    expect(Object.keys(planReminders(input()).entries[0] ?? {}).sort()).toEqual([
      "body",
      "date",
      "time",
      "title",
      "variant",
    ]);
  });

  test("spring forward: the days stay contiguous and keep their hour", () => {
    // 29 March 2026, 02:00 does not exist in Paris.
    const plan = planReminders(input({ now: new Date(2026, 2, 28, 10), days: everyDay }));
    expect(dates(plan).slice(0, 3)).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"]);
    expect(new Set(plan.entries.map((e) => e.time))).toEqual(new Set(["20:00"]));
  });

  test("spring forward: an hour inside the gap is still planned for that day", () => {
    const now = new Date(2026, 2, 29, 1, 30);
    const plan = planReminders(input({ now, days: { sun: "02:30" } }));
    expect(plan.entries[0]).toMatchObject({ date: "2026-03-29", time: "02:30" });
  });

  test("fall back: the days stay contiguous and keep their hour", () => {
    // 25 October 2026, 03:00 happens twice in Paris.
    const plan = planReminders(input({ now: new Date(2026, 9, 24, 10) }));
    expect(dates(plan).slice(0, 3)).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });

  test("today still rings up to an hour late, then it is dropped rather than caught up", () => {
    const at = (h: number, m: number) => new Date(2026, 0, 15, h, m);
    expect(dates(planReminders(input({ now: at(20, 59) })))[0]).toBe("2026-01-15");
    expect(dates(planReminders(input({ now: at(21, 1) })))[0]).toBe("2026-01-16");
  });
});

describe("planReminders: never for nothing", () => {
  test("a workout already logged today silences today, and today only", () => {
    const plan = planReminders(input({ sessions: [workout(new Date(2026, 0, 15, 17))] }));
    expect(dates(plan)[0]).toBe("2026-01-16");
    expect(plan.dueToday).toBe("no");
  });

  test("a walk is not a workout: it leaves the reminder alone", () => {
    const walk = {
      performedAt: new Date(2026, 0, 15, 8),
      outing: "walk",
      movingSeconds: 3600,
      durationSeconds: 3600,
    } as ReminderSession;
    const plan = planReminders(input({ sessions: [walk] }));
    expect(dates(plan)[0]).toBe("2026-01-15");
    expect(plan.dueToday).toBe("yes");
  });

  test("acute rest silences every day it lasts, and no more", () => {
    // Five days in a row ending yesterday, one of them twice: today is the fifth day in a row, and
    // tomorrow still has six sessions in its last seven days. Saturday, the oldest falls out.
    const sessions = [1, 1, 2, 3, 4, 5].map((d) => workout(new Date(2026, 0, 15 - d, 12)));
    const plan = planReminders(input({ sessions }));
    expect(dates(plan).slice(0, 2)).toEqual(["2026-01-17", "2026-01-18"]);
    expect(plan.dueToday).toBe("no");
  });

  test("a deload does not silence anything: it says go easy, not stay home", () => {
    const days = [0, 1, 2, 3].flatMap((w) => [1, 2, 4, 6].map((o) => w * 7 + o));
    const sessions = days.map((d) => workout(new Date(2026, 0, 15 - d, 12)));
    const plan = planReminders(input({ sessions }));
    expect(dates(plan)[0]).toBe("2026-01-15");
  });

  test("a session under way holds today without dropping it, and gives it back once abandoned", () => {
    const during = planReminders(input({ sessionActive: true }));
    expect(during.dueToday).toBe("hold");
    // Still planned: the hold lives in the native half's memory, and an app killed mid-session
    // must still ring today.
    expect(dates(during)[0]).toBe("2026-01-15");

    const after = planReminders(input({ sessionActive: false }));
    expect(after.dueToday).toBe("yes");
    expect(dates(after)[0]).toBe("2026-01-15");
  });

  test("done or rested wins over a session under way", () => {
    const sessions = [workout(new Date(2026, 0, 15, 8))];
    expect(planReminders(input({ sessions, sessionActive: true })).dueToday).toBe("no");
  });

  test("a day the journal has never rings again, even ahead of today (a clock moved back)", () => {
    const log = [
      {
        date: "2026-01-16",
        variant: "weak_muscles.0",
        snoozed: false,
        opened: false,
        paused: false,
      },
    ];
    expect(dates(planReminders(input({ state: { resumeDate: null, log } }))).slice(0, 2)).toEqual([
      "2026-01-15",
      "2026-01-17",
    ]);
  });

  test("today's rest is judged at today's hour, so the entry and dueToday agree", () => {
    // Six sessions in seven days, the oldest a week ago at 19:00: at 10:00 that is overtraining,
    // by 20:00 it has fallen out of the window and today rings.
    const days = [7, 5, 4, 2, 1, 1];
    const sessions = days.map((d, i) => workout(new Date(2026, 0, 15 - d, i === 0 ? 19 : 12)));
    const plan = planReminders(input({ sessions }));
    expect(dates(plan)[0]).toBe("2026-01-15");
    expect(plan.dueToday).toBe("yes");
  });

  test("a day already reminded never rings again, whatever the hour says now", () => {
    const log = [
      {
        date: "2026-01-15",
        variant: "weak_muscles.0",
        snoozed: false,
        opened: false,
        paused: false,
      },
    ];
    const moved = planReminders(
      input({ state: { resumeDate: null, log }, days: { thu: "22:00" } }),
    );
    expect(dates(moved)[0]).toBe("2026-01-22");
  });
});

describe("planReminders: the pause", () => {
  test("nothing before the resume date, the resume date itself rings", () => {
    const plan = planReminders(input({ state: { resumeDate: "2026-01-20", log: [] } }));
    expect(dates(plan)[0]).toBe("2026-01-20");
  });

  test("the horizon starts again from the resume date", () => {
    const plan = planReminders(input({ state: { resumeDate: "2026-01-20", log: [] } }));
    expect(plan.entries).toHaveLength(REMINDER_PLAN_DAYS);
    expect(plan.entries.at(-1)?.date).toBe("2026-02-09");
  });

  test("a resume date already past is no pause at all", () => {
    const plan = planReminders(input({ state: { resumeDate: "2026-01-10", log: [] } }));
    expect(dates(plan)[0]).toBe("2026-01-15");
  });
});

describe("planReminders: the words", () => {
  test("the quiet line is handed over for the native side to add to the last one it posts", () => {
    expect(planReminders(input()).quietText).toBe("reminders.quiet");
  });

  test("the Home's offer is what the reminder names", () => {
    const [first] = planReminders(input()).entries;
    expect(first?.title).toBe('reminders.weak_muscles.0 {"quest":"Chest Day","muscles":"chest"}');
  });

  test("in the app's language", () => {
    const [first] = planReminders(input({ language: "fr" })).entries;
    expect(first?.title).toContain('"quest":"Jour des pecs"');
  });

  test("a boss already swung at is named, with what it has left", () => {
    const offer = {
      kind: "adventure",
      adventureId: 4,
      title: "The North Road",
      imagePath: null,
      done: 1,
      total: 5,
      step: 2,
      boss: { name: "The Iron Warden", hp: 340 },
    } as HomeOffer;
    const [first] = planReminders(input({ offer })).entries;
    expect(first?.title).toBe('reminders.boss.0 {"boss":"The Iron Warden","hp":340}');
  });

  test("an adventure whose title would not load only says what needs no title", () => {
    const offer = {
      kind: "adventure",
      adventureId: 4,
      title: null,
      imagePath: null,
      done: 1,
      total: 5,
      step: 2,
      boss: null,
    } as HomeOffer;
    const titles = planReminders(input({ offer })).entries.map((e) => e.variant);
    expect(new Set(titles)).toEqual(new Set(["adventure.2"]));
  });
});

describe("planReminders: every case the Home has", () => {
  const titleFor = (offer: HomeOffer) => planReminders(input({ offer })).entries[0]?.title;

  test("an oath on a ladder: the rung, and the quest that climbs it", () => {
    const offer = {
      kind: "oath_exercise",
      goal: "Pull-up",
      rung: { position: 2, total: 5, name: "Inverted Row" },
      quest,
      startable: true,
      seconds: 900,
    } as unknown as HomeOffer;
    expect(titleFor(offer)).toBe('reminders.oath_exercise.0 {"n":2,"total":5,"quest":"Chest Day"}');
  });

  test("an oath with no ladder only says what needs no rung", () => {
    const offer = {
      kind: "oath_exercise",
      goal: "Pull-up",
      rung: null,
      quest,
      startable: true,
      seconds: 900,
    } as unknown as HomeOffer;
    const variants = planReminders(input({ offer })).entries.map((e) => e.variant);
    expect(new Set(variants)).toEqual(new Set(["oath_exercise.1"]));
  });

  test("an oath in leagues: how far along", () => {
    const offer = {
      kind: "oath_leagues",
      target: 100,
      done: 42,
      quest,
      startable: false,
      seconds: 0,
    } as unknown as HomeOffer;
    expect(titleFor(offer)).toBe('reminders.oath_leagues.0 {"done":42,"total":100}');
  });

  test("day one: the on-ramp quest and its minutes", () => {
    const offer = {
      kind: "first_day",
      quest,
      startable: true,
      seconds: 480,
    } as unknown as HomeOffer;
    expect(titleFor(offer)).toBe('reminders.first_day.0 {"quest":"Chest Day","duration":"8 min"}');
  });

  test("the gallery, when nothing else would load", () => {
    expect(titleFor({ kind: "gallery" })).toBe("reminders.gallery.0 {}");
  });
});

describe("planReminders: the weekly oath", () => {
  const oath = (weeklyTarget: number, fulfilledAt: string | null = null): Oath => ({
    metric: "weekly_sessions",
    target: 8,
    weeklyTarget,
    weekStartsOn: 1,
    exerciseId: null,
    swornAt: "2026-01-01T09:00:00.000Z",
    fulfilledAt,
  });

  /** Monday 12 January 2026 starts the oath's week (weekStartsOn 1). */
  const monday = workout(new Date(2026, 0, 12, 18));

  test("this week, while it can still be kept: how many are left", () => {
    const plan = planReminders(input({ oath: oath(3), sessions: [monday] }));
    expect(plan.entries[0]?.body).toBe('reminders.oath_more {"count":2}');
  });

  test("this week, quota already met: the week is won", () => {
    const sessions = [12, 13, 14].map((d) => workout(new Date(2026, 0, d, 18)));
    const plan = planReminders(input({ oath: oath(3), sessions }));
    expect(plan.entries[0]?.body).toBe("reminders.oath_won");
  });

  test("this week, out of reach: no number", () => {
    // Thursday, nothing logged, seven asked: Thursday to Sunday is four days.
    const plan = planReminders(input({ oath: oath(7) }));
    expect(plan.entries[0]?.body).toBe("");
  });

  test("a week that starts on Sunday: Sunday is a new week, Saturday is its last day", () => {
    const sunday = { ...oath(3), weekStartsOn: 0 as const };
    // Saturday 17 January: last day of a Sunday week, one day left for two sessions.
    const saturday = new Date(2026, 0, 17, 10);
    const late = planReminders(
      input({ now: saturday, oath: sunday, sessions: [workout(new Date(2026, 0, 12, 18))] }),
    );
    expect(late.entries[0]?.body).toBe("");
    // Sunday 18 January opens the next week: its entry is not this week's, so no number.
    expect(late.entries[1]).toMatchObject({ date: "2026-01-18", body: "" });

    // Sunday itself, with nothing logged yet: seven days to find three.
    const plan = planReminders(input({ now: new Date(2026, 0, 18, 10), oath: sunday }));
    expect(plan.entries[0]?.body).toBe('reminders.oath_more {"count":3}');
  });

  test("an oath sworn before weekStartsOn existed counts in the language's week", () => {
    const legacy = { ...oath(3), weekStartsOn: undefined };
    // English weeks start on Sunday: Sunday the 11th and Monday the 12th both count by Thursday.
    const sessions = [workout(new Date(2026, 0, 11, 18)), monday];
    expect(planReminders(input({ oath: legacy, sessions })).entries[0]?.body).toBe(
      'reminders.oath_more {"count":1}',
    );
  });

  test("next week: no number, the count is not known yet", () => {
    const plan = planReminders(input({ oath: oath(3), sessions: [monday] }));
    const nextMonday = plan.entries.find((e) => e.date === "2026-01-19");
    expect(nextMonday?.body).toBe("");
  });

  test("a walk of ten minutes counts toward the oath, as it does for the flame", () => {
    const walk = {
      performedAt: new Date(2026, 0, 13, 8),
      outing: "walk",
      movingSeconds: 900,
      durationSeconds: 900,
    } as ReminderSession;
    const plan = planReminders(input({ oath: oath(3), sessions: [monday, walk] }));
    expect(plan.entries[0]?.body).toBe('reminders.oath_more {"count":1}');
  });

  test("a fulfilled oath, or one that is not weekly, adds nothing", () => {
    expect(planReminders(input({ oath: oath(3, "2026-01-10") })).entries[0]?.body).toBe("");
    const pr = { ...oath(3), metric: "exercise_pr" } as Oath;
    expect(planReminders(input({ oath: pr })).entries[0]?.body).toBe("");
  });
});
