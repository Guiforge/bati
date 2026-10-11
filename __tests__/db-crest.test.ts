import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The crest on a real database: the same predicate that decides what is a session decides what
 * counts for the animal, and the preferences are read and written as the merge expects.
 */
let t: ReturnType<typeof createTestDb>;

beforeEach(() => {
  jest.resetModules();
  exerciseIds = new Map();
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
});
afterEach(() => t.close());

const crest = () => require("../db/crest") as typeof import("../db/crest");
const prefs = () =>
  (require("../db/preferences") as typeof import("../db/preferences")).preferences;

const NOW = new Date("2026-03-15T12:00:00Z");
const DAY = 86_400;
const atDay = (daysAgo: number) => Math.floor(NOW.getTime() / 1000) - daysAgo * DAY;

let exerciseIds = new Map<string, number>();
function exerciseOf(style: string, variant = 0): number {
  const key = `${style}/${variant}`;
  const known = exerciseIds.get(key);
  if (known !== undefined) return known;
  const id = Number(
    t.sqlite
      .prepare(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator, difficulty, style, createdAt, updatedAt)
         VALUES (?, ?, '', '', 'hero', 'medium', ?, 1, 1)`,
      )
      .run(`crest-${key}`, `crest-${key}`, style).lastInsertRowid,
  );
  exerciseIds.set(key, id);
  return id;
}

let n = 0;
function add(
  at: number,
  opts: {
    outing?: string;
    moving?: number;
    uuid?: string;
    sets?: { style: string; variant?: number; value?: number }[];
  } = {},
) {
  n += 1;
  const uuid = opts.uuid ?? `0190c000-0000-7000-8000-${String(n).padStart(12, "0")}`;
  const { lastInsertRowid } = t.sqlite
    .prepare(
      `INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, outing, movingSeconds, durationSeconds)
       VALUES (?, 'medium', 10, ?, ?, ?, ?)`,
    )
    .run(uuid, at, opts.outing ?? null, opts.moving ?? null, opts.moving ?? null);
  for (const [sortOrder, set] of (opts.sets ?? []).entries()) {
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, ?, 'reps', ?, ?)`,
      )
      .run(lastInsertRowid, exerciseOf(set.style, set.variant), sortOrder, set.value ?? 10, at);
  }
}
const strength = (daysAgo: number) => add(atDay(daysAgo), { sets: [{ style: "strength" }] });

describe("countSessions, the figure a village tier's feast says", () => {
  test("counts the workouts and the outings of ten minutes, not a shorter one", async () => {
    const { countSessions } = require("../db/completed") as typeof import("../db/completed");
    expect(await countSessions()).toBe(0);
    strength(5);
    add(atDay(4), { outing: "run", moving: 10 * 60 });
    add(atDay(3), { outing: "run", moving: 9 * 60 });
    expect(await countSessions()).toBe(2);
  });
});

