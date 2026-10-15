import assert from "node:assert/strict";

import { renderHook, waitFor } from "@testing-library/react-native";
import { clientMock, createTestDb } from "./helpers/testDb";

// The Journal's stats read on focus; here, once on mount.
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) =>
    (require("react") as typeof import("react")).useEffect(effect, []),
}));

const seconds = (d: Date) => Math.floor(d.getTime() / 1000);

// `db/chronicle` reads through `db/client`, which opens expo-sqlite at import.
const t = createTestDb();
jest.doMock("../db/client", () => clientMock(t));
afterAll(() => t.close());

const chronicle = () => require("../db/chronicle") as typeof import("../db/chronicle");

/**
 * The year's chronicle opens in December on the year so far and in January on the year just
 * finished, and not in any other month: it is a once-a-year moment, not a monthly report.
 */
describe("chronicleWindow", () => {
  test("December shows the year so far, up to now", () => {
    const now = new Date(2026, 11, 15, 9, 30);
    expect(chronicle().chronicleWindow(now)).toEqual({
      year: 2026,
      from: new Date(2026, 0, 1),
      to: now,
    });
  });

  test("January shows the whole of the year just finished", () => {
    const window = chronicle().chronicleWindow(new Date(2027, 0, 10));
    expect(window).toEqual({
      year: 2026,
      from: new Date(2026, 0, 1),
      to: new Date(new Date(2027, 0, 1).getTime() - 1),
    });
  });

  test("any other month has no chronicle", () => {
    expect(chronicle().chronicleWindow(new Date(2026, 10, 30))).toBeNull();
    expect(chronicle().chronicleWindow(new Date(2027, 1, 1))).toBeNull();
  });
});

