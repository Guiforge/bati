import {
  checkHandDistance,
  checkHandEntry,
  HAND_MAX_KMH,
  HAND_PAID_MAX,
  type HandEntryDraft,
  handEntryPays,
  type MeasuredSpan,
  maxHandDistanceM,
  parseClock,
  takesHandDistance,
  withinHandWindow,
} from "../db/handEntryRules";
import { HAND_ENTRY_XP, outingXpPerMinute } from "../db/xp";

const NOW = new Date(2026, 9, 18, 20, 0, 0); // Sunday 18 October 2026, 20:00 local

function draft(over: Partial<HandEntryDraft> = {}): HandEntryDraft {
  return {
    kind: "workout",
    endedAt: new Date(2026, 9, 18, 19, 30),
    durationSeconds: 45 * 60,
    distanceM: null,
    ...over,
  };
}

const none = {
  handDays: new Set<string>(),
  measured: [] as MeasuredSpan[],
  firstMeasuredAt: new Date(2020, 0, 1),
  paidInWindow: 0,
};

describe("the XP of a hand entry", () => {
  test("is the XP of 15 minutes in Bati: 75, whatever the type", () => {
    expect(HAND_ENTRY_XP).toBe(15 * outingXpPerMinute("walk"));
    expect(HAND_ENTRY_XP).toBe(75);
  });
});

describe("nothing is noted before the first measured session", () => {
  const first = (at: Date) => ({ ...none, firstMeasuredAt: at });

  test("the day before is refused, the day itself is not", () => {
    // The entry runs 18:45 to 19:30 on the 18th.
    expect(checkHandEntry(draft(), first(new Date(2026, 9, 19, 8, 0)), NOW)).toEqual({
      key: "before_first",
    });
    expect(checkHandEntry(draft(), first(new Date(2026, 9, 18, 21, 0)), NOW)).toBeNull();
  });

  test("a hero with no measured session yet has no journal to write in", () => {
    expect(checkHandEntry(draft(), { ...none, firstMeasuredAt: null }, NOW)).toEqual({
      key: "before_first",
    });
  });
});

describe("the paid entries", () => {
  test("three pay inside the days the form reaches, the fourth is only noted", () => {
    expect(handEntryPays({ paidInWindow: 2 })).toBe(true);
    expect(handEntryPays({ paidInWindow: HAND_PAID_MAX })).toBe(false);
  });
});

describe("the five refusals", () => {
  test("a good entry is accepted", () => {
    expect(checkHandEntry(draft(), none, NOW)).toBeNull();
  });

  test("1: more than seven days back", () => {
    const eight = draft({ endedAt: new Date(2026, 9, 10, 19, 0) });
    expect(checkHandEntry(eight, none, NOW)).toEqual({ key: "too_old" });
    const seven = draft({ endedAt: new Date(2026, 9, 11, 19, 0) });
    expect(checkHandEntry(seven, none, NOW)).toBeNull();
  });

  test("2: a hand entry already stands on that day, whatever its type", () => {
    const refusal = checkHandEntry(
      draft({ kind: "walk" }),
      {
        handDays: new Set(["2026-10-18"]),
        measured: [],
        firstMeasuredAt: new Date(2020, 0, 1),
        paidInWindow: 0,
      },
      NOW,
    );
    expect(refusal).toEqual({ key: "one_per_day", day: "2026-10-18" });
  });

  test("3: under ten minutes, over four hours; the bounds themselves pass", () => {
    expect(checkHandEntry(draft({ durationSeconds: 599 }), none, NOW)).toEqual({
      key: "duration",
    });
    expect(checkHandEntry(draft({ durationSeconds: 600 }), none, NOW)).toBeNull();
    expect(checkHandEntry(draft({ durationSeconds: 4 * 3600 }), none, NOW)).toBeNull();
    expect(checkHandEntry(draft({ durationSeconds: 4 * 3600 + 1 }), none, NOW)).toEqual({
      key: "duration",
    });
  });

  test("4: overlapping a measured session names it; touching end to start is fine", () => {
    const quest: MeasuredSpan = {
      id: 7,
      startedAt: new Date(2026, 9, 18, 18, 10),
      endedAt: new Date(2026, 9, 18, 18, 50),
      questId: 3,
      outing: null,
    };
    const refusal = checkHandEntry(
      draft(),
      {
        handDays: new Set(),
        measured: [quest],
        firstMeasuredAt: new Date(2020, 0, 1),
        paidInWindow: 0,
      },
      NOW,
    );
    expect(refusal).toEqual({ key: "overlap", with: quest });

    // 18:45 start (19:30 end, 45 min) starts before 18:50: overlap. Ending at 18:10 does not.
    const before = draft({ endedAt: new Date(2026, 9, 18, 18, 10), durationSeconds: 30 * 60 });
    expect(
      checkHandEntry(
        before,
        {
          handDays: new Set(),
          measured: [quest],
          firstMeasuredAt: new Date(2020, 0, 1),
          paidInWindow: 0,
        },
        NOW,
      ),
    ).toBeNull();
  });

  test("5: speed over 8 / 20 / 45 km/h is refused with the distance fix that would pass", () => {
    expect(HAND_MAX_KMH).toEqual({ walk: 8, run: 20, ride: 45 });
    // 12 km in 30 minutes = 24 km/h: too fast for a run; 1.2 km would be fine.
    const run = draft({ kind: "run", durationSeconds: 30 * 60 + 0, distanceM: 12_000 });
    const refusal = checkHandEntry(run, none, NOW);
    expect(refusal).toMatchObject({ key: "implausible", speedKmh: 24, fixM: 1200 });

    const walkOk = draft({ kind: "walk", durationSeconds: 3600, distanceM: 8000 });
    expect(checkHandEntry(walkOk, none, NOW)).toBeNull();
    const walkFast = draft({ kind: "walk", durationSeconds: 3600, distanceM: 8001 });
    expect(checkHandEntry(walkFast, none, NOW)).toMatchObject({ key: "implausible" });
    const rideFast = draft({ kind: "ride", durationSeconds: 3600, distanceM: 45_001 });
    expect(checkHandEntry(rideFast, none, NOW)).toMatchObject({ key: "implausible" });
  });

  test("5: no fix when dividing by ten does not make it plausible", () => {
    const wild = draft({ kind: "walk", durationSeconds: 600, distanceM: 90_000 });
    expect(checkHandEntry(wild, none, NOW)).toMatchObject({ key: "implausible", fixM: null });
  });

  test("the first failing rule wins, in the order of the brief", () => {
    const refusal = checkHandEntry(
      draft({ endedAt: new Date(2026, 9, 1, 19, 0), durationSeconds: 60 }),
      {
        handDays: new Set(["2026-10-01"]),
        measured: [],
        firstMeasuredAt: new Date(2020, 0, 1),
        paidInWindow: 0,
      },
      NOW,
    );
    expect(refusal).toEqual({ key: "too_old" });
  });

  test("an end in the future is refused, not moved to now", () => {
    expect(checkHandEntry(draft({ endedAt: new Date(2026, 9, 18, 23, 0) }), none, NOW)).toEqual({
      key: "future",
    });
  });
});

