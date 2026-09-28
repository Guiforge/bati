/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import type { HomeOffer } from "@/db/homeOffer";
import {
  describeDay,
  missedReminder,
  type PlanInput,
  type ReminderLogEntry,
  type ReminderSession,
  reminderStats,
} from "@/db/reminders";

// Pure: nothing here touches the database, but the module that holds it does at import.
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

/**
 * What Settings says about the reminders, and what a bug report carries: the preview always says
 * why (docs/designs/rappels.md, "L'aperçu dit toujours pourquoi"), and a reminder the phone killed
 * is the one thing only the journal can show.
 */
const workout = (at: Date): ReminderSession => ({
  performedAt: at,
  outing: null,
  movingSeconds: null,
  durationSeconds: 1800,
});

const posted = (date: string, over: Partial<ReminderLogEntry> = {}): ReminderLogEntry => ({
  date,
  variant: "gallery.0",
  snoozed: false,
  opened: false,
  paused: false,
  postedAt: "20:03",
  ...over,
});

/** Thursday 15 January 2026, 10:00. */
const thursday = new Date(2026, 0, 15, 10, 0);
const everyDay = {
  mon: "20:00",
  tue: "20:00",
  wed: "20:00",
  thu: "20:00",
  fri: "20:00",
  sat: "20:00",
  sun: "20:00",
};

const input = (over: Partial<PlanInput> = {}): PlanInput => ({
  days: everyDay,
  now: thursday,
  sessions: [],
  sessionActive: false,
  state: { resumeDate: null, log: [] },
  offer: { kind: "gallery" } as HomeOffer,
  oath: null,
  language: "en",
  t: (key) => key,
  ...over,
});

describe("describeDay", () => {
  test("nothing to say on an ordinary day", () => {
    expect(describeDay(input())).toEqual({ today: null, restTomorrow: false });
  });

  test("today skipped, session done", () => {
    const sessions = [workout(new Date(2026, 0, 15, 8))];
    expect(describeDay(input({ sessions })).today).toBe("done");
  });

  test("today and tomorrow both rest after a hard week", () => {
    const sessions = [1, 1, 2, 3, 4, 5].map((d) => workout(new Date(2026, 0, 15 - d, 12)));
    expect(describeDay(input({ sessions }))).toEqual({ today: "rest", restTomorrow: true });
  });

  test("a day that already rang has nothing left to explain", () => {
    const sessions = [workout(new Date(2026, 0, 15, 8))];
    const log = [
      {
        date: "2026-01-15",
        variant: "gallery.0",
        snoozed: false,
        opened: false,
        paused: false,
        postedAt: "07:00",
      },
    ];
    expect(describeDay(input({ sessions, state: { resumeDate: null, log } })).today).toBeNull();
  });

  test("a day that is not one of the hero's has nothing to explain", () => {
    const sessions = [workout(new Date(2026, 0, 15, 8))];
    expect(describeDay(input({ sessions, days: { mon: "20:00" } }))).toEqual({
      today: null,
      restTomorrow: false,
    });
  });
});

describe("missedReminder", () => {
  const monOnly = { mon: "20:00" };
  // Tuesday 13 January 2026, noon: Monday the 12th was the last of the hero's days.
  const tuesday = new Date(2026, 0, 13, 12);

  test("Monday should have rung and the journal does not have it", () => {
    expect(missedReminder(monOnly, [], [], tuesday, null, null, null)).toBe("2026-01-12");
  });

  test("it rang: nothing to say", () => {
    expect(
      missedReminder(monOnly, [posted("2026-01-12")], [], tuesday, null, null, null),
    ).toBeNull();
  });

  test("a day that never rang on purpose is not a phone's fault", () => {
    const trained = [workout(new Date(2026, 0, 12, 18))];
    expect(missedReminder(monOnly, [], trained, tuesday, null, null, null)).toBeNull();
  });

  test("before the switch was on, or during a pause, it was never due", () => {
    expect(missedReminder(monOnly, [], [], tuesday, "2026-01-12", null, null)).toBeNull();
    expect(missedReminder(monOnly, [], [], tuesday, null, "2026-01-19", null)).toBeNull();
  });

  test("past the horizon of the last plan, the phone went quiet on purpose", () => {
    // Planned on 1 December: its fourteen days ended long before Monday the 12th.
    expect(missedReminder(monOnly, [], [], tuesday, null, null, "2025-12-01")).toBeNull();
    expect(missedReminder(monOnly, [], [], tuesday, null, null, "2026-01-05")).toBe("2026-01-12");
  });

  test("today's hour is not missed until its hour is well past", () => {
    const today = { tue: "11:30" };
    expect(missedReminder(today, [], [], tuesday, null, null, null)).toBeNull();
    const later = new Date(2026, 0, 13, 13);
    expect(missedReminder(today, [], [], later, null, null, null)).toBe("2026-01-13");
  });
});

describe("reminderStats", () => {
  test("counts what rang, what was followed within two hours, snoozed and paused", () => {
    const log = [
      posted("2026-01-12"),
      posted("2026-01-13", { snoozed: true }),
      posted("2026-01-14", { paused: true }),
      posted("2026-01-15", { postedAt: null }),
    ];
    const sessions = [
      workout(new Date(2026, 0, 12, 21, 30)), // followed
      workout(new Date(2026, 0, 13, 23, 0)), // three hours on: not followed
      { ...workout(new Date(2026, 0, 14, 20, 30)), outing: "walk" }, // a walk is not a workout
    ];
    expect(reminderStats(log, sessions)).toEqual({ posted: 4, followed: 1, snoozed: 1, paused: 1 });
  });
});