describe("what counts for the animal is what countsAsSession accepts", () => {
  test("a short outing is no session, a ten-minute one is", async () => {
    for (let i = 0; i < 7; i++) strength(30 - i);
    add(atDay(10), { outing: "run", moving: 9 * 60 });
    expect(await crest().getCrest(NOW)).toBeNull();

    add(atDay(9), { outing: "run", moving: 10 * 60 });
    expect(await crest().getCrest(NOW)).toMatchObject({ animal: "bear" });
  });

  test("a ride of ten minutes is the Horse's practice, a walk the Stag's", async () => {
    for (let i = 0; i < 4; i++) add(atDay(30 - i), { outing: "ride", moving: 900 });
    for (let i = 0; i < 4; i++) add(atDay(20 - i), { outing: "walk", moving: 900 });
    // 4 and 4, and the walks are the latest.
    expect(await crest().getCrest(NOW)).toMatchObject({ animal: "stag" });
  });

  test("a workout whose only movements are expeditions has no practice and is ignored", async () => {
    for (let i = 0; i < 7; i++) strength(30 - i);
    add(atDay(10), { sets: [{ style: "expedition" }] });
    add(atDay(9));
    expect(await crest().getCrest(NOW)).toBeNull();
    strength(8);
    expect(await crest().getCrest(NOW)).toMatchObject({ animal: "bear" });
  });

  test("a mixed workout is its majority style", async () => {
    for (let i = 0; i < 8; i++) {
      add(atDay(30 - i), {
        sets: [
          { style: "strength", variant: 0, value: 12 },
          { style: "yoga", variant: 0, value: 30 },
          { style: "yoga", variant: 1, value: 30 },
        ],
      });
    }
    expect((await crest().getCrest(NOW))?.evidence.totals).toMatchObject({ yoga: 8, strength: 0 });
  });

  test("a movement done in three rounds is one movement", async () => {
    for (let i = 0; i < 8; i++) {
      add(atDay(30 - i), {
        sets: [
          { style: "strength", variant: 0 },
          { style: "strength", variant: 0 },
          { style: "strength", variant: 0 },
          { style: "calisthenics", variant: 0 },
          { style: "calisthenics", variant: 1 },
        ],
      });
    }
    expect((await crest().getCrest(NOW))?.animal).toBe("ermine");
  });

  test("equal times fall back on the uuid, which is how the journal is replayed", async () => {
    const at = atDay(5);
    for (let i = 0; i < 4; i++) add(at, { uuid: `a-${i}`, sets: [{ style: "strength" }] });
    for (let i = 0; i < 4; i++) add(at, { uuid: `b-${i}`, sets: [{ style: "cardio" }] });
    // 4 and 4: the cardio sessions come last by uuid, so the Stag is the more recent.
    expect((await crest().getCrest(NOW))?.animal).toBe("stag");
  });
});

describe("the day it was revealed", () => {
  test("is the day of the 8th practised session, not the latest", async () => {
    for (let i = 0; i < 7; i++) strength(30 - i);
    add(atDay(23));
    strength(22);
    strength(5);
    expect((await crest().getCrest(NOW))?.revealedAt).toEqual(new Date(atDay(22) * 1000));
  });
});

describe("the replay order", () => {
  test("equal times are replayed by uuid, not by insertion order", async () => {
    const at = atDay(5);
    // Inserted cardio first, strength second: by rowid the Bear is the latest, by uuid the Stag.
    for (let i = 0; i < 4; i++) add(at, { uuid: `b-${i}`, sets: [{ style: "cardio" }] });
    for (let i = 0; i < 4; i++) add(at, { uuid: `a-${i}`, sets: [{ style: "strength" }] });
    expect((await crest().getCrest(NOW))?.animal).toBe("stag");
  });
});

