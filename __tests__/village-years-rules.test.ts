/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Pacific/Auckland"}
 */
import assert from "node:assert/strict";

import { ANIMALS } from "../db/crestRules";
import {
  ageOf,
  agesReached,
  type Break,
  bestBreak,
  type Entry,
  type JournalRow,
  levelAfterEachSession,
  rungDepths,
  seasons,
  stones,
  timeline,
} from "../db/villageYearsRules";

const brk = (over: Partial<Break>): Break => ({
  exerciseId: 1,
  unit: "reps",
  prior: 10,
  value: 12,
  at: 0,
  ...over,
});

describe("levelAfterEachSession", () => {
  test("a session belongs to the level reached after it, non-counting XP included", () => {
    const levelOf = (xp: number) => Math.floor(xp / 100) + 1;
    expect(levelAfterEachSession([{ xp: 90 }, { xp: 20 }, { xp: 250 }], levelOf)).toEqual([
      1, 2, 4,
    ]);
  });
});

describe("bestBreak", () => {
  test("the biggest relative gain, not the biggest absolute one", () => {
    const small = brk({ exerciseId: 1, prior: 4, value: 8 }); // +100 %
    const big = brk({ exerciseId: 2, prior: 100, value: 150 }); // +50 %
    expect(bestBreak([big, small])).toBe(small);
  });

  test("a tie goes to the most recent, whatever the order given", () => {
    const old = brk({ exerciseId: 1, at: 1 });
    const recent = brk({ exerciseId: 2, at: 2 });
    expect(bestBreak([old, recent])).toBe(recent);
    expect(bestBreak([recent, old])).toBe(recent);
  });

  test("none at all is null", () => {
    expect(bestBreak([])).toBeNull();
  });
});

const day = (
  d: number,
  over: Partial<JournalRow> & { sets?: [number, number][] } = {},
  month = 0,
): JournalRow => ({
  at: new Date(2026, month, d, 12),
  xp: 100,
  counts: true,
  practice: "strength",
  bests: (over.sets ?? []).map(([exerciseId, value]) => ({ exerciseId, unit: "reps", value })),
  ...over,
});

const flat = (xp: number) => Math.floor(xp / 100) + 1;

describe("timeline", () => {
  test("the first value of a movement is no record, a later higher one is", () => {
    const e = timeline(
      [day(1, { sets: [[1, 10]] }), day(2, { sets: [[1, 10]] }), day(3, { sets: [[1, 12]] })],
      flat,
    );
    expect(e.map((x) => x.breaks.length)).toEqual([0, 0, 1]);
    expect(e[2]?.breaks[0]).toMatchObject({ prior: 10, value: 12 });
    expect(e.map((x) => x.firstSeen)).toEqual([[1], [], []]);
  });

  test("reps and seconds on one movement are two records", () => {
    const rows = [day(1, { sets: [[1, 10]] }), day(2)];
    rows[1] = { ...day(2), bests: [{ exerciseId: 1, unit: "time", value: 60 }] };
    expect(timeline(rows, flat).flatMap((x) => x.breaks)).toEqual([]);
  });

  test("a session that does not count has no entry, but its XP moves the level", () => {
    const e = timeline(
      [day(1, { xp: 150, counts: false, sets: [[1, 99]] }), day(2, { sets: [[1, 5]] })],
      flat,
    );
    expect(e).toHaveLength(1);
    expect(e[0]?.level).toBe(3);
    // The 99 of the short outing is a standing value (like `movementRecordFell`): 5 breaks nothing,
    // and the short outing itself earns no break nor first sighting.
    expect(e[0]?.breaks).toEqual([]);
    expect(e[0]?.firstSeen).toEqual([1]);
  });

  test("a short outing is a reference: a later session that beats it breaks it", () => {
    const e = timeline(
      [day(1, { counts: false, sets: [[1, 10]] }), day(2, { sets: [[1, 12]] })],
      flat,
    );
    expect(e[0]?.breaks).toEqual([expect.objectContaining({ prior: 10, value: 12 })]);
  });
});

const entry = (level: number, over: Partial<Entry> = {}): Entry => ({
  at: new Date(2026, 0, 1),
  level,
  practice: "strength",
  breaks: [],
  firstSeen: [],
  ...over,
});