describe("the distance a hand can claim in a day", () => {
  test("is four hours at the plausible speed", () => {
    expect(maxHandDistanceM("ride")).toBe(180_000);
    expect(maxHandDistanceM("walk")).toBe(32_000);
  });
});

describe("parseClock", () => {
  test.each([
    ["1930", [19, 30]],
    ["19h30", [19, 30]],
    ["19:30", [19, 30]],
    ["7:30 pm", [19, 30]],
    ["7:30 PM", [19, 30]],
    ["12:05 am", [0, 5]],
    ["12 pm", [12, 0]],
    ["9", [9, 0]],
    ["0905", [9, 5]],
  ])("reads %s", (text, hm) => {
    expect(parseClock(text)).toEqual({ hours: hm[0], minutes: hm[1] });
  });

  test.each(["", "25:00", "12:75", "abc", "7:30 xm"])("refuses %s", (text) => {
    expect(parseClock(text)).toBeNull();
  });
});

describe("the distance of an outing timed without GPS", () => {
  test("is read on the real duration, even under ten minutes", () => {
    // 1 km in 2 min 22 s on foot is 25 km/h.
    expect(checkHandDistance("walk", 142, 1000)).toMatchObject({ key: "implausible", fixM: 100 });
    expect(checkHandDistance("ride", 300, 5000)).toMatchObject({ key: "implausible" });
    expect(checkHandDistance("walk", 142, 200)).toBeNull();
    expect(checkHandDistance("walk", 0, 1000)).toMatchObject({ key: "implausible" });
  });
});

describe("which outing takes a typed distance", () => {
  const row = (over: Partial<Parameters<typeof takesHandDistance>[0]> = {}) => ({
    outing: "walk" as const,
    byHand: null,
    movingSeconds: null,
    leaguesM: null,
    ...over,
  });

  test("one Bati measured nothing of, or one already typed", () => {
    expect(takesHandDistance(row())).toBe(true);
    expect(takesHandDistance(row({ byHand: "distance", leaguesM: 3000 }))).toBe(true);
  });

  test("never a GPS walk saved before 0046, whose moving time is null beside its distance", () => {
    expect(takesHandDistance(row({ leaguesM: 5200 }))).toBe(false);
  });

  test("never a measured outing, a workout or a session written down", () => {
    expect(takesHandDistance(row({ movingSeconds: 1800 }))).toBe(false);
    expect(takesHandDistance(row({ outing: null }))).toBe(false);
    expect(takesHandDistance(row({ byHand: "session" }))).toBe(false);
  });
});

describe("the window a session can be written down or corrected in", () => {
  test("seven calendar days back, the eighth is past it", () => {
    expect(withinHandWindow(new Date(2026, 9, 11, 23, 0), NOW)).toBe(true);
    expect(withinHandWindow(new Date(2026, 9, 10, 23, 0), NOW)).toBe(false);
  });
});
