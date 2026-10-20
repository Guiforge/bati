import {
  dayChoices,
  dayFromLink,
  endOn,
  openingDay,
  parseDistanceM,
  parseMinutes,
  proposedEnd,
  settleDay,
  toastKey,
} from "@/components/journal/pastSessionForm";
import { dayKey } from "@/db/dates";
import { checkHandEntry, type MeasuredSpan } from "@/db/handEntryRules";

const NOW = new Date(2026, 9, 18, 20, 3, 40); // Sunday 18 October 2026, 20:03

const span = (h1: number, m1: number, h2: number, m2: number): MeasuredSpan => ({
  id: 1,
  startedAt: new Date(2026, 9, 18, h1, m1),
  endedAt: new Date(2026, 9, 18, h2, m2),
  questId: 1,
  outing: null,
});

describe("the days the sheet offers", () => {
  test("today and the seven before it, newest first", () => {
    const days = dayChoices(NOW).map(dayKey);
    expect(days).toHaveLength(8);
    expect(days[0]).toBe("2026-10-18");
    expect(days[7]).toBe("2026-10-11");
  });

  test("a link's day is read strictly, and anything off the list is today", () => {
    expect(dayKey(dayFromLink("2026-10-16", NOW))).toBe("2026-10-16");
    expect(dayKey(dayFromLink("2026-10-10", NOW))).toBe("2026-10-18"); // eight days back
    expect(dayKey(dayFromLink("2026-10-19", NOW))).toBe("2026-10-18"); // tomorrow
    expect(dayKey(dayFromLink("2026-02-31", NOW))).toBe("2026-10-18"); // rolled over
    expect(dayKey(dayFromLink("16/10/2026", NOW))).toBe("2026-10-18");
    expect(dayKey(dayFromLink("2026-10-16 ; drop table", NOW))).toBe("2026-10-18");
    expect(dayKey(dayFromLink(undefined, NOW))).toBe("2026-10-18");
  });
});

describe("the end proposed never opens the sheet on a refusal", () => {
  test("today: now rounded down to five minutes", () => {
    const end = proposedEnd(NOW, NOW, 45 * 60, []);
    expect([end.getHours(), end.getMinutes()]).toEqual([20, 0]);
  });

  test("today: moved back before a measured session it would overlap", () => {
    const measured = [span(19, 30, 20, 0)];
    const end = proposedEnd(NOW, NOW, 45 * 60, measured);
    expect([end.getHours(), end.getMinutes()]).toEqual([19, 30]);
    expect(
      checkHandEntry(
        { kind: "workout", endedAt: end, durationSeconds: 45 * 60, distanceM: null },
        { handDays: new Set(), measured },
        NOW,
      ),
    ).toBeNull();
  });

  test("just after midnight it stays on the chosen day, never the evening before", () => {
    const now = new Date(2026, 9, 19, 0, 7);
    const at = (d: number, h: number, min: number) => new Date(2026, 9, d, h, min);
    const m = (startedAt: Date, endedAt: Date): MeasuredSpan => ({
      ...span(0, 0, 0, 0),
      startedAt,
      endedAt,
    });
    const end = proposedEnd(now, now, 45 * 60, [
      m(at(19, 0, 1), at(19, 0, 4)),
      m(at(18, 23, 53), at(19, 0, 0)),
    ]);
    expect(dayKey(end)).toBe("2026-10-19");
  });

  test("two sessions in a row push it back past both", () => {
    const measured = [span(19, 30, 20, 0), span(18, 50, 19, 30)];
    const end = proposedEnd(NOW, NOW, 20 * 60, measured);
    expect([end.getHours(), end.getMinutes()]).toEqual([18, 50]);
  });

  test("another day: 18:00, or the reminder's hour", () => {
    const yesterday = new Date(2026, 9, 17);
    expect(proposedEnd(yesterday, NOW, 1800, []).getHours()).toBe(18);
    const withReminder = proposedEnd(yesterday, NOW, 1800, [], { hours: 7, minutes: 15 });
    expect([withReminder.getHours(), withReminder.getMinutes()]).toEqual([7, 15]);
  });

  test("never later than now", () => {
    const early = new Date(2026, 9, 18, 9, 0);
    expect(proposedEnd(early, early, 1800, [], { hours: 18, minutes: 0 }).getHours()).toBe(9);
  });
});