describe("the figures beside the animal", () => {
  test("rings are whole years since the first session that counts, empty years included", async () => {
    for (let i = 0; i < 7; i++) strength(i + 1);
    add(atDay(365 * 2 + 30), { sets: [{ style: "strength" }] });
    expect((await crest().getCrest(NOW))?.rings).toBe(2);
  });

  test("a ring is a whole year: a new calendar year is not one", async () => {
    const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
    add(at("2025-12-31T12:00:00Z"), { sets: [{ style: "strength" }] });
    for (let i = 0; i < 7; i++)
      add(at("2026-11-20T12:00:00Z") + i * DAY, { sets: [{ style: "strength" }] });
    expect((await crest().getCrest(new Date("2026-12-01T12:00:00Z")))?.rings).toBe(0);
  });

  test("the exact anniversary of the first session is one ring", async () => {
    add(atDay(365), { sets: [{ style: "strength" }] });
    for (let i = 0; i < 7; i++) strength(i + 1);
    expect((await crest().getCrest(NOW))?.rings).toBe(1);
  });

  test("rings start at the first session that counts, even one with no practice", async () => {
    add(atDay(365 * 2 + 31), { sets: [{ style: "expedition" }] });
    for (let i = 0; i < 8; i++) strength(i + 1);
    expect((await crest().getCrest(NOW))?.rings).toBe(2);
  });

  test("a hero under a year has no ring, and the first session may be a short outing's neighbour, not it", async () => {
    for (let i = 0; i < 8; i++) strength(i + 1);
    add(atDay(800), { outing: "walk", moving: 60 });
    expect((await crest().getCrest(NOW))?.rings).toBe(0);
  });

  test("the longest flame is the level of the best streak, and none before a 3-day one", async () => {
    for (let i = 0; i < 8; i++) add(atDay(200 - i * 20), { sets: [{ style: "strength" }] });
    expect((await crest().getCrest(NOW))?.longestFlame).toBe(0);

    for (let i = 0; i < 40; i++) strength(40 - i);
    expect((await crest().getCrest(NOW))?.longestFlame).toBeGreaterThanOrEqual(4);
  });

  test("the longest flame outlives the current one: an old long run, a gap, a short recent one", async () => {
    for (let i = 0; i < 40; i++) strength(300 - i);
    for (let i = 0; i < 2; i++) strength(2 - i);
    // The flame held now is under 3 days; the band remembers the one of 30 or more.
    expect((await crest().getCrest(NOW))?.longestFlame).toBeGreaterThanOrEqual(4);
  });

  test("the longest flame never reads the oath: raising the quota leaves the band alone", async () => {
    // 40 weeks at 2 sessions a week: a flame at the default quota of 2, none at 3.
    for (let w = 0; w < 40; w++) {
      strength(w * 7 + 1);
      strength(w * 7 + 4);
    }
    const swear = (weeklyTarget: number) =>
      t.sqlite
        .prepare(
          "INSERT OR REPLACE INTO user_preferences (key, value, updatedAt) VALUES ('oath', ?, 1)",
        )
        .run(JSON.stringify({ metric: "weekly_sessions", weeklyTarget }));
    const flame = async () => (await crest().getCrest(NOW))?.longestFlame;

    const base = await flame();
    expect(base).toBeGreaterThanOrEqual(4);
    for (const target of [1, 2, 3]) {
      swear(target);
      expect(await flame()).toBe(base);
    }
    // The oath is finished: the preference goes, or turns to another metric.
    swear(3);
    t.sqlite
      .prepare("UPDATE user_preferences SET value = ? WHERE key = 'oath'")
      .run(JSON.stringify({ metric: "streak", weeklyTarget: 3 }));
    expect(await flame()).toBe(base);
    t.sqlite.prepare("DELETE FROM user_preferences WHERE key = 'oath'").run();
    expect(await flame()).toBe(base);
  });
});