describe("stones", () => {
  test("one per level after 20, the record if any, else the count", () => {
    const list = stones([
      entry(20),
      entry(21),
      entry(21),
      entry(22, { breaks: [brk({ prior: 10, value: 12 })] }),
      entry(24),
    ]);
    expect(list.map((s) => s.level)).toEqual([21, 22, 23, 24]);
    expect(list[0]).toMatchObject({ decade: 2, fact: { kind: "sessions", count: 2 } });
    expect(list[1]?.fact).toMatchObject({ kind: "record", value: 12 });
  });

  test("a level jumped over takes the stone of the session that crossed it, with its fact", () => {
    const list = stones([
      entry(21),
      entry(24, { breaks: [brk({ prior: 10, value: 12 })] }),
      entry(24),
    ]);
    expect(list.map((s) => s.level)).toEqual([21, 22, 23, 24]);
    expect(list[1]?.fact).toMatchObject({ kind: "record", value: 12 });
    expect(list[2]?.fact).toMatchObject({ kind: "record", value: 12 });
    expect(list[3]?.fact).toMatchObject({ kind: "record", value: 12 });
  });

  test("a first session already past 21 gives stones to the levels below it", () => {
    expect(stones([entry(23)]).map((s) => s.level)).toEqual([21, 22, 23]);
  });
});

describe("seasons", () => {
  const at = (y: number, m: number, d: number, h = 12, min = 0) =>
    entry(5, { at: new Date(y, m, d, h, min) });
  const NOW = new Date(2027, 5, 20, 12);

  test("the windows change at local midnight", () => {
    const list = seasons(
      [
        at(2026, 1, 28, 23, 59),
        at(2026, 2, 1, 0, 0),
        at(2026, 4, 31, 23, 59),
        at(2026, 5, 1, 0, 0),
      ],
      NOW,
      false,
      "bear",
    );
    expect(list.map((b) => [b.kind, b.sessions])).toEqual([
      ["winter", 1],
      ["spring", 2],
      ["summer", 1],
    ]);
  });

  test("December belongs to the winter that ends in February", () => {
    const [b] = seasons([at(2025, 11, 31), at(2026, 0, 15)], NOW, false, "bear");
    expect(b).toMatchObject({
      kind: "winter",
      sessions: 2,
      start: new Date(2025, 11, 1).getTime(),
    });
  });

  test("the southern hemisphere only renames", () => {
    const north = seasons([at(2026, 0, 15), at(2026, 6, 15)], NOW, false, "bear");
    const south = seasons([at(2026, 0, 15), at(2026, 6, 15)], NOW, true, "bear");
    expect(north.map((b) => b.start)).toEqual(south.map((b) => b.start));
    expect(north.map((b) => b.kind)).toEqual(["winter", "summer"]);
    expect(south.map((b) => b.kind)).toEqual(["summer", "winter"]);
  });

  test("the season in progress has no banner, a finished empty one has none either", () => {
    const list = seasons([at(2027, 4, 5), at(2027, 5, 10)], NOW, false, "bear");
    expect(list.map((b) => b.kind)).toEqual(["spring"]);
    expect(seasons([at(2027, 5, 10)], NOW, false, "bear")).toEqual([]);
    // Ends at midnight: a banner exists from the first instant of the next season.
    expect(seasons([at(2027, 4, 5)], new Date(2027, 5, 1, 0, 0), false, "bear")).toHaveLength(1);
    expect(seasons([at(2027, 4, 5)], new Date(2027, 4, 31, 23, 59), false, "bear")).toHaveLength(0);
  });

  test("the record of the season, else the count; the colour is the first animal's", () => {
    const [a, b] = seasons(
      [at(2026, 0, 5), entry(5, { at: new Date(2026, 3, 5), breaks: [brk({})] })],
      NOW,
      false,
      "stag",
    );
    expect(a).toMatchObject({ fact: { kind: "sessions", count: 1 }, animal: "stag" });
    expect(b?.fact).toMatchObject({ kind: "record" });
  });

  test("the boar takes the practice in the lead of each season, a tie to the latest", () => {
    const [a, b] = seasons(
      [
        entry(5, { at: new Date(2026, 0, 5), practice: "strength" }),
        entry(5, { at: new Date(2026, 0, 6), practice: "yoga" }),
        entry(5, { at: new Date(2026, 3, 5), practice: "run" }),
        entry(5, { at: new Date(2026, 3, 6), practice: null }),
      ],
      NOW,
      false,
      "boar",
    );
    expect([a?.animal, b?.animal]).toEqual(["salmon", "stag"]);
    expect(seasons([entry(5, { practice: null })], NOW, false, "boar")[0]?.animal).toBeNull();
    expect(ANIMALS).toContain("boar");
  });

  test("a first session in mid-season: a row holds at most four banners", () => {
    // Spring 2025 (from March) is season 0; the summer after is 1, autumn 2, winter 3, then spring 2026 starts year 2.
    const list = seasons(
      [
        entry(5, { at: new Date(2025, 4, 20) }),
        at(2025, 6, 1),
        at(2025, 9, 1),
        at(2026, 0, 10),
        at(2026, 3, 1),
      ],
      NOW,
      false,
      "bear",
    );
    expect(list.map((b) => [b.kind, b.villageYear])).toEqual([
      ["spring", 1],
      ["summer", 1],
      ["autumn", 1],
      ["winter", 1],
      ["spring", 2],
    ]);
  });

  test("the village year counts from the first session's day", () => {
    const first = entry(5, { at: new Date(2025, 5, 1, 15) });
    const list = seasons([first, at(2026, 5, 2), at(2026, 3, 1)], NOW, false, "bear");
    expect(list.map((b) => [b.kind, b.villageYear])).toEqual([
      ["summer", 1],
      ["spring", 1],
      ["summer", 2],
    ]);
  });
});

