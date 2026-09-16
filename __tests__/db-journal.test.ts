import assert from "node:assert/strict";

import type { AchievementProgress } from "../db/achievements";
import { clientMock, createTestDb } from "./helpers/testDb";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const seconds = (d: Date) => Math.floor(d.getTime() / 1000);

// Every suite below reads through `db/client`, which opens expo-sqlite at import: the mock has to
// be in place before the first require, pure helpers included.
const t = createTestDb();
jest.doMock("../db/client", () => clientMock(t));
afterAll(() => t.close());

const describeFlame: typeof import("../db/streaks").describeFlame = (...args) =>
  (require("../db/streaks") as typeof import("../db/streaks")).describeFlame(...args);

describe("describeFlame", () => {
  test("a rest day is lit, and says until when", () => {
    // Two sessions three and two days ago: the trailing week holds both until the older one
    // leaves it, three days from now. The forgiving clause needs both inside the *previous* week,
    // which never happens here, so the flame goes out on the fourth day.
    const flame = describeFlame([daysAgo(3), daysAgo(2)], 2);
    assert(flame.litUntil);
    expect(flame.current).toBeGreaterThan(0);
    const until = Math.round((flame.litUntil.getTime() - daysAgo(0, 0).getTime()) / DAY);
    expect(until).toBe(3);
  });

  test("the best run's end is the day it went out, not today", () => {
    const old = [daysAgo(60), daysAgo(59)];
    const flame = describeFlame(old, 2);
    expect(flame.current).toBe(0);
    expect(flame.litUntil).toBeNull();
    // Two runs of six: the week that holds both sessions, then the forgiven week after it, with
    // one dark day between. A tie keeps the later run, the one the hero remembers.
    expect(flame.best).toBe(6);
    assert(flame.bestEndedOn);
    expect(Math.round((daysAgo(0, 0).getTime() - flame.bestEndedOn.getTime()) / DAY)).toBe(47);
    expect(flame.bestIsCurrent).toBe(false);
    expect(flame.litDaysLast30).toBe(0);
  });

  test("an empty history has nothing to say", () => {
    const flame = describeFlame([], 2);
    expect(flame).toMatchObject({ current: 0, best: 0, bestEndedOn: null, litUntil: null });
  });
});

describe("db/journal pure helpers", () => {
  const journal = () => require("../db/journal") as typeof import("../db/journal");

  test("placeRun counts a tie against this run and refuses a first run", () => {
    const at = new Date();
    const rows = [
      { sessionId: 1, value: 40, at },
      { sessionId: 2, value: 55, at },
      { sessionId: 3, value: 40, at },
    ];
    expect(journal().placeRun(rows, 3, "reps")).toMatchObject({ rank: 3, outOf: 3, mine: 40 });
    expect(journal().placeRun(rows, 2, "reps")).toMatchObject({ rank: 1, values: [55, 40, 40] });
    expect(journal().placeRun([{ sessionId: 1, value: 10, at }], 1, "reps")).toBeNull();
  });

  test("pickMuscleShift names the muscle this session moved most", () => {
    const rows = [
      { sessionId: 1, muscle: "legs" as const, volume: 90 },
      { sessionId: 1, muscle: "chest" as const, volume: 10 },
      { sessionId: 2, muscle: "chest" as const, volume: 20 },
      { sessionId: 2, muscle: "legs" as const, volume: 5 },
    ];
    expect(journal().pickMuscleShift(rows, 2)).toEqual({ muscle: "chest", before: 10, after: 24 });
    expect(journal().pickMuscleShift(rows, 99)).toBeNull();
    // A first session has nothing before it to shift from.
    expect(
      journal().pickMuscleShift(
        rows.filter((r) => r.sessionId === 2),
        2,
      ),
    ).toBeNull();
  });

  test("monthWindows compares the same number of days, and never past a short month", () => {
    const mid = journal().monthWindows(new Date(2026, 8, 15, 9));
    expect(mid.previous.from).toEqual(new Date(2026, 7, 1));
    // The whole of August 15th, not August 15th at nine: the label says "same 15 days".
    expect(mid.previous.to).toEqual(new Date(new Date(2026, 7, 16).getTime() - 1));

    const end = journal().monthWindows(new Date(2026, 2, 31, 12));
    expect(end.previous.to.getMonth()).toBe(1);
    expect(end.previous.to.getDate()).toBe(28);
  });

  test("nextOnShelf skips what is already earned but not yet written", () => {
    const entry = (code: string, current: number, target: number, isUnlocked = false) =>
      ({
        code,
        isUnlocked,
        currentValue: current,
        targetValue: target,
        progress: (current / target) * 100,
      }) as unknown as AchievementProgress;
    const next = journal().nextOnShelf([
      entry("a", 10, 10),
      entry("b", 5, 7),
      entry("c", 3, 14),
      entry("d", 1, 1, true),
    ]);
    expect(next?.code).toBe("b");
  });
});

