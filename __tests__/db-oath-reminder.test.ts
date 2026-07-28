import { nextOathReminder, OATH_REMINDER_IDLE_DAYS } from "@/db/oathReminder";

const TIME = { hour: 18, minute: 0 };

describe("nextOathReminder", () => {
  it("fires at the chosen hour, three idle days after the last session", () => {
    const last = new Date("2026-03-01T09:30:00");
    const now = new Date("2026-03-01T10:00:00");

    const due = nextOathReminder(last, TIME, now);

    expect(due.getDate()).toBe(1 + OATH_REMINDER_IDLE_DAYS);
    expect(due.getHours()).toBe(18);
    expect(due.getMinutes()).toBe(0);
  });

  it("rolls to today's hour when the idle deadline is already behind us", () => {
    // Idle for a week, opening the app in the morning: the nudge belongs to tonight.
    const due = nextOathReminder(
      new Date("2026-03-01T09:00:00"),
      TIME,
      new Date("2026-03-08T09:00:00"),
    );

    expect(due.getDate()).toBe(8);
    expect(due.getHours()).toBe(18);
  });

  it("rolls to tomorrow when the chosen hour has passed today", () => {
    const due = nextOathReminder(
      new Date("2026-03-01T09:00:00"),
      TIME,
      new Date("2026-03-08T21:00:00"),
    );

    expect(due.getDate()).toBe(9);
    expect(due.getHours()).toBe(18);
  });

  it("keeps the wall-clock hour across a DST jump", () => {
    // Europe/Paris springs forward on 2026-03-29; a naive +3 days in ms would land at 19:00.
    const due = nextOathReminder(
      new Date("2026-03-27T09:00:00"),
      TIME,
      new Date("2026-03-27T10:00:00"),
    );

    expect(due.getDate()).toBe(30);
    expect(due.getHours()).toBe(18);
  });
});
