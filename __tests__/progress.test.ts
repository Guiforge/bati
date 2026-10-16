import {
  isOldRecord,
  ladderPosition,
  STALE_RECORD_DAYS,
  streakOf,
  targetToBeat,
  toBeat,
} from "../db/progress";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-16T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY);

describe("toBeat", () => {
  test("a movement never logged is beaten by one", () => {
    expect(toBeat({ best: null, last: null, seasonBest: null, recordAt: null }, now)).toBe(1);
    expect(targetToBeat(null)).toBe(1);
  });

  test("a recent record is beaten by one more", () => {
    expect(toBeat({ best: 20, last: 12, seasonBest: 20, recordAt: daysAgo(10) }, now)).toBe(21);
  });

  test("an old record not matched this season gives the season's best", () => {
    expect(toBeat({ best: 60, last: 30, seasonBest: 45, recordAt: daysAgo(300) }, now)).toBe(46);
  });

  test("an old record with no season gives the last result", () => {
    expect(toBeat({ best: 60, last: 30, seasonBest: null, recordAt: daysAgo(300) }, now)).toBe(31);
  });
});

test("a record is old only past STALE_RECORD_DAYS", () => {
  const at = (d: number) => ({ best: 9, last: 9, seasonBest: null, recordAt: daysAgo(d) });
  expect(isOldRecord(at(STALE_RECORD_DAYS), now)).toBe(false);
  expect(isOldRecord(at(STALE_RECORD_DAYS + 1), now)).toBe(true);
});

test("streakOf is the run at the head, capped", () => {
  expect(streakOf([true, true, false, true])).toBe(2);
  expect(streakOf([true, true, true, true])).toBe(3);
  expect(streakOf([])).toBe(0);
});

describe("ladderPosition", () => {
  const chain = [1, 2, 3];
  test("an earned rung puts itself and everything under it behind the hero", () => {
    expect(ladderPosition(chain, new Set([2]), new Map())).toBe(2);
  });
  test("one clean windowed session puts what is under it behind", () => {
    expect(ladderPosition(chain, new Set(), new Map([[3, [false, true]]]))).toBe(2);
  });
  test("nothing means the first rung", () => {
    expect(ladderPosition(chain, new Set(), new Map())).toBe(0);
  });
});