describe("ageOf", () => {
  // Movements: 1 and 2 are the ends of chains, 10 is a first rung (depth 0), 11 and 12 are above it.
  const depth = rungDepths(
    new Map([
      [10, null],
      [11, 10],
      [12, 11],
      [20, null],
    ]),
  );

  test("rung depths follow the chain and survive a cycle", () => {
    expect([...depth]).toEqual([
      [10, 0],
      [11, 1],
      [12, 2],
      [20, 0],
    ]);
    expect(
      rungDepths(
        new Map([
          [1, 2],
          [2, 1],
        ]),
      ).get(1),
    ).toBe(1);
  });

  const hero = (): Entry[] => [
    ...Array.from({ length: 40 }, (_, i) =>
      entry(30 + Math.floor(i / 4), { firstSeen: i === 3 ? [11] : [] }),
    ),
    entry(41, { firstSeen: [10] }), // before the window: reached 40 with the session at index 39
    entry(44, { firstSeen: [11] }),
    entry(47, { firstSeen: [12] }),
    entry(48, { firstSeen: [11] }),
    entry(50),
    entry(53),
  ];

  test("nothing before the level", () => {
    expect(ageOf(50, hero().slice(0, 43), depth)).toBeNull();
    expect(agesReached([], depth)).toEqual([]);
  });

  test("the deepest rung first done in the window, with the level it was reached at", () => {
    expect(ageOf(50, hero(), depth)).toMatchObject({
      level: 50,
      source: "rung",
      exerciseId: 12,
      depth: 2,
      reachedAtLevel: 47,
    });
  });

  test("equal depth: the latest first done wins", () => {
    const e = [
      entry(40),
      entry(45, { firstSeen: [11] }),
      entry(46, { firstSeen: [20, 12] }),
      entry(50, { firstSeen: [] }),
    ];
    expect(
      ageOf(
        50,
        e,
        new Map([
          [11, 1],
          [20, 1],
          [12, 1],
        ]),
      ),
    ).toMatchObject({ exerciseId: 12 });
  });

  test("no new rung in the window: the deepest held so far, else the leading practice, else none", () => {
    const held = [entry(30, { firstSeen: [11] }), entry(40), entry(45), entry(50)];
    expect(ageOf(50, held, depth)).toMatchObject({
      source: "held",
      exerciseId: 11,
      reachedAtLevel: 30,
    });

    const none = [
      entry(40),
      entry(45, { practice: "yoga" }),
      entry(46, { practice: "run" }),
      entry(47, { practice: "run" }),
      entry(48, { practice: "run" }),
      entry(50, { practice: "yoga" }),
      entry(51, { practice: "run" }), // after the Age: not in its window
    ];
    expect(ageOf(50, none, depth)).toMatchObject({
      source: "practice",
      practice: "run",
      exerciseId: null,
    });
    expect(ageOf(50, [entry(40), entry(50, { practice: null })], depth)).toMatchObject({
      source: "none",
    });
  });

  test("a rung of depth 0 is no rung, and the next Age starts after the one that reached the last", () => {
    const e = [
      entry(40),
      entry(50, { firstSeen: [10] }),
      entry(55, { firstSeen: [11] }),
      entry(60),
      entry(61),
    ];
    const ages = agesReached(e, depth);
    // Depth 0 only (and nothing else to hold): no rung, no practice.
    expect(ages.map((x) => [x.level, x.source, x.exerciseId])).toEqual([
      [50, "practice", null],
      [60, "rung", 11],
    ]);
    assert(ages[0]);
    expect(ages[0].practice).toBe("strength");
  });
});
