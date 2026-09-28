/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import {
  DEFAULT_REMINDER_TIME,
  ignoredStreak,
  nextVariant,
  parseReminderDays,
  type ReminderLogEntry,
  type ReminderSession,
  shouldAskAboutReminders,
  suggestDays,
  suggestTime,
  VARIANT_COUNTS,
} from "@/db/reminders";
import { isSessionHeld } from "@/stores/sessionHold";

// Pure: nothing here touches the database, but the module that holds it does at import.
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

const workout = (at: Date): ReminderSession => ({
  performedAt: at,
  outing: null,
  movingSeconds: null,
  durationSeconds: 1800,
});

const posted = (date: string, over: Partial<ReminderLogEntry> = {}): ReminderLogEntry => ({
  date,
  variant: "weak_muscles.0",
  snoozed: false,
  opened: false,
  paused: false,
  ...over,
});

describe("nextVariant: two reminders in a row never say the same thing", () => {
  test("walks every sentence of the case, then starts over", () => {
    const seen: string[] = [];
    let previous: string | null = null;
    for (let i = 0; i < 7; i++) {
      previous = `adventure.${nextVariant("adventure", previous)}`;
      seen.push(previous);
    }
    expect(seen).toEqual([
      "adventure.0",
      "adventure.1",
      "adventure.2",
      "adventure.0",
      "adventure.1",
      "adventure.2",
      "adventure.0",
    ]);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });

  test("picks up after the last one posted, which the native journal remembers", () => {
    expect(nextVariant("weak_muscles", "weak_muscles.0")).toBe(1);
    expect(nextVariant("weak_muscles", "weak_muscles.1")).toBe(0);
  });

  test("a sentence from another case says nothing about this one", () => {
    expect(nextVariant("boss", "adventure.2")).toBe(0);
    expect(nextVariant("boss", null)).toBe(0);
  });

  test("every case has more than one sentence, so none repeats back to back", () => {
    for (const count of Object.values(VARIANT_COUNTS)) expect(count).toBeGreaterThanOrEqual(2);
  });

  test("stays inside the sentences the case can say", () => {
    expect(nextVariant("adventure", "adventure.0", [2])).toBe(2);
    expect(nextVariant("adventure", "adventure.2", [2])).toBe(2);
  });
});

describe("ignoredStreak", () => {
  const today = "2026-01-20";

  test("three posted days nobody answered", () => {
    const log = ["2026-01-17", "2026-01-18", "2026-01-19"].map((d) => posted(d));
    expect(ignoredStreak(log, [], today, null)).toBe(3);
  });

  test("today never counts: it is not over", () => {
    const log = ["2026-01-18", "2026-01-19", "2026-01-20"].map((d) => posted(d));
    expect(ignoredStreak(log, [], today, null)).toBe(2);
  });

  test("a tap answers the reminder: the run starts again after it", () => {
    const log = [
      posted("2026-01-16"),
      posted("2026-01-17", { opened: true }),
      posted("2026-01-18"),
    ];
    expect(ignoredStreak(log, [], today, null)).toBe(1);
  });

  test("a workout starts the run again, on a reminder day or not", () => {
    const log = ["2026-01-15", "2026-01-16", "2026-01-17", "2026-01-18"].map((d) => posted(d));
    expect(ignoredStreak(log, [workout(new Date(2026, 0, 17, 21))], today, null)).toBe(1);
  });

  test("a workout on a chosen day that never rang, because it was done first, counts too", () => {
    // Monday ignored, Wednesday trained at 18:00 so nothing was posted, Friday and Monday ignored.
    const log = ["2026-01-12", "2026-01-16", "2026-01-19"].map((d) => posted(d));
    expect(ignoredStreak(log, [workout(new Date(2026, 0, 14, 18))], today, null)).toBe(2);
  });

  test("a walk does not: the reminder asked for a workout", () => {
    const log = ["2026-01-17", "2026-01-18", "2026-01-19"].map((d) => posted(d));
    const walk = { ...workout(new Date(2026, 0, 18, 9)), outing: "walk" };
    expect(ignoredStreak(log, [walk], today, null)).toBe(3);
  });

  test("a workout today does not reach back: today is not over", () => {
    const log = ["2026-01-17", "2026-01-18", "2026-01-19"].map((d) => posted(d));
    expect(ignoredStreak(log, [workout(new Date(2026, 0, 20, 8))], today, null)).toBe(3);
  });

  test("a snoozed day rang twice and counts once", () => {
    const log = [posted("2026-01-18", { snoozed: true }), posted("2026-01-19")];
    expect(ignoredStreak(log, [], today, null)).toBe(2);
  });

  test("a pause answers the reminder too: nothing before it counts", () => {
    const log = [
      posted("2026-01-17"),
      posted("2026-01-18", { paused: true }),
      posted("2026-01-19"),
    ];
    expect(ignoredStreak(log, [], today, null)).toBe(1);
  });

  test("a settings change starts the run again: only the days after it count", () => {
    const log = ["2026-01-16", "2026-01-17", "2026-01-18", "2026-01-19"].map((d) => posted(d));
    expect(ignoredStreak(log, [], today, "2026-01-17")).toBe(2);
  });
});

describe("shouldAskAboutReminders", () => {
  test("from the third ignored day", () => {
    expect(shouldAskAboutReminders(2, null, "2026-01-20")).toBe(false);
    expect(shouldAskAboutReminders(3, null, "2026-01-20")).toBe(true);
  });

  test("at most once every thirty days", () => {
    expect(shouldAskAboutReminders(5, "2025-12-22", "2026-01-20")).toBe(false);
    expect(shouldAskAboutReminders(5, "2025-12-21", "2026-01-20")).toBe(true);
  });
});

