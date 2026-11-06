import {
  clampGoal,
  type DuoWeekInput,
  duoWeek,
  isoWeekOf,
  previousWeek,
  weekEnd,
  weekStart,
} from "../src/multiplayer/duoWeek";
import type { WeekState } from "../src/multiplayer/envelope";

/**
 * The week of a duo, rule by rule: the numbers are those of docs/designs/multiplayer/LOT1-SPEC.md § 1.
 * Week 45 of 2026 runs from Monday 2 to Sunday 8 November, on the clock of whoever runs the suite
 * (Paris and UTC both, as the gate asks).
 */
const W45 = { isoYear: 2026, isoWeek: 45 };
const at = (day: number, hour = 12) => new Date(2026, 10, day, hour);
const stampOf = (date: Date) => Math.floor(date.getTime() / 1000);

const theirs = (over: Partial<WeekState> = {}): WeekState => ({
  stamp: stampOf(at(4)),
  goal: 2,
  paused: false,
  days: [1, 0, 1, 0, 0, 0, 0],
  ...over,
});

const input = (over: Partial<DuoWeekInput> = {}): DuoWeekInput => ({
  week: W45,
  myDays: [true, false, true, false, false, false, false],
  myGoal: 2,
  myPaused: false,
  theirs: theirs(),
  fallenAt: null,
  now: at(5),
  ...over,
});

const lone = [true, false, false, false, false, false, false];

describe("the calendar", () => {
  test("an ISO week starts on its local Monday and ends on the next", () => {
    expect(weekStart(W45)).toEqual(new Date(2026, 10, 2));
    expect(weekEnd(W45)).toEqual(new Date(2026, 10, 9));
    expect(isoWeekOf(at(8, 23))).toEqual(W45);
    expect(isoWeekOf(at(9, 0))).toEqual({ isoYear: 2026, isoWeek: 46 });
  });

  test("the week before the first of a year belongs to the year before", () => {
    expect(previousWeek({ isoYear: 2027, isoWeek: 1 })).toEqual({ isoYear: 2026, isoWeek: 53 });
  });
});

describe("S1, the boss falls when both keep their week", () => {
  test("both goals met: fallen, even mid-week", () => {
    expect(duoWeek(input()).result).toBe("fallen");
  });

  test("one goal short: still in progress, and nothing says whose", () => {
    const week = duoWeek(input({ myDays: lone }));
    expect(week.result).toBe("inProgress");
    expect(week.mine).toEqual({ hits: 1, goal: 2 });
    expect(week.theirs?.hits).toBe(2);
  });

  test("no envelope from them yet: never fallen", () => {
    expect(duoWeek(input({ theirs: null })).result).toBe("inProgress");
  });
});

describe("S2 and S3, a fall is for good, a flight is not", () => {
  test("a week noted fallen stays fallen against any later envelope", () => {
    const later = theirs({ stamp: stampOf(at(12)), days: [0, 0, 0, 0, 0, 0, 0] });
    expect(duoWeek(input({ theirs: later, fallenAt: at(6), now: at(20) })).result).toBe("fallen");
  });

  test("a fled week turns into a win when a late envelope shows both goals kept", () => {
    const late = { now: at(20), myDays: lone, myGoal: 1 };
    const short = theirs({ stamp: stampOf(at(10)), days: [1, 0, 0, 0, 0, 0, 0] });
    // myGoal 1 is read as 2 (O1), so the hero's single hit is not enough either: fled.
    expect(duoWeek(input({ ...late, theirs: short })).result).toBe("fled");
    const mine = [true, true, false, false, false, false, false];
    expect(duoWeek(input({ ...late, myDays: mine, theirs: theirs() })).result).toBe("fallen");
  });
});

describe("waiting, then fled", () => {
  const short = { myDays: lone };

  test("a finished week waits for their last word", () => {
    expect(duoWeek(input({ ...short, now: at(10) })).result).toBe("waiting");
  });

  test("their envelope written well after the end settles it: fled", () => {
    const after = theirs({ stamp: stampOf(at(10)) });
    expect(duoWeek(input({ ...short, theirs: after, now: at(10, 13) })).result).toBe("fled");
  });

  test("an envelope from their Sunday evening is not their last word, whatever our Monday says", () => {
    const sunday = theirs({ stamp: stampOf(new Date(2026, 10, 9, 8)) });
    expect(duoWeek(input({ ...short, theirs: sunday, now: at(9, 9) })).result).toBe("waiting");
  });

  test("seven days on, with nothing more, the boss has fled", () => {
    expect(duoWeek(input({ ...short, now: at(16, 1) })).result).toBe("fled");
  });

  test("nothing at all from them, a week on: fled", () => {
    expect(duoWeek(input({ theirs: null, now: at(17) })).result).toBe("fled");
  });
});

describe("S5 and S10, a pause freezes the week for both", () => {
  test("my pause freezes it, before and after its end", () => {
    expect(duoWeek(input({ myDays: lone, myPaused: true })).result).toBe("frozen");
    expect(duoWeek(input({ myDays: lone, myPaused: true, now: at(20) })).result).toBe("frozen");
  });

  test("their pause, with no hit at all, freezes it too", () => {
    const paused = theirs({ paused: true, days: [0, 0, 0, 0, 0, 0, 0] });
    expect(duoWeek(input({ theirs: paused, now: at(20) })).result).toBe("frozen");
  });

  test("a week both kept is a win even through a pause", () => {
    expect(duoWeek(input({ myPaused: true })).result).toBe("fallen");
  });
});

describe("O1 and O2, goals between the oath's bounds", () => {
  test("clamped to 2 and 4", () => {
    expect([0, 1, 2, 3, 4, 9].map(clampGoal)).toEqual([2, 2, 2, 3, 4, 4]);
  });

  test("an envelope with a goal of 1 does not fell a boss on one hit", () => {
    const one = theirs({ goal: 1, days: [1, 0, 0, 0, 0, 0, 0] });
    const week = duoWeek(input({ theirs: one }));
    expect(week.theirs?.goal).toBe(2);
    expect(week.result).toBe("inProgress");
  });
});

describe("F2 and F4, what counts as their hit", () => {
  test("several sessions on one day are one hit", () => {
    const busy = theirs({ days: [3, 0, 0, 0, 0, 0, 0] });
    expect(duoWeek(input({ theirs: busy })).theirs?.hits).toBe(1);
  });

  test("their days after tomorrow, on this clock, are not hits yet", () => {
    const ahead = theirs({ days: [0, 0, 0, 0, 1, 1, 1] });
    // Thursday noon: Friday is tomorrow and counts, Saturday and Sunday do not.
    expect(duoWeek(input({ theirs: ahead, now: at(5) })).theirs?.hits).toBe(1);
  });
});
