import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * A session the hero writes down (lot past-session). The rules of the brief, one by one: the flame
 * and the oath see it; the boss, the records, the objectives, the progression and the adventure do
 * not; the XP is the XP of fifteen minutes, fixed at the save.
 */
const mockClearDay = jest.fn();

describe("a session written down", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
    // The reminders reach the native module and the router; a write-down only needs them asked.
    jest.doMock("../src/reminders", () => ({
      replanRemindersNow: jest.fn(() => Promise.resolve()),
    }));
    jest.doMock("../modules/bati-reminders", () => ({ clearDay: mockClearDay }));
    jest.doMock("../src/widget", () => ({
      requestWidgetsUpdate: jest.fn(() => Promise.resolve()),
    }));
  });

  afterAll(() => t.close());

  beforeEach(() => {
    for (const table of [
      "completed_exercises",
      "completed_sessions",
      "boss_damage_log",
      "user_preferences",
      "unlocked_achievements",
    ]) {
      try {
        t.sqlite.exec(`DELETE FROM ${table}`);
      } catch {
        // a table this schema does not have
      }
    }
    // The journal starts with a first measured session: nothing is noted before it.
    measured(60);
  });

  const hand = () => require("../db/handEntries") as typeof import("../db/handEntries");
  const completed = () => require("../db/completed") as typeof import("../db/completed");

  /** Noon, `daysAgo` days back. */
  function noon(daysAgo: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  const entry = (over: Record<string, unknown> = {}) => ({
    kind: "workout" as const,
    endedAt: noon(1),
    durationSeconds: 45 * 60,
    distanceM: null,
    label: null,
    ...over,
  });

  function row(id: number) {
    return t.sqlite.prepare("SELECT * FROM completed_sessions WHERE id = ?").get(id) as Record<
      string,
      unknown
    >;
  }

  /** Takes the seeded first session out again, for a test that counts what it wrote or sees. */
  function dropFirstSession() {
    t.sqlite
      .prepare("DELETE FROM completed_sessions WHERE byHand IS NULL AND performedAt < ?")
      .run(Math.floor(noon(50).getTime() / 1000));
  }

  function measured(daysAgo: number, over: Record<string, unknown> = {}): number {
    const at = Math.floor(noon(daysAgo).getTime() / 1000);
    const info = t.sqlite
      .prepare(
        `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, durationSeconds, outing,
           leaguesM, movingSeconds)
         VALUES ('medium', 100, ?, ?, ?, ?, ?)`,
      )
      .run(
        at,
        (over.durationSeconds as number | undefined) ?? 1800,
        (over.outing as string | null | undefined) ?? null,
        (over.leaguesM as number | null | undefined) ?? null,
        (over.movingSeconds as number | null | undefined) ?? null,
      );
    return Number(info.lastInsertRowid);
  }

  describe("what it writes", () => {
    test("pays 75 XP for every type and every duration, with no exercise and no boss hit", async () => {
      for (const [i, kind] of (["workout", "run", "ride"] as const).entries()) {
        const res = await hand().createHandEntry(
          entry({ kind, endedAt: noon(i + 1), durationSeconds: (i === 2 ? 90 : 20) * 60 }),
        );
        if (!res.ok) throw new Error(`refused: ${res.refusal.key}`);
        expect(res.xp).toBe(75);
        expect(row(res.id)).toMatchObject({
          xpEarned: 75,
          byHand: "session",
          questId: null,
          movingSeconds: null,
          outing: kind === "workout" ? null : kind,
        });
      }
      expect(t.sqlite.prepare("SELECT COUNT(*) n FROM completed_exercises").get()).toEqual({
        n: 0,
      });
      expect(t.sqlite.prepare("SELECT COUNT(*) n FROM boss_damage_log").get()).toEqual({ n: 0 });
    });

    test("takes the reminder of the saved day out of the shade, not only today's", async () => {
      mockClearDay.mockClear();
      const end = noon(2);
      const res = await hand().createHandEntry(entry({ endedAt: end }));
      expect(res.ok).toBe(true);
      const { dayKey } = require("../db/dates") as typeof import("../db/dates");
      expect(mockClearDay).toHaveBeenCalledWith(dayKey(new Date(end.getTime() - 45 * 60_000)));
    });

    test("performedAt is the end minus the duration; the label and the distance are kept", async () => {
      const end = noon(2);
      const res = await hand().createHandEntry(
        entry({ kind: "walk", endedAt: end, durationSeconds: 3600, distanceM: 4200, label: null }),
      );
      if (!res.ok) throw new Error("refused");
      expect(row(res.id).performedAt).toBe(Math.floor(end.getTime() / 1000) - 3600);
      expect(row(res.id).leaguesM).toBe(4200);
      expect(row(res.id).tzOffsetMin).toBe(
        0 - new Date(end.getTime() - 3600_000).getTimezoneOffset(),
      );

      const named = await hand().createHandEntry(entry({ endedAt: noon(3), label: "  salle " }));
      if (!named.ok) throw new Error("refused");
      expect(row(named.id).label).toBe("salle");
    });

    test("a workout entry keeps no distance", async () => {
      const res = await hand().createHandEntry(entry({ distanceM: 5000 }));
      if (!res.ok) throw new Error("refused");
      expect(row(res.id).leaguesM).toBeNull();
    });
  });

  describe("the rules of the game", () => {
    test("nothing is noted before the first measured session, a correction cannot move one there", async () => {
      dropFirstSession();
      measured(3);
      const before = await hand().createHandEntry(entry({ endedAt: noon(5) }));
      expect(before).toMatchObject({ ok: false, refusal: { key: "before_first" } });
      const ok = await hand().createHandEntry(entry({ endedAt: noon(2) }));
      if (!ok.ok) throw new Error("refused");
      const moved = await hand().correctHandEntry(ok.id, entry({ endedAt: noon(6) }));
      expect(moved).toMatchObject({ ok: false, refusal: { key: "before_first" } });
    });

    test("the day of the first session itself is accepted", async () => {
      dropFirstSession();
      measured(2);
      const res = await hand().createHandEntry(entry({ endedAt: noon(2) }));
      expect(res.ok).toBe(true);
    });

    test("the fourth entry in the window is noted at 0 XP, and still lights the flame", async () => {
      const results = [];
      for (const back of [1, 2, 3, 4]) {
        results.push(await hand().createHandEntry(entry({ endedAt: noon(back) })));
      }
      const xps = results.map((r) => (r.ok ? r.xp : -1));
      expect(xps).toEqual([75, 75, 75, 0]);
      const last = results[3];
      if (!last?.ok) throw new Error("refused");
      expect(row(last.id).xpEarned).toBe(0);
      expect(row(last.id).byHand).toBe("session");
      // The flame counts it like the paid ones: it sits in the flame's week with the three paid.
      expect(
        (await require("../db/streaks").calculateAndCacheStreak()).inWindow,
      ).toBeGreaterThanOrEqual(4);
    });

    test("an entry older than the window does not use up the three", async () => {
      // Seven days back is inside, so this one pays; an entry paid 8 days ago (hand-seeded) is not counted.
      t.sqlite
        .prepare(
          `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, durationSeconds, byHand)
           VALUES ('medium', 75, ?, 1800, 'session')`,
        )
        .run(Math.floor(noon(9).getTime() / 1000));
      const ctx = await hand().loadHandContext(null, new Date());
      expect(ctx.paidInWindow).toBe(0);
    });
  });

  describe("what it keeps alive", () => {
    test("the flame and the count of sessions read it like any other session", async () => {
      const before = await completed().countSessions();
      const res = await hand().createHandEntry(entry());
      if (!res.ok) throw new Error("refused");
      expect(await completed().countSessions()).toBe(before + 1);

      const streaks = require("../db/streaks") as typeof import("../db/streaks");
      const info = await streaks.calculateAndCacheStreak();
      expect(info.lastWorkoutDate).toBe(
        require("../db/dates").dayKey(new Date(noon(1).getTime() - 45 * 60_000)),
      );
      expect(info.inWindow).toBe(1);
    });

    test("an oath of sessions is kept by it and pays its bonus on the row: 75 + 250", async () => {
      const oaths = require("../db/oaths") as typeof import("../db/oaths");
      await oaths.swearOath({ metric: "sessions", target: 1 });
      const res = await hand().createHandEntry(entry());
      if (!res.ok) throw new Error("refused");
      expect(res.oathKept).toBe(true);
      expect(res.xp).toBe(325);
      expect(row(res.id).xpEarned).toBe(325);
    });

    test("the toast tells whether the flame is lit after the write", async () => {
      const res = await hand().createHandEntry(entry());
      if (!res.ok) throw new Error("refused");
      // One session in the week against the default quota of two: noted, not yet lit.
      expect(res.flameActive).toBe(false);
      const second = await hand().createHandEntry(entry({ endedAt: noon(2) }));
      if (!second.ok) throw new Error("refused");
      expect(second.flameActive).toBe(true);
    });

    test("a hand-written walk's distance feeds the road and the leagues oath", async () => {
      const gps = require("../db/gps") as typeof import("../db/gps");
      const res = await hand().createHandEntry(
        entry({ kind: "walk", durationSeconds: 3600, distanceM: 4000 }),
      );
      if (!res.ok) throw new Error("refused");
      expect(await gps.totalLeaguesM()).toBe(4000);
    });
  });

  describe("what it never touches", () => {
    test("it is not a workout: aggregates, history, rest and the suggestion pool skip it", async () => {
      const real = measured(5);
      await hand().createHandEntry(entry());
      dropFirstSession();
      const agg = await completed().getSessionAggregates();
      expect(agg.totalSessions).toBe(1);
      expect((await completed().getRecentSessionHistory()).map((s) => s.id)).toEqual([real]);
      expect(await completed().workoutsBeforeToday()).toBe(1);
    });

    test("no record, no best, no first-outing badge", async () => {
      await hand().createHandEntry(entry({ durationSeconds: 4 * 3600 }));
      await hand().createHandEntry(
        entry({ kind: "walk", endedAt: noon(2), durationSeconds: 3600, distanceM: 6000 }),
      );
      dropFirstSession();
      const journal = require("../db/journal") as typeof import("../db/journal");
      const bests = await journal.getSessionBests();
      expect(bests.longest).toBeNull();
      expect(bests.mostXp).toBeNull();
      expect(bests.longestOuting).toBeNull();

      const real = measured(6, { outing: "walk", leaguesM: 1000, movingSeconds: 900 });
      const rec = require("../db/personalRecords") as typeof import("../db/personalRecords");
      const records = await rec.checkForNewRecords(real);
      // The 6 km typed above is not the bar the measured 1 km walk has to clear.
      expect(records.some((r: { recordType: string }) => r.recordType === "longest_outing")).toBe(
        true,
      );
    });

    test("it adds no seconds to the day's outing decay", async () => {
      const today = new Date();
      today.setHours(0, 0, 1, 0);
      const at = Math.floor(today.getTime() / 1000);
      const insert = t.sqlite.prepare(
        `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, durationSeconds, outing, byHand)
         VALUES ('medium', 75, ?, ?, 'walk', ?)`,
      );
      insert.run(at, 3600, "session");
      insert.run(at + 1, 1200, null);
      expect(await completed().outingSecondsToday(null)).toBe(1200);
    });

    test("it is out of the period figures' quests, reps and outings but in its XP", async () => {
      await hand().createHandEntry(entry({ endedAt: noon(1) }));
      const journal = require("../db/journal") as typeof import("../db/journal");
      const figures = await journal.getPeriodFigures(noon(3), new Date());
      expect(figures.quests).toBe(0);
      expect(figures.outings).toBe(0);
      expect(figures.xp).toBe(75);
    });

    test("no achievement of count, hour or length unlocks, even at 06:00 for two hours", async () => {
      dropFirstSession();
      measured(8, { outing: "walk", durationSeconds: 600 }); // 100 XP already: the badge of XP below proves the check ran
      const res = await hand().createHandEntry(
        entry({
          endedAt: (() => {
            const d = noon(1);
            d.setHours(7, 0, 0, 0);
            return d;
          })(),
          durationSeconds: 2 * 3600,
        }),
      );
      if (!res.ok) throw new Error("refused");
      const unlocked = t.sqlite
        .prepare("SELECT value FROM user_preferences WHERE key LIKE '%achievement%'")
        .all() as { value: string }[];
      const text = JSON.stringify(unlocked);
      expect(text).toContain("xp_100");
      for (const code of [
        "first_workout",
        "sessions_10",
        "early_bird",
        "night_owl",
        "long_session_30min",
        "long_session_60min",
        "first_outing",
        "hour_outside",
      ]) {
        expect(text).not.toContain(code);
      }
    });
  });

  describe("the refusals, at the writer", () => {
    test("2: one per day, any type, and the entry corrected is left out", async () => {
      const first = await hand().createHandEntry(entry());
      if (!first.ok) throw new Error("refused");
      const again = await hand().createHandEntry(entry({ kind: "walk" }));
      expect(again).toMatchObject({ ok: false, refusal: { key: "one_per_day" } });
      const same = await hand().correctHandEntry(first.id, entry({ label: "foot" }));
      expect(same.ok).toBe(true);
    });

    test("4: a measured session in the way is named, and nothing is written", async () => {
      dropFirstSession();
      const id = measured(1, { durationSeconds: 3600 });
      const res = await hand().createHandEntry(
        entry({ endedAt: new Date(noon(1).getTime() + 30 * 60_000) }),
      );
      expect(res).toMatchObject({ ok: false, refusal: { key: "overlap", with: { id } } });
      expect(t.sqlite.prepare("SELECT COUNT(*) n FROM completed_sessions").get()).toEqual({ n: 1 });
    });

    test("5: an implausible distance is refused, with the fix", async () => {
      const res = await hand().createHandEntry(
        entry({ kind: "run", durationSeconds: 30 * 60, distanceM: 12_000 }),
      );
      expect(res).toMatchObject({ ok: false, refusal: { key: "implausible", fixM: 1200 } });
    });

    test("1 and 3 reach the writer too", async () => {
      expect(await hand().createHandEntry(entry({ endedAt: noon(9) }))).toMatchObject({
        refusal: { key: "too_old" },
      });
      expect(await hand().createHandEntry(entry({ durationSeconds: 300 }))).toMatchObject({
        refusal: { key: "duration" },
      });
    });
  });

  describe("correcting and deleting", () => {
    test("a correction keeps the XP, stamps the edit and recomputes the offset", async () => {
      const res = await hand().createHandEntry(entry());
      if (!res.ok) throw new Error("refused");
      const fixed = await hand().correctHandEntry(
        res.id,
        entry({ kind: "run", endedAt: noon(2), durationSeconds: 90 * 60, label: null }),
      );
      expect(fixed.ok).toBe(true);
      const after = row(res.id);
      expect(after.xpEarned).toBe(75);
      expect(after.outing).toBe("run");
      expect(after.byHandEditedAt).toEqual(expect.any(Number));
      expect(after.performedAt).toBe(Math.floor(noon(2).getTime() / 1000) - 90 * 60);
    });

    test("deleting takes the flame and the count with it", async () => {
      const res = await hand().createHandEntry(entry());
      if (!res.ok) throw new Error("refused");
      expect(await completed().deleteSession(res.id)).toBe("deleted");
      dropFirstSession();
      expect(await completed().countSessions()).toBe(0);
    });

    test("only a hand-written row can be corrected", async () => {
      const id = measured(1);
      await expect(hand().correctHandEntry(id, entry())).rejects.toThrow();
    });
  });

  describe("an outing whose distance is typed afterwards", () => {
    test("writes leaguesM and 'distance', leaves the XP, and removing it puts the row back", async () => {
      const id = measured(1, { outing: "walk", durationSeconds: 2520 });
      const xpBefore = row(id).xpEarned;
      expect(await hand().setHandDistance(id, 3800)).toMatchObject({ ok: true });
      expect(row(id)).toMatchObject({ leaguesM: 3800, byHand: "distance", xpEarned: xpBefore });
      expect(row(id).byHandEditedAt).toEqual(expect.any(Number));

      expect(await hand().setHandDistance(id, null)).toMatchObject({ ok: true });
      expect(row(id)).toMatchObject({ leaguesM: null, byHand: null });
    });

    test("is refused when the speed is implausible, in the unit of the type", async () => {
      const id = measured(1, { outing: "walk", durationSeconds: 1800 });
      expect(await hand().setHandDistance(id, 9000)).toMatchObject({
        ok: false,
        refusal: { key: "implausible", fixM: 900 },
      });
      expect(row(id).leaguesM).toBeNull();
    });

    test("is no record, and the measured walk beside it stays the longest", async () => {
      const id = measured(1, { outing: "walk", durationSeconds: 3600 });
      await hand().setHandDistance(id, 7000);
      const journal = require("../db/journal") as typeof import("../db/journal");
      expect((await journal.getSessionBests()).longestOuting).toBeNull();
    });
  });

  describe("the time with no witness is paid up to two hours a day", () => {
    test("counts outings with no moving time and not the ones written down", async () => {
      const today = new Date();
      today.setHours(0, 0, 1, 0);
      const insert = t.sqlite.prepare(
        `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt, durationSeconds, outing,
           movingSeconds, byHand) VALUES ('medium', 0, ?, ?, ?, ?, ?)`,
      );
      const at = Math.floor(today.getTime() / 1000);
      insert.run(at, 3600, "walk", null, null); // no GPS: counts
      insert.run(at + 1, 1800, "walk", null, "distance"); // no GPS, distance typed: counts
      insert.run(at + 2, 3000, "walk", 3000, null); // witnessed: does not
      insert.run(at + 3, 5400, "walk", null, "session"); // written down: does not
      expect(await completed().untracedSecondsToday(null)).toBe(5400);
    });
  });

  describe("the page that opens it", () => {
    test("reads for a workout and an outing written down, with nothing to rank, fell or draw", async () => {
      const { readSession } =
        require("../components/journal/sessionLog") as typeof import("../components/journal/sessionLog");
      const t = ((key: string) => key) as never;
      const walk = await hand().createHandEntry(
        entry({ kind: "walk", endedAt: noon(2), durationSeconds: 3600, distanceM: 4000 }),
      );
      const gym = await hand().createHandEntry(entry({ label: "gym" }));
      if (!walk.ok || !gym.ok) throw new Error("refused");
      for (const id of [walk.id, gym.id]) {
        const loaded = await readSession(id, "en", t);
        if (loaded.status !== "ready") throw new Error("not ready");
        expect(loaded.kill).toBeNull();
        expect(loaded.log.records).toEqual([]);
        expect(loaded.log.standing).toBeNull();
        expect(loaded.log.trace).toEqual([]);
        expect(loaded.log.session.byHand).toBe("session");
      }
    });
  });

  describe("the oath, on a write that is not a creation", () => {
    test("a distance typed afterwards that tips the oath pays its bonus onto the row", async () => {
      const oaths = require("../db/oaths") as typeof import("../db/oaths");
      await oaths.swearOath({ metric: "leagues", target: 1 });
      const id = measured(1, { outing: "walk", durationSeconds: 3 * 3600 });
      const xpBefore = Number(row(id).xpEarned);
      const res = await hand().setHandDistance(id, 12000);
      if (!res.ok) throw new Error("refused");
      expect(res.oathKept).toBe(true);
      expect(row(id).xpEarned).toBe(xpBefore + 250);
      expect(res.xp).toBe(xpBefore + 250);
    });
  });

  describe("the outing ranking", () => {
    test("a typed distance neither ranks nor is ranked", async () => {
      const journal = require("../db/journal") as typeof import("../db/journal");
      const real = measured(3, { outing: "walk", leaguesM: 2000, movingSeconds: 900 });
      const typed = measured(2, { outing: "walk", durationSeconds: 2520 });
      await hand().setHandDistance(typed, 9000);
      const get = async (id: number) => {
        const session = await completed().getCompletedSessionById(id);
        if (!session) throw new Error("missing");
        return session;
      };
      expect(await journal.getQuestStanding(await get(typed))).toBeNull();
      // Alone among the measured ones: the typed 9 km does not put it second.
      expect(await journal.getQuestStanding(await get(real))).toBeNull();
    });
  });

  describe("the reminder", () => {
    test("a hand-written entry of any type silences its day; a walk still does not", () => {
      const rem = require("../db/reminders") as typeof import("../db/reminders");
      const base = { movingSeconds: null, durationSeconds: 1800, performedAt: new Date() };
      expect(rem.trainedOn({ ...base, outing: null, byHand: null })).toBe(true);
      expect(rem.trainedOn({ ...base, outing: "walk", byHand: null })).toBe(false);
      expect(rem.trainedOn({ ...base, outing: "walk", byHand: "session" })).toBe(true);
      // A distance typed on a no-GPS outing is not the answer to the reminder.
      expect(rem.trainedOn({ ...base, outing: "walk", byHand: "distance" })).toBe(false);
      expect(rem.isWorkoutRow({ outing: null, byHand: "session" })).toBe(false);
    });
  });
});