describe("db/journal", () => {
  beforeEach(() => {
    t.sqlite.exec(`
      DELETE FROM boss_damage_log;
      DELETE FROM boss_fights;
      DELETE FROM adventure_run_steps;
      DELETE FROM adventure_runs;
      DELETE FROM completed_exercises;
      DELETE FROM completed_sessions;
    `);
  });

  const journal = () => require("../db/journal") as typeof import("../db/journal");

  function exerciseId(enName: string): number {
    const row = t.sqlite
      .prepare("SELECT id FROM exercises WHERE enName = ? AND creator = 'Admin'")
      .get(enName) as { id: number } | undefined;
    assert(row);
    return row.id;
  }

  function session(id: number, at: Date, extra = ""): void {
    t.sqlite.exec(
      `INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned${extra ? `, ${extra.split("=")[0]}` : ""})
       VALUES (${id}, ${seconds(at)}, 600, 50${extra ? `, ${extra.split("=")[1]}` : ""})`,
    );
  }

  function set(sessionId: number, exercise: number, value: number, at: Date, round = 0): void {
    t.sqlite.exec(
      `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType, targetValue, performedAt)
       VALUES (${sessionId}, ${exercise}, ${round}, 0, 'reps', ${value}, 'reps', 10, ${seconds(at)})`,
    );
  }

  test("the wall dates a record by the first set that reached it, not the last", async () => {
    const pushups = exerciseId("Push-ups");
    session(1, daysAgo(20));
    set(1, pushups, 12, daysAgo(20));
    session(2, daysAgo(10));
    set(2, pushups, 24, daysAgo(10));
    session(3, daysAgo(1));
    set(3, pushups, 24, daysAgo(1));

    const [entry] = await journal().getRecordWall(4);
    assert(entry);
    expect(entry).toMatchObject({ best: 24, last: 24, seasonBest: 24 });
    expect(entry.recordAt?.getTime()).toBe(seconds(daysAgo(10)) * 1000);
    // The session the wall links to is the one that set the record, not the later equal one.
    expect(entry.recordSessionId).toBe(2);
  });

  test("the stats page's lighter reads agree with the full period figures", async () => {
    const pushups = exerciseId("Push-ups");
    session(1, daysAgo(40), "hasNewRecords=1");
    set(1, pushups, 12, daysAgo(40));
    session(2, daysAgo(3));
    set(2, pushups, 9, daysAgo(3));
    const now = new Date();
    const all = await journal().getPeriodFigures(null, now);
    expect(await journal().periodReps(null, now)).toBe(all.reps);
    expect(await journal().periodReps(daysAgo(30), now)).toBe(9);
    expect(await journal().getLatestRecord(now)).toEqual(all.latestRecord);
  });

  test("a session's rung is the step getNextProgression builds, closest to earned first", async () => {
    const climbable = t.sqlite
      .prepare(
        `SELECT e.id FROM exercises e WHERE e.creator = 'Admin'
         AND EXISTS (SELECT 1 FROM exercises n WHERE n.prerequisiteExerciseId = e.id)
         ORDER BY e.id LIMIT 2`,
      )
      .all() as { id: number }[];
    const [low, high] = climbable.map((r) => r.id);
    assert(low && high);
    // `high` is met in the last two sessions in a row, `low` in one: the rung shown is `high`'s.
    for (const [id, day, value] of [
      [1, 5, 12],
      [2, 3, 12],
      [3, 1, 12],
    ] as const) {
      session(id, daysAgo(day));
      set(id, high, id === 1 ? 4 : value, daysAgo(day));
      if (id === 3) set(id, low, value, daysAgo(day), 1);
    }
    const { getCompletedSessionById } =
      require("../db/completed") as typeof import("../db/completed");
    const { getNextProgression } = require("../db/exercises") as typeof import("../db/exercises");
    const last = await getCompletedSessionById(3);
    assert(last);
    const rung = await journal().getSessionRung(last);
    const step = await getNextProgression(high);
    assert(step);
    // The exercise page's step also carries the fork it opens (`alsoNext`); the quest log names
    // one rung and has no room for it. Every other field has to agree, which is the point here.
    const { alsoNext: _, ...common } = step;
    expect(rung).toEqual(common);
    expect(rung?.metTarget).toBe(2);
  });

  test("the wall keeps the season's best beside an old record", async () => {
    const squat = exerciseId("Squat");
    session(1, daysAgo(400));
    set(1, squat, 40, daysAgo(400));
    session(2, daysAgo(20));
    set(2, squat, 18, daysAgo(20));
    session(3, daysAgo(2));
    set(3, squat, 15, daysAgo(2));
    const [entry] = await journal().getRecordWall(4);
    expect(entry).toMatchObject({ best: 40, last: 15, seasonBest: 18 });
  });

  test("the history reads a page at a time, newest first", async () => {
    for (let i = 1; i <= 5; i++) session(i, daysAgo(i));
    const { listCompletedSessions } =
      require("../db/completed") as typeof import("../db/completed");
    const first = await listCompletedSessions(2, 0);
    const second = await listCompletedSessions(2, 2);
    expect(first.map((r) => r.id)).toEqual([1, 2]);
    expect(second.map((r) => r.id)).toEqual([3, 4]);
  });

  test("the Journal version moves with a new session and with bonus XP, and holds otherwise", async () => {
    session(1, daysAgo(3));
    const before = await journal().getJournalVersion();
    expect(await journal().getJournalVersion()).toBe(before);
    session(2, daysAgo(1));
    const added = await journal().getJournalVersion();
    expect(added).not.toBe(before);
    t.sqlite.exec("UPDATE completed_sessions SET xpEarned = xpEarned + 5 WHERE id = 1");
    expect(await journal().getJournalVersion()).not.toBe(added);
  });

  test("the starter wall is the first quest's own movements, never logged", async () => {
    const expected = t.sqlite
      .prepare(
        `SELECT DISTINCT e.enName FROM quest_exercises qe
         JOIN quests q ON q.id = qe.questId JOIN exercises e ON e.id = qe.exerciseId
         WHERE q.enTitle = 'The Squire''s Awakening' AND q.author = 'Admin' ORDER BY qe.sortOrder`,
      )
      .all() as { enName: string }[];
    const wall = await journal().getStarterWall();
    expect(wall.length).toBeGreaterThan(0);
    expect(wall.map((w) => w.name.en)).toEqual(expected.slice(0, 4).map((r) => r.enName));
    expect(wall.every((w) => w.best === null)).toBe(true);
  });

  test("period figures count a held second as a third of a rep, and outings apart", async () => {
    const plank = exerciseId("Plank");
    session(1, daysAgo(2));
    t.sqlite.exec(
      `INSERT INTO completed_exercises (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
       VALUES (1, ${plank}, 0, 0, 'time', 60, ${seconds(daysAgo(2))})`,
    );
    session(2, daysAgo(1), "outing='walk'");
    t.sqlite.exec("UPDATE completed_sessions SET leaguesM = 5200 WHERE id = 2");

    const figures = await journal().getPeriodFigures(daysAgo(5), new Date());
    expect(figures).toMatchObject({
      quests: 1,
      outings: 1,
      reps: 20,
      questSeconds: 600,
      timedQuests: 1,
      outingSeconds: 600,
      leaguesM: 5200,
      xp: 100,
    });

    const days = await journal().getActivityDays(daysAgo(5), new Date());
    expect([...days.values()].sort()).toEqual(["outing", "quest"]);
    session(3, daysAgo(1, 8));
    const mixed = await journal().getActivityDays(daysAgo(5), new Date());
    expect([...mixed.values()].sort()).toEqual(["both", "quest"]);
  });

  test("a boss report names the last blow, its round and the health it took", async () => {
    const pushups = exerciseId("Push-ups");
    const squat = exerciseId("Squat");
    const quest = t.sqlite.prepare("SELECT id FROM quests LIMIT 1").get() as { id: number };
    t.sqlite.exec(`
      INSERT INTO adventures (id, questId, kind, enTitle, frTitle, sortOrder) VALUES (900, ${quest.id}, 'boss', 'The Golem', 'Le Golem', 0);
      INSERT INTO adventure_runs (id, adventureId, status, startedAt, finishedAt) VALUES (1, 900, 'finished', ${seconds(daysAgo(9))}, ${seconds(daysAgo(1))});
      INSERT INTO boss_fights (id, adventureId, totalHp, currentHp, defeatedAt) VALUES (1, 900, 100, 0, ${seconds(daysAgo(1))});
    `);
    session(10, daysAgo(5));
    session(11, daysAgo(1));
    set(11, squat, 12, daysAgo(1), 0);
    set(11, pushups, 21, daysAgo(1), 2);
    t.sqlite.exec(`
      INSERT INTO adventure_run_steps (runId, stepIndex, questId, status, completedSessionId) VALUES
        (1, 0, ${quest.id}, 'completed', 10), (1, 1, ${quest.id}, 'completed', 11);
      INSERT INTO boss_damage_log (bossFightId, completedSessionId, exerciseId, damageDealt, roundIndex) VALUES
        (1, 10, ${squat}, 60, 0), (1, 11, ${squat}, 22, 0), (1, 11, ${pushups}, 18, 2);
    `);

    const { getCompletedSessionById } =
      require("../db/completed") as typeof import("../db/completed");
    const killing = await getCompletedSessionById(11);
    assert(killing);
    const report = await journal().getKillReport(killing);
    assert(report);
    expect(report.pool).toBe(100);
    expect(report.steps).toBe(2);
    expect(report.lastBlow).toMatchObject({ value: 21, roundIndex: 2, healthBefore: 18 });
    expect(report.hurt.map((h) => h.damage)).toEqual([82, 18]);

    const earlier = await getCompletedSessionById(10);
    assert(earlier);
    expect(await journal().getKillReport(earlier)).toBeNull();

    const kills = await journal().getBossKills();
    expect(kills).toHaveLength(1);
    expect(kills[0]?.sessionId).toBe(11);
  });
});