describe("getChronicle", () => {
  beforeEach(() => {
    t.sqlite.exec(`
      DELETE FROM adventure_run_steps;
      DELETE FROM adventure_runs;
      DELETE FROM completed_exercises;
      DELETE FROM completed_sessions;
      DELETE FROM user_preferences WHERE key = 'oath';
    `);
  });

  function session(id: number, at: Date, xp = 50, outing: string | null = null, metres = 0): void {
    t.sqlite.exec(
      `INSERT INTO completed_sessions (id, performedAt, durationSeconds, xpEarned, outing, leaguesM)
       VALUES (${id}, ${seconds(at)}, 600, ${xp}, ${outing ? `'${outing}'` : "NULL"}, ${metres || "NULL"})`,
    );
  }

  function bossKill(runId: number, at: Date): void {
    const quest = t.sqlite.prepare("SELECT id FROM quests LIMIT 1").get() as { id: number };
    t.sqlite.exec(`
      INSERT OR IGNORE INTO adventures (id, questId, kind, enTitle, frTitle, bossImagePath, sortOrder)
        VALUES (950, ${quest.id}, 'boss', 'Boss', 'Boss', 'fire_dragon.webp', 0);
      INSERT INTO adventure_runs (id, adventureId, status, startedAt, finishedAt)
        VALUES (${runId}, 950, 'finished', ${seconds(at) - 86400}, ${seconds(at)});
    `);
  }

  const window2026 = () => {
    const window = chronicle().chronicleWindow(new Date(2027, 0, 10));
    assert(window);
    return window;
  };

  test("counts the year's sessions and nothing on either side of it", async () => {
    session(1, new Date(2025, 11, 31, 20));
    session(2, new Date(2026, 2, 3, 12));
    session(3, new Date(2026, 6, 14, 12), 50, "walk", 4200);
    session(4, new Date(2027, 0, 2, 12));

    const year = await chronicle().getChronicle(window2026());
    assert(year);
    expect(year.figures.quests).toBe(1);
    expect(year.figures.outings).toBe(1);
    expect(year.figures.questSeconds).toBe(600);
    expect(year.figures.leaguesM).toBe(4200);
  });

  test("counts only the bosses felled inside the year", async () => {
    session(1, new Date(2026, 5, 1, 12));
    bossKill(1, new Date(2025, 11, 20, 12));
    bossKill(2, new Date(2026, 5, 1, 12));
    bossKill(3, new Date(2026, 8, 1, 12));
    bossKill(4, new Date(2027, 0, 5, 12));

    const year = await chronicle().getChronicle(window2026());
    expect(year?.bosses).toBe(2);
  });

  test("a boss felled on the window's first second counts, one on the next year's does not", async () => {
    const { from, to } = window2026();
    session(1, new Date(2026, 5, 1, 12));
    bossKill(1, from);
    bossKill(2, new Date(Math.floor(to.getTime() / 1000) * 1000));
    bossKill(3, new Date(2027, 0, 1));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.bosses).toBe(2);
  });

  test("December's chronicle counts a boss felled on the very second it was opened", async () => {
    const now = new Date(2026, 11, 15, 9, 0, 0, 0);
    const window = chronicle().chronicleWindow(now);
    assert(window);
    session(1, new Date(2026, 11, 15, 8));
    bossKill(1, now);
    const year = await chronicle().getChronicle(window);
    expect(year?.bosses).toBe(1);
  });

  test("December's chronicle stops at now: a session later the same day is not in it", async () => {
    const window = chronicle().chronicleWindow(new Date(2026, 11, 15, 9));
    assert(window);
    session(1, new Date(2026, 11, 15, 8));
    session(2, new Date(2026, 11, 15, 18));
    const year = await chronicle().getChronicle(window);
    expect(year?.figures.quests).toBe(1);
  });

  test("the longest flame is the real flame, cut at the first of January", async () => {
    // December 2025's days are last year's and not counted, but the flame they lit is the one the
    // hero saw on the 1st: lit from the 1st (the week ending then holds seven) to the 15th (the
    // week before it holds the 2nd and the 3rd), at the default quota of two. Fifteen days, where
    // a flame rebuilt from the year's sessions alone would start dark on the 1st and give 14.
    for (let day = 20; day <= 31; day++) session(day, new Date(2025, 11, day, 12));
    for (let day = 1; day <= 3; day++) session(100 + day, new Date(2026, 0, day, 12));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.longestFlame).toBe(15);
  });

  test("the 1st of January is lit by a week two weeks back, as the hero's flame was", async () => {
    // The 19th and 20th of December fill the week that ends on the 25th, which keeps the flame lit
    // through the 1st and no further. No later session lights anything: one day.
    session(1, new Date(2025, 11, 19, 12));
    session(2, new Date(2025, 11, 20, 12));
    session(3, new Date(2026, 5, 1, 12));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.longestFlame).toBe(1);
  });

  test("the flame is measured against the hero's own oath", async () => {
    // Three sessions on the 1st to the 3rd: fourteen days at the default two a week, five at three.
    t.sqlite.exec(
      `INSERT INTO user_preferences (key, value) VALUES ('oath', '{"metric":"weekly_sessions","weeklyTarget":3}')`,
    );
    for (let day = 1; day <= 3; day++) session(day, new Date(2026, 0, day, 12));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.longestFlame).toBe(5);
  });

  test("the longest flame stops at the window's end, though the flame burns on into January", async () => {
    // Every day from the 18th to the 31st of December: lit from the 19th (two in the week), and
    // the year's count stops on the 31st, where the forgiving week would carry it to the 14th.
    for (let day = 18; day <= 31; day++) session(day, new Date(2026, 11, day, 12));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.longestFlame).toBe(13);
  });

  test("the longest flame is the year's best run, not the one still going", async () => {
    for (let day = 1; day <= 3; day++) session(day, new Date(2026, 0, day, 12));
    session(10, new Date(2026, 11, 30, 12));
    session(11, new Date(2026, 11, 31, 12));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.longestFlame).toBe(14);
  });

  test("a walk to the letterbox does not light the chronicle's flame, as it lights no other", async () => {
    // Under ten minutes of moving is a logged session and not an appearance (`countsAsSession`).
    for (let day = 1; day <= 20; day += 2) {
      t.sqlite.exec(
        `INSERT INTO completed_sessions (id, performedAt, durationSeconds, movingSeconds, xpEarned, outing)
         VALUES (${day}, ${seconds(new Date(2026, 2, day, 12))}, 300, 240, 5, 'walk')`,
      );
    }
    const year = await chronicle().getChronicle(window2026());
    assert(year);
    expect(year.figures.outings).toBe(10);
    expect(year.longestFlame).toBe(0);
  });

  test("the village tier is the one the year ended on, built by every year before it", async () => {
    const { calculateLevelFromXp } = require("../db/userLevel") as typeof import("../db/userLevel");
    const { getVillageTier } = require("../db/village") as typeof import("../db/village");
    session(1, new Date(2024, 5, 1, 12), 4_000);
    session(2, new Date(2026, 3, 1, 12), 600);
    // January's sessions belong to next year's chronicle, and to its village.
    session(3, new Date(2027, 0, 2, 12), 50_000);
    // The year's own XP crosses a tier, so neither the years before nor the year alone is enough.
    const ended = getVillageTier(calculateLevelFromXp(4_600));
    expect(ended).not.toBe(getVillageTier(calculateLevelFromXp(4_000)));
    expect(ended).not.toBe(getVillageTier(calculateLevelFromXp(600)));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.villageTier).toBe(ended);
  });

  test("starts on the first session when the hero arrived during the year", async () => {
    session(1, new Date(2026, 9, 8, 18));
    session(2, new Date(2026, 9, 9, 18));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.since).toEqual(new Date(2026, 9, 8, 18));
  });

  test("starts on the first of January for a hero who was already there", async () => {
    session(1, new Date(2025, 4, 1, 12));
    session(2, new Date(2026, 4, 1, 12));
    const year = await chronicle().getChronicle(window2026());
    expect(year?.since).toEqual(new Date(2026, 0, 1));
  });

  test("a year without a session has no chronicle", async () => {
    session(1, new Date(2025, 4, 1, 12));
    expect(await chronicle().getChronicle(window2026())).toBeNull();
  });

  test("December's last sessions, read for the flame, do not make a year of their own", async () => {
    // Inside the two weeks the flame looks back over, and outside the year: no chronicle.
    session(1, new Date(2025, 11, 25, 12));
    expect(await chronicle().getChronicle(window2026())).toBeNull();
  });

  test("a boss felled after midnight on New Year's Eve belongs to the year its session began in", async () => {
    // A session is dated by its start, a run by when it was saved: the 31st at 23:40, saved on
    // the 1st at 00:15. The session, its minutes and its XP are 2026's, so its boss is too.
    const started = new Date(2026, 11, 31, 23, 40);
    session(1, started);
    bossKill(1, new Date(2027, 0, 1, 0, 15));
    const quest = t.sqlite.prepare("SELECT id FROM quests LIMIT 1").get() as { id: number };
    t.sqlite.exec(
      `INSERT INTO adventure_run_steps (runId, stepIndex, questId, status, completedSessionId)
       VALUES (1, 0, ${quest.id}, 'completed', 1)`,
    );
    const year = await chronicle().getChronicle(window2026());
    expect(year?.figures.quests).toBe(1);
    expect(year?.bosses).toBe(1);
  });

  /** The Journal's door: open only on a year that holds a session, so it never opens on nothing. */
  describe("chronicleToOpen", () => {
    test("January opens last year's when it holds a session", async () => {
      session(1, new Date(2026, 4, 1, 12));
      expect(await chronicle().chronicleToOpen(new Date(2027, 0, 10))).toEqual(window2026());
    });

    test("a hero who skipped last year has no door, whatever came before or after", async () => {
      session(1, new Date(2025, 4, 1, 12));
      session(2, new Date(2027, 0, 5, 12));
      expect(await chronicle().chronicleToOpen(new Date(2027, 0, 10))).toBeNull();
    });

    test("no door outside December and January", async () => {
      session(1, new Date(2026, 4, 1, 12));
      expect(await chronicle().chronicleToOpen(new Date(2026, 10, 30))).toBeNull();
    });

    test("the Journal's stats carry the year to open, read by the real loader", async () => {
      session(1, new Date(2026, 4, 1, 12));
      jest.useFakeTimers({ now: new Date(2027, 0, 10), doNotFake: ["nextTick", "setImmediate"] });
      const { useJournalStats } =
        require("../components/journal/stats/useJournalStats") as typeof import("../components/journal/stats/useJournalStats");
      const { result } = await renderHook(() => useJournalStats());
      await waitFor(() => expect(result.current.stats).not.toBeNull());
      jest.useRealTimers();
      expect(result.current.stats?.chronicle).toEqual(window2026());
    });
  });
});