describe("typed fields", () => {
  test("a time of day lands on the chosen day", () => {
    const end = endOn(new Date(2026, 9, 16, 3, 3), { hours: 19, minutes: 30 });
    expect([end.getDate(), end.getHours(), end.getMinutes()]).toEqual([16, 19, 30]);
  });

  test("minutes: whole, comma or point, and nothing else", () => {
    expect(parseMinutes("35")).toBe(2100);
    expect(parseMinutes("12,5")).toBe(750);
    expect(parseMinutes("")).toBeNull();
    expect(parseMinutes("abc")).toBeNull();
    expect(parseMinutes("0")).toBeNull();
  });

  test("a distance in the hero's unit becomes metres, comma accepted", () => {
    expect(parseDistanceM("3,8", 1000)).toBe(3800);
    expect(parseDistanceM("2", 1609.344)).toBe(3219);
    expect(parseDistanceM("", 1000)).toBeNull();
    expect(parseDistanceM("-4", 1000)).toBeNull();
  });
});

describe("the toast", () => {
  test("says the oath first, then the flame, else only that it is noted", () => {
    expect(toastKey({ oathKept: true, flameActive: true })).toBe("toast_oath");
    expect(toastKey({ oathKept: false, flameActive: true })).toBe("toast_flame");
    expect(toastKey({ oathKept: false, flameActive: false })).toBe("toast_noted");
  });
});

describe("the day the sheet opens on is the day the entry is filed under", () => {
  const filed = (end: Date, seconds: number) => dayKey(new Date(end.getTime() - seconds * 1000));

  test("00:28, 45 min: proposed day equals saved day", () => {
    const now = new Date(2026, 9, 19, 0, 28);
    const { day, end } = openingDay(now, new Set(), 45 * 60, []);
    expect(dayKey(day)).toBe(filed(end, 45 * 60));
    expect(
      checkHandEntry(
        { kind: "workout", endedAt: end, durationSeconds: 45 * 60, distanceM: null },
        { handDays: new Set(), measured: [] },
        now,
      ),
    ).toBeNull();
  });

  test("00:37 with the 18th taken: never opens on a refusal", () => {
    const now = new Date(2026, 9, 19, 0, 37);
    const handDays = new Set(["2026-10-18"]);
    const { day, end } = openingDay(now, handDays, 45 * 60, []);
    expect(handDays.has(filed(end, 45 * 60))).toBe(false);
    expect(dayKey(day)).toBe(filed(end, 45 * 60));
  });

  test("a hand-picked today at 00:20 settles on the day the entry is filed under", () => {
    const now = new Date(2026, 9, 19, 0, 20);
    const { day, end } = settleDay(new Date(2026, 9, 19), now, 45 * 60, []);
    expect(dayKey(day)).toBe("2026-10-18");
    expect(dayKey(day)).toBe(filed(end, 45 * 60));
  });

  test("a picked day that already holds its start stays as picked", () => {
    const now = new Date(2026, 9, 19, 14, 0);
    expect(dayKey(settleDay(new Date(2026, 9, 19), now, 45 * 60, []).day)).toBe("2026-10-19");
    expect(dayKey(settleDay(new Date(2026, 9, 16), now, 45 * 60, []).day)).toBe("2026-10-16");
  });

  test("midday it is plain today", () => {
    expect(dayKey(openingDay(NOW, new Set(), 45 * 60, []).day)).toBe("2026-10-18");
  });
});