describe("suggestDays", () => {
  const now = new Date(2026, 0, 31, 12);

  test("the weekdays trained on at least twice in four weeks", () => {
    const sessions = [
      new Date(2026, 0, 5, 18), // Monday
      new Date(2026, 0, 12, 18), // Monday
      new Date(2026, 0, 8, 18), // Thursday
      new Date(2026, 0, 29, 18), // Thursday
      new Date(2026, 0, 10, 10), // Saturday, once
    ].map(workout);
    expect(suggestDays(sessions, now, null)).toEqual(["mon", "thu"]);
  });

  test("two sessions on the same day are one day", () => {
    const sessions = [new Date(2026, 0, 5, 8), new Date(2026, 0, 5, 19)].map(workout);
    expect(suggestDays(sessions, now, null)).toEqual(["mon", "wed", "fri"]);
  });

  test("older than four weeks does not count", () => {
    const sessions = [new Date(2025, 11, 1, 18), new Date(2025, 11, 8, 18)].map(workout);
    expect(suggestDays(sessions, now, null)).toEqual(["mon", "wed", "fri"]);
  });

  test("without history, the weekly oath's count, spread over the week", () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((q) => suggestDays([], now, q))).toEqual([
      ["wed"],
      ["tue", "thu"],
      ["mon", "wed", "fri"],
      ["mon", "tue", "thu", "fri"],
      ["mon", "tue", "wed", "thu", "fri"],
      ["mon", "tue", "wed", "thu", "fri", "sat"],
      ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    ]);
  });
});

describe("suggestTime", () => {
  const at = (h: number, m: number, day = 10) => workout(new Date(2026, 0, day, h, m));

  test("nothing to go on: 18:00", () => {
    expect(suggestTime([])).toBe(DEFAULT_REMINDER_TIME);
    expect(DEFAULT_REMINDER_TIME).toBe("18:00");
  });

  test("half an hour before the habit, on the quarter", () => {
    expect(suggestTime([at(19, 0, 1), at(19, 10, 2), at(20, 0, 3)])).toBe("18:45");
  });

  test("23:30 and 00:30 make midnight, not noon", () => {
    expect(suggestTime([at(23, 30, 1), at(0, 30, 3)])).toBe("23:30");
  });

  test("only the last ten workouts, and never a walk", () => {
    const old = Array.from({ length: 10 }, (_, i) => at(7, 0, i + 1));
    const recent = Array.from({ length: 10 }, (_, i) => at(21, 0, i + 15));
    const walk = { ...at(6, 0, 30), outing: "walk" };
    expect(suggestTime([...old, ...recent, walk])).toBe("20:30");
  });
});

describe("parseReminderDays", () => {
  test("keeps the well-formed days", () => {
    expect(parseReminderDays('{"mon":"20:00","thu":"07:15"}')).toEqual({
      mon: "20:00",
      thu: "07:15",
    });
  });

  test("drops what would ring at an impossible hour, or on no day", () => {
    expect(parseReminderDays('{"mon":"24:00","xyz":"20:00","fri":8}')).toEqual({});
  });

  test("nothing stored, or garbage, is no day chosen", () => {
    expect(parseReminderDays(null)).toEqual({});
    expect(parseReminderDays("not json")).toEqual({});
    expect(parseReminderDays("[]")).toEqual({});
  });
});

describe("the sentences in every language", () => {
  // `reminders.<case>.<n>` is built at run time, so the literal-key check in i18n-keys.test.ts
  // cannot see it: this is what holds the counts above and the four files to one another.
  const locales = {
    en: require("@/locales/en.json"),
    fr: require("@/locales/fr.json"),
    de: require("@/locales/de.json"),
    es: require("@/locales/es.json"),
  } as Record<string, { reminders: Record<string, Record<string, string>> }>;

  test.each(Object.keys(locales))("%s has exactly the sentences the plan can pick", (lang) => {
    const block = locales[lang]?.reminders ?? {};
    for (const [sentenceCase, count] of Object.entries(VARIANT_COUNTS)) {
      expect(Object.keys(block[sentenceCase] ?? {})).toEqual(
        Array.from({ length: count }, (_, i) => String(i)),
      );
    }
  });
});

describe("every sentence renders whole", () => {
  const { i18n } = require("@/i18n") as typeof import("@/i18n");
  const params = {
    n: 2,
    total: 5,
    adventure: "A",
    boss: "B",
    hp: 340,
    quest: "Q",
    muscles: "M",
    done: 3,
    duration: "8 min",
    count: 2,
  };

  test.each(["en", "fr", "de", "es"])("%s: no placeholder left unfilled", async (lang) => {
    await i18n.changeLanguage(lang);
    const keys = [
      ...Object.entries(VARIANT_COUNTS).flatMap(([c, n]) =>
        Array.from({ length: n }, (_, i) => `reminders.${c}.${i}`),
      ),
      "reminders.quiet",
      "reminders.oath_more",
      "reminders.oath_won",
    ];
    for (const key of keys) {
      const text = i18n.t(key, params);
      expect(text).not.toBe(key);
      expect(text).not.toMatch(/{{|}}/);
    }
  });
});

describe("isSessionHeld", () => {
  test("a session on screen holds today, idle does not", () => {
    for (const status of ["warmup", "countdown", "running", "resting", "paused"] as const) {
      expect(isSessionHeld(status, null)).toBe(true);
    }
    expect(isSessionHeld("idle", null)).toBe(false);
  });

  test("a victory holds until it is saved, and not after", () => {
    expect(isSessionHeld("finished", null)).toBe(true);
    expect(isSessionHeld("finished", 42)).toBe(false);
  });
});
