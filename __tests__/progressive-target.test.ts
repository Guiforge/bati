import {
  beatInputOf,
  progressiveTarget,
  type SessionMark,
  TARGET_CAP,
  toBeat,
} from "../db/progress";
import type { DifficultyCode } from "../db/schema";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-16T12:00:00Z");
const RANGE = { min: 1, max: 999 };

/** A session `daysAgo` days before tonight. */
const mark = (
  prescribed: number | null,
  met: boolean | null,
  daysAgo: number,
  level: DifficultyCode = "medium",
): SessionMark => ({ prescribed, met, at: NOW - daysAgo * DAY, level });

type Input = Parameters<typeof progressiveTarget>[0];
const ask = (over: Partial<Input> & Pick<Input, "recent">) =>
  progressiveTarget({
    type: "reps",
    band: 14,
    floor: 8,
    top: 20,
    lastAt: over.recent[0]?.at ?? null,
    start: "band",
    level: "medium",
    record: null,
    now: NOW,
    range: RANGE,
    ...over,
  });

describe("progressiveTarget, the worked examples", () => {
  test("12 met everywhere gives 13", () => {
    expect(ask({ recent: [mark(12, true, 2)] })).toEqual({ value: 13, why: "progress" });
  });

  test("one set missed keeps the same target", () => {
    expect(ask({ recent: [mark(12, false, 2)] })).toEqual({ value: 12, why: "same" });
  });

  test("every set neutral keeps the same target", () => {
    expect(ask({ recent: [mark(12, null, 2)] })).toEqual({ value: 12, why: "same" });
  });

  test("the cap stops the progression", () => {
    expect(ask({ recent: [mark(20, true, 2)] }).value).toBe(20);
  });

  test("a band already above the cap is stopped, not lowered", () => {
    expect(ask({ recent: [mark(25, true, 2)], top: 25 }).value).toBe(25);
  });

  test("a hold never passes 75 % of its record", () => {
    expect(ask({ type: "time", recent: [mark(30, true, 2)], record: 30 })).toEqual({
      value: 20,
      why: "hold_cap",
    });
  });

  test("a hold gains five seconds under its cap", () => {
    expect(
      ask({ type: "time", recent: [mark(40, true, 2)], record: 70, floor: 30, top: 60 }),
    ).toEqual({ value: 45, why: "progress" });
  });

  test("the hold cap holds on the band branch too, under the floor", () => {
    expect(ask({ type: "time", recent: [], record: 30, band: 30, floor: 30, top: 45 })).toEqual({
      value: 20,
      why: "hold_cap",
    });
  });

  test("the level picker still moves a learnt target", () => {
    expect(ask({ recent: [mark(12, true, 2, "medium")], level: "easy" }).value).toBe(10);
  });

  test("a swap onto a movement never done starts at the bottom of the band", () => {
    expect(ask({ recent: [], start: "floor", floor: 8 })).toEqual({ value: 8, why: "rung_start" });
  });

  test("nothing known and no swap is the band", () => {
    expect(ask({ recent: [] })).toEqual({ value: 14, why: "band" });
  });
});

describe("progressiveTarget, the comeback", () => {
  test("15 days away: a level lower, no +1", () => {
    expect(ask({ recent: [mark(12, true, 15)] })).toEqual({ value: 9, why: "comeback" });
  });

  test("the second session after the gap stays a level lower and earns its +1", () => {
    expect(ask({ recent: [mark(9, true, 2), mark(12, true, 17)], lastAt: NOW - 2 * DAY })).toEqual({
      value: 10,
      why: "comeback",
    });
  });

  test("the third session is back at the pre-gap prescription", () => {
    const recent = [mark(10, true, 2), mark(9, true, 4), mark(12, true, 19)];
    expect(ask({ recent, lastAt: NOW - 2 * DAY }).value).toBe(12);
  });

  test("14 days is not a gap", () => {
    expect(ask({ recent: [mark(12, true, 14)] }).value).toBe(13);
  });

  test("a hard hero comes back at 0.8", () => {
    expect(ask({ recent: [mark(10, true, 15, "hard")], level: "hard" }).value).toBe(8);
  });

  test("easy takes medium's step", () => {
    expect(ask({ recent: [mark(12, true, 15, "easy")], level: "easy" }).value).toBe(9);
  });

  test("a comeback is not raised to the floor", () => {
    expect(ask({ recent: [mark(12, true, 15)], floor: 12 })).toEqual({ value: 9, why: "comeback" });
  });

  test("a comeback is still cut at max(top, cap): a deleted hero quest's 50 squats", () => {
    const out = ask({ recent: [mark(50, true, 15)], top: 16 });
    expect(out.value).toBe(TARGET_CAP.reps);
    expect(out.why).toBe("comeback");
  });

  test("the movement done last week in another quest is no gap", () => {
    expect(ask({ recent: [mark(12, true, 20)], lastAt: NOW - 3 * DAY }).value).toBe(13);
  });
});

describe("progressiveTarget, null guards", () => {
  test("an s1 with no prescription opens no comeback", () => {
    expect(ask({ recent: [mark(12, true, 2), mark(null, null, 22)] }).value).toBe(13);
  });

  test("an s2 with no prescription is never read", () => {
    const recent = [mark(10, true, 2), mark(12, true, 22), mark(null, null, 60)];
    expect(ask({ recent, lastAt: NOW - 2 * DAY }).value).toBe(11);
  });

  test("an s0 with no prescription is the band", () => {
    expect(ask({ recent: [mark(null, null, 2)] })).toEqual({ value: 14, why: "band" });
  });

  test("no input combination gives NaN or the range minimum by accident", () => {
    const options = [null, 12];
    for (const a of options)
      for (const b of options)
        for (const c of options) {
          const out = ask({ recent: [mark(a, true, 2), mark(b, true, 30), mark(c, true, 60)] });
          expect(Number.isFinite(out.value)).toBe(true);
          expect(out.value).toBeGreaterThan(1);
        }
  });
});

describe("progressiveTarget, the band clamp", () => {
  test("a bigger band's number is cut to tonight's top or the cap", () => {
    // Squat met at 22 in a 20-25 quest, tonight a 12-16 quest: at the cap, clamped to max(16, 20).
    expect(ask({ recent: [mark(22, true, 2)], floor: 12, top: 16 })).toEqual({
      value: 20,
      why: "band",
    });
  });

  test("a smaller band's number is raised to tonight's floor", () => {
    expect(ask({ recent: [mark(12, true, 2)], floor: 20, top: 25 })).toEqual({
      value: 20,
      why: "band",
    });
  });
});

describe("beatInputOf", () => {
  test("feeds toBeat what the wall feeds it", () => {
    const ghost = {
      last: 12,
      best: 15,
      at: NOW,
      bestAt: NOW - 5 * DAY,
      seasonBest: 15,
      recent: [],
    };
    expect(toBeat(beatInputOf(ghost), new Date(NOW))).toBe(16);
    expect(beatInputOf(ghost).recordAt).toEqual(new Date(NOW - 5 * DAY));
  });
});