describe("the preferences", () => {
  test("reading never creates the key, and an unknown or absent value is auto", async () => {
    expect(await prefs().getCrestAnimal()).toBe("auto");
    for (let i = 0; i < 8; i++) strength(i + 1);
    await crest().getCrest(NOW);
    const keys = () =>
      t.sqlite
        .prepare("SELECT key FROM user_preferences WHERE key IN ('crestAnimal', 'bigFeastsShown')")
        .all();
    expect(keys()).toEqual([]);

    t.sqlite
      .prepare(
        "INSERT INTO user_preferences (key, value, updatedAt) VALUES ('crestAnimal', 'dragon', 1)",
      )
      .run();
    expect(await prefs().getCrestAnimal()).toBe("auto");
    expect((await crest().getCrest(NOW))?.manual).toBe(false);
  });

  test("a choice is read back, and going back to auto writes auto, never a deletion", async () => {
    await prefs().setCrestAnimal("stag");
    expect(await prefs().getCrestAnimal()).toBe("stag");
    for (let i = 0; i < 8; i++) strength(i + 1);
    expect(await crest().getCrest(NOW)).toMatchObject({ animal: "stag", manual: true });

    await prefs().setCrestAnimal("auto");
    expect(
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = 'crestAnimal'").get(),
    ).toEqual({ value: "auto" });
    expect(await crest().getCrest(NOW)).toMatchObject({ animal: "bear", manual: false });
  });

  test("a pick never moves the stage, and going back to auto changes nothing (Guillaume, 11/10)", async () => {
    // 8 strength sessions then 32 yoga ones: a young bear, and 40 sessions in all. The old rule
    // gave a picked boar all 40 (adult).
    for (let i = 0; i < 8; i++) strength(100 - i);
    for (let i = 0; i < 32; i++) add(atDay(80 - i), { sets: [{ style: "yoga" }] });
    const stage = async () => (await crest().getCrest(NOW))?.stage;
    expect(await stage()).toBe("young");
    await prefs().setCrestAnimal("boar");
    expect(await crest().getCrest(NOW)).toMatchObject({
      animal: "boar",
      manual: true,
      stage: "young",
    });
    await prefs().setCrestAnimal("auto");
    expect(await stage()).toBe("young");
  });

  test("big feasts shown: a list, marked once, and a corrupt value reads as empty", async () => {
    expect(await prefs().getBigFeastsShown()).toEqual([]);
    await prefs().markBigFeastShown("reveal");
    await prefs().markBigFeastShown("reveal");
    expect(await prefs().getBigFeastsShown()).toEqual(["reveal"]);

    t.sqlite
      .prepare("UPDATE user_preferences SET value = '{not json' WHERE key = 'bigFeastsShown'")
      .run();
    const reportError = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await prefs().getBigFeastsShown()).toEqual([]);
    await prefs().markBigFeastShown("reveal");
    expect(await prefs().getBigFeastsShown()).toEqual(["reveal"]);
    expect(reportError).toHaveBeenCalled();
    reportError.mockRestore();
  });

  test("two marks that cross keep both ids, in one statement", async () => {
    await Promise.all([prefs().markBigFeastShown("reveal"), prefs().markBigFeastShown("age")]);
    expect((await prefs().getBigFeastsShown()).sort()).toEqual(["age", "reveal"]);

    // A stored value that is valid JSON but not a list starts over.
    t.sqlite
      .prepare("UPDATE user_preferences SET value = '{\"a\":1}' WHERE key = 'bigFeastsShown'")
      .run();
    await prefs().markBigFeastShown("reveal");
    expect(await prefs().getBigFeastsShown()).toEqual(["reveal"]);
  });

  test("marking a big feast is a single query", async () => {
    const runs = jest.spyOn(t.sqlite, "prepare");
    await prefs().markBigFeastShown("reveal");
    const touching = runs.mock.calls.filter(([q]) => String(q).includes("bigFeastsShown"));
    runs.mockRestore();
    expect(touching).toHaveLength(1);
  });
});

describe("the portrait follows the crestCoat choice", () => {
  const ships = new Set(["bear-adult-rare", "bear-adult-winter"]);
  const July = new Date(2026, 6, 15);
  const won = { longestFlame: 5 } as const;

  test("auto wears the rare coat once won, usual does not, and an unset choice is auto", async () => {
    expect(await crest().portraitOf(won, "bear", "adult", July, ships)).toBe("bear-adult-rare");
    await prefs().setCrestCoat("usual");
    expect(await crest().portraitOf(won, "bear", "adult", July, ships)).toBe("bear-adult");
    await prefs().setCrestCoat("auto");
    expect(await crest().portraitOf(won, "bear", "adult", July, ships)).toBe("bear-adult-rare");
  });

  test("usual cuts the rare and not winter; a flame short of Eternal has no rare", async () => {
    const January = new Date(2026, 0, 15);
    await prefs().setCrestCoat("usual");
    expect(await crest().portraitOf(won, "bear", "adult", January, ships)).toBe(
      "bear-adult-winter",
    );
    expect(await crest().portraitOf({ longestFlame: 4 }, "bear", "adult", July, ships)).toBe(
      "bear-adult",
    );
  });
});
