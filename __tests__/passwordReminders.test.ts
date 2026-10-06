import { addDays, format } from "date-fns";

/**
 * The reminder that asks "is the password still in your head?". It exists for the hero whose only
 * copy of their hero is a file on a cloud, sealed with a password they typed once, months ago: the
 * moment to find out it is forgotten is now, while this phone still holds the key and can make a
 * new password, and not on the day of a new phone.
 *
 * What these tests hold is the schedule and its manners: nothing before it was asked for, never in
 * a hurry, a wrong answer is gentler than a right one is harsh, and an update restarts the clock.
 */
const mockPrefs = new Map<string, string>();
let mockEncryption: "on" | "off" | "locked" = "on";
let mockFormat: 2 | 3 | null = 3;

jest.mock("@/db/preferences", () => ({
  getPreference: (key: string) => Promise.resolve(mockPrefs.get(key) ?? null),
  setPreference: (key: string, value: string) =>
    Promise.resolve().then(() => {
      mockPrefs.set(key, value);
    }),
  deletePreference: (key: string) =>
    Promise.resolve().then(() => {
      mockPrefs.delete(key);
    }),
}));
jest.mock("@/src/backupCipher", () => ({
  encryptionStatus: () => Promise.resolve(mockEncryption),
  vaultFormat: () => Promise.resolve(mockFormat),
}));

import {
  answerPasswordCheck,
  passwordCheckDue,
  passwordRemindersOn,
  restartPasswordChecks,
  setPasswordReminders,
} from "@/src/passwordReminders";

const day = (offset: number, from = new Date(2026, 9, 4)) => addDays(from, offset);
const TODAY = new Date(2026, 9, 4);
const key = (date: Date) => format(date, "yyyy-MM-dd");

beforeEach(() => {
  mockPrefs.clear();
  mockEncryption = "on";
  mockFormat = 3;
});

describe("turning it on", () => {
  test("is off until the hero says yes, and never due", async () => {
    expect(await passwordRemindersOn()).toBe(false);
    expect(await passwordCheckDue(day(1000))).toBe(false);
  });

  test("the first question comes three days later, not now", async () => {
    await setPasswordReminders(true, TODAY);

    expect(await passwordRemindersOn()).toBe(true);
    expect(await passwordCheckDue(TODAY)).toBe(false);
    expect(await passwordCheckDue(day(2))).toBe(false);
    expect(await passwordCheckDue(day(3))).toBe(true);
  });

  test("saying no turns it off and forgets the schedule", async () => {
    await setPasswordReminders(true, TODAY);
    await setPasswordReminders(false, TODAY);

    expect(await passwordRemindersOn()).toBe(false);
    expect(await passwordCheckDue(day(500))).toBe(false);
    expect([...mockPrefs.keys()].filter((k) => k.startsWith("passwordCheck"))).toEqual([]);
  });

  test("turning it on twice does not restart the clock", async () => {
    await setPasswordReminders(true, TODAY);
    await setPasswordReminders(true, day(2));

    expect(await passwordCheckDue(day(3))).toBe(true);
  });
});

describe("the schedule", () => {
  /** Answers "right" on the day it is due, and returns how many days that took. */
  async function rightAnswers(count: number) {
    const gaps: number[] = [];
    let now = TODAY;
    for (let i = 0; i < count; i++) {
      let waited = 0;
      while (!(await passwordCheckDue(now))) {
        now = day(1, now);
        waited++;
      }
      await answerPasswordCheck("right", now);
      gaps.push(waited);
    }
    return gaps;
  }

  test("3 days, 2 weeks, a month, 3 months, then every 3 months", async () => {
    await setPasswordReminders(true, TODAY);

    expect(await rightAnswers(6)).toEqual([3, 14, 30, 90, 90, 90]);
  });

  test("a wrong answer goes back a step, and never below the first", async () => {
    await setPasswordReminders(true, TODAY);
    await rightAnswers(3); // now waiting 90 days
    const now = day(500);
    await answerPasswordCheck("wrong", now);

    // A step back from 90 is 30.
    expect(await passwordCheckDue(day(29, now))).toBe(false);
    expect(await passwordCheckDue(day(30, now))).toBe(true);

    await answerPasswordCheck("wrong", day(30, now));
    await answerPasswordCheck("wrong", day(30 + 14, now));
    await answerPasswordCheck("wrong", day(30 + 14 + 3, now));
    // At the bottom: three days, however many times it goes wrong.
    expect(await passwordCheckDue(day(30 + 14 + 3 + 3, now))).toBe(true);
  });

  test("closing it for later twice moves to the next step, once does not", async () => {
    await setPasswordReminders(true, TODAY);
    const due = day(3);

    await answerPasswordCheck("ignored", due);
    // Once: it comes back at the same step.
    expect(await passwordCheckDue(day(3 + 2, TODAY))).toBe(false);
    expect(await passwordCheckDue(day(3 + 3, TODAY))).toBe(true);

    await answerPasswordCheck("ignored", day(6));
    // Twice: the next step, which is 14 days.
    expect(await passwordCheckDue(day(6 + 13, TODAY))).toBe(false);
    expect(await passwordCheckDue(day(6 + 14, TODAY))).toBe(true);
  });

  test("a right answer clears what was ignored before it", async () => {
    await setPasswordReminders(true, TODAY);
    await answerPasswordCheck("ignored", day(3));
    await answerPasswordCheck("right", day(6)); // step 2: 14 days
    await answerPasswordCheck("ignored", day(20));

    // One ignore after a right answer is the first again, not the second: still the same step.
    expect(await passwordCheckDue(day(20 + 14, TODAY))).toBe(true);
    expect(await passwordCheckDue(day(20 + 13, TODAY))).toBe(false);
  });

  test("answers are ignored while it is off", async () => {
    await answerPasswordCheck("right", TODAY);

    expect(await passwordRemindersOn()).toBe(false);
    expect(mockPrefs.size).toBe(0);
  });
});

describe("when it may speak", () => {
  test("only about a vault this build made, with this phone holding its key", async () => {
    await setPasswordReminders(true, TODAY);

    mockEncryption = "locked";
    expect(await passwordCheckDue(day(10))).toBe(false);
    mockEncryption = "off";
    expect(await passwordCheckDue(day(10))).toBe(false);
    mockEncryption = "on";
    mockFormat = 2;
    expect(await passwordCheckDue(day(10))).toBe(false);
    mockFormat = 3;
    expect(await passwordCheckDue(day(10))).toBe(true);
  });
});

describe("a new vault or a new password", () => {
  test("starts the clock again at three days, because a fresh password is the one to practise", async () => {
    await setPasswordReminders(true, TODAY);
    for (let i = 0; i < 3; i++) await answerPasswordCheck("right", day(i * 100));
    // Now far along: 90 days between questions.

    await restartPasswordChecks(day(400));

    expect(await passwordCheckDue(day(402))).toBe(false);
    expect(await passwordCheckDue(day(403))).toBe(true);
  });

  test("does nothing for a hero who said no", async () => {
    await restartPasswordChecks(TODAY);

    expect(await passwordRemindersOn()).toBe(false);
    expect(mockPrefs.size).toBe(0);
  });

  test("the due day is a plain day key, so a restore cannot make it a moment in another zone", async () => {
    await setPasswordReminders(true, TODAY);

    expect(mockPrefs.get("passwordCheckDue")).toBe(key(day(3)));
  });
});
