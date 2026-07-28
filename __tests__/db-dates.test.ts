import { dayKey } from "@/db/dates";

/**
 * Regression: six places turned a Date into a day with `toISOString().split("T")[0]`, which is
 * the UTC day, and then compared it against something built locally — a calendar grid of
 * `new Date(year, month, date)`, a `setHours(0,0,0,0)` midnight, a `startOfDay`. Outside UTC
 * the two never lined up: workout dots landed on the wrong square, the 7-day chart dropped
 * today's session, and the daily quest (with its 1.5x XP) rotated at 02:00 or 19:00 local.
 *
 * These assert the property rather than a fixed string, so they hold in whatever timezone the
 * suite happens to run in — including a machine that sits on UTC and would never see the bug.
 */

/** The local calendar day, spelled out the long way — what every caller means by "day". */
function localDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe("dayKey", () => {
  it.each([
    ["local midnight", new Date(2026, 2, 14, 0, 0, 0)],
    ["mid-morning", new Date(2026, 2, 14, 9, 30, 0)],
    ["one minute to midnight", new Date(2026, 2, 14, 23, 59, 0)],
    ["a single-digit month and day", new Date(2026, 0, 5, 12, 0, 0)],
  ])("reads %s as its local calendar day", (_label, date) => {
    expect(dayKey(date)).toBe(localDay(date));
  });

  // The bug in one line: a day starts at local midnight and ends at local 23:59, and both
  // ends have to land on the same key. `toISOString()` splits them in every timezone but UTC.
  it("gives both ends of a local day the same key", () => {
    const opensAt = new Date(2026, 2, 14, 0, 0, 0);
    const closesAt = new Date(2026, 2, 14, 23, 59, 59);

    expect(dayKey(opensAt)).toBe(dayKey(closesAt));
  });

  it("moves to the next key exactly at the next local midnight", () => {
    const lastMoment = new Date(2026, 2, 14, 23, 59, 59);
    const firstMoment = new Date(2026, 2, 15, 0, 0, 0);

    expect(dayKey(lastMoment)).toBe("2026-03-14");
    expect(dayKey(firstMoment)).toBe("2026-03-15");
  });
});
