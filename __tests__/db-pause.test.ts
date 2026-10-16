import { addDays, addWeeks, startOfDay } from "date-fns";
import { dayKey } from "../db/dates";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * M-04, "Pause et zone ménagée": the two things a hero says when their body or their life asks for
 * room. Run on a real database because each rule is a join between the list, the ladder and the
 * journal, and a stub of any one of them is the rule this file exists to watch drift.
 */
describe("pause and zone", () => {
  const t = createTestDb();
  // Epoch ms the module under test reads as "now", moved per test.
  let nowMs = Date.now();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });
  beforeEach(async () => {
    nowMs = Date.now();
    jest.spyOn(Date, "now").mockImplementation(() => nowMs);
    const before = await exercises().unavailableExerciseIds();
    const rows = t.sqlite
      .prepare(
        "SELECT e.id, e.enName FROM exercises e JOIN exercise_muscles m ON m.exerciseId = e.id WHERE m.muscle = 'shoulder' AND e.creator = 'Admin'",
      )
      .all() as { id: number; enName: string }[];
    const found = rows.find((r) => !before.has(r.id));
    if (!found) throw new Error("no free shoulder movement in the seed");
    free = found;
    freeIsWarmedUp = !(await exercises().unavailableMovements()).has(found.enName);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    t.sqlite.exec("DELETE FROM completed_exercises");
    t.sqlite.exec("DELETE FROM completed_sessions");
    t.sqlite.exec("DELETE FROM user_preferences");
    quests().invalidateQuestTemplates();
  });
  afterAll(() => t.close());

  const quests = () => require("../db/quests") as typeof import("../db/quests");
  const pause = () => require("../db/pause") as typeof import("../db/pause");
  const setAside = () => require("../db/setAside") as typeof import("../db/setAside");
  const prefs = () =>
    (require("../db/preferences") as typeof import("../db/preferences")).preferences;
  const exercises = () => require("../db/exercises") as typeof import("../db/exercises");
  const oaths = () => require("../db/oaths") as typeof import("../db/oaths");
  const streaks = () => require("../db/streaks") as typeof import("../db/streaks");

  const idOf = (enName: string): number =>
    (
      t.sqlite
        .prepare("SELECT id FROM exercises WHERE enName = ? AND creator = 'Admin'")
        .get(enName) as { id: number }
    ).id;
  const questIdOf = (enTitle: string): number =>
    (t.sqlite.prepare("SELECT id FROM quests WHERE enTitle = ?").get(enTitle) as { id: number }).id;

  async function servedNames(title: string): Promise<string[]> {
    const quest = await quests().getQuestById(questIdOf(title), "medium");
    return (quest?.exercises ?? []).map((q) => q.exercise.enName);
  }

  const at = () => new Date(nowMs);
  const startZoneAt = (
    groups: Parameters<ReturnType<typeof pause>["startZone"]>[0],
    weeks: number,
  ) => pause().startZone(groups, weeks, at());
  /**
   * A shoulder movement nothing else holds back (no rung to reach, no kit), so the list is the only
   * thing that can make it unavailable. Picked once, before any zone, and named by the tests.
   */
  let free: { id: number; enName: string };
  let freeIsWarmedUp = false;
  const PRESSES = /push-up|dip/i;

  describe("a zone", () => {
    test("shoulders for two weeks serve no push-up and no dip, whichever quest asks", async () => {
      expect((await servedNames("Knight Push")).some((n) => PRESSES.test(n))).toBe(true);
      expect((await exercises().unavailableExerciseIds()).has(free.id)).toBe(false);

      await startZoneAt(["shoulder"], 2);

      for (const title of ["Knight Push", "Forge the Dragon Blade", "Raise the Shelter"]) {
        expect((await servedNames(title)).filter((n) => PRESSES.test(n))).toEqual([]);
      }
      // The warm-up reads the same list. `free` has no rung to reach, so only the zone can hold it.
      expect((await exercises().unavailableExerciseIds()).has(free.id)).toBe(true);
      expect((await exercises().unavailableMovements()).has(free.enName)).toBe(true);
    });

    test("what the zone sets aside says so, and until when", async () => {
      const zone = await startZoneAt(["shoulder"], 2);
      const end = startOfDay(addWeeks(new Date(nowMs), 2)).getTime();
      const entry = (await prefs().getSetAsideExercises()).find((e) => e.id === idOf("Push-ups"));
      expect(entry).toMatchObject({ reason: "zone", until: end });
      expect(zone.until).toBe(dayKey(new Date(end)));
    });

    test("at the end date the exercises come back, with no gesture", async () => {
      await startZoneAt(["shoulder"], 2);
      const end = startOfDay(addWeeks(new Date(nowMs), 2)).getTime();

      nowMs = end - 1;
      expect((await prefs().getSetAsideExercises()).length).toBeGreaterThan(0);

      nowMs = end;
      expect(await prefs().getSetAsideExercises()).toEqual([]);
      expect((await servedNames("Knight Push")).some((n) => PRESSES.test(n))).toBe(true);
      expect((await exercises().unavailableExerciseIds()).has(free.id)).toBe(false);
      // Whatever the warm-up did with it before the zone, it does again after.
      expect((await exercises().unavailableMovements()).has(free.enName)).toBe(!freeIsWarmedUp);
      expect(await pause().getZone(at())).toBeNull();
    });

    test("an exercise set aside by hand before the zone stays aside after it", async () => {
      await setAside().setExerciseAside(idOf("Push-ups"), nowMs - 1000);
      await startZoneAt(["shoulder"], 2);
      expect((await prefs().getSetAsideExercises()).find((e) => e.id === idOf("Push-ups"))).toEqual(
        { id: idOf("Push-ups"), at: nowMs - 1000 },
      );

      nowMs = startOfDay(addWeeks(new Date(nowMs), 3)).getTime();
      const left = await prefs().getSetAsideExercises();
      expect(left.map((e) => e.id)).toEqual([idOf("Push-ups")]);
    });

    test("ending the zone early gives back what it took, and only that", async () => {
      await setAside().setExerciseAside(idOf("Push-ups"));
      await startZoneAt(["shoulder"], 4);
      await pause().endZone(at());
      expect((await prefs().getSetAsideExercises()).map((e) => e.id)).toEqual([idOf("Push-ups")]);
    });

    test("setting an exercise aside by hand during a zone makes it the hero's", async () => {
      await startZoneAt(["shoulder"], 1);
      await setAside().setExerciseAside(idOf("Dip"));
      nowMs = startOfDay(addWeeks(new Date(nowMs), 2)).getTime();
      expect((await prefs().getSetAsideExercises()).map((e) => e.id)).toEqual([idOf("Dip")]);
    });

    test("one or two groups and one to eight weeks, nothing else", async () => {
      await expect(startZoneAt([], 2)).rejects.toThrow();
      await expect(startZoneAt(["arms", "back", "abs"], 2)).rejects.toThrow();
      await expect(startZoneAt(["arms"], 0)).rejects.toThrow();
      await expect(startZoneAt(["arms"], 9)).rejects.toThrow();
      expect(await prefs().getSetAsideExercises()).toEqual([]);
    });

    test("the flame is not touched: a zone moves no day of it", async () => {
      const day = (n: number) => new Date(2026, 0, 1 + n, 12);
      const flame = (now: number) => streaks().describeFlame([0, 1, 6, 7].map(day), 2, day(now));
      const before = flame(10);
      await startZoneAt(["legs"], 2);
      expect(flame(10)).toEqual(before);
      expect(await pause().getActivePause(at())).toBeNull();
    });
  });

  describe("an oath", () => {
    const oathOn = (exercise: string) => ({
      metric: "exercise_pr" as const,
      exerciseId: idOf(exercise),
      target: 20,
      swornAt: new Date().toISOString(),
      fulfilledAt: null,
    });

    test("freezes during a zone only if its exercise works it", async () => {
      await startZoneAt(["shoulder"], 2);
      expect(await oaths().isOathFrozen(oathOn("Push-ups"), at())).toBe(true);
      expect(await oaths().isOathFrozen(oathOn("Squat"), at())).toBe(false);
    });

    test("freezes for any exercise during a pause, and thaws on the return date", async () => {
      const back = dayKey(addDays(new Date(nowMs), 10));
      await pause().startPause(back, at());
      expect(await oaths().isOathFrozen(oathOn("Squat"), at())).toBe(true);
      nowMs = addDays(new Date(nowMs), 10).getTime();
      expect(await oaths().isOathFrozen(oathOn("Squat"), at())).toBe(false);
    });
  });

  describe("a pause", () => {
    test("goes at most eight weeks, and starts after today", async () => {
      const today = new Date(nowMs);
      await expect(pause().startPause(dayKey(today), today)).rejects.toThrow();
      await expect(pause().startPause(dayKey(addDays(today, 57)), today)).rejects.toThrow();
      await pause().startPause(dayKey(addDays(today, 56)), today);
      expect((await pause().getActivePause(at()))?.until).toBe(dayKey(addDays(today, 56)));
    });

    test("ending it keeps the days already paused", async () => {
      const start = new Date(nowMs);
      await pause().startPause(dayKey(addDays(start, 20)), start);
      nowMs = addDays(start, 5).getTime();
      await pause().endPause(at());
      expect(await pause().getActivePause(at())).toBeNull();
      expect(await streaks().getPausePeriods()).toEqual([
        { from: dayKey(start), until: dayKey(addDays(start, 5)) },
      ]);
    });

    test("a pause begun today shows today: the day's cached flame is not served", async () => {
      await streaks().calculateAndCacheStreak();
      await pause().startPause(dayKey(addDays(new Date(nowMs), 7)), at());
      expect(await streaks().getCachedStreak()).toBeNull();
    });

    test("the reminders start on the return date", () => {
      const { planReminders } = require("../db/reminders") as typeof import("../db/reminders");
      const now = new Date(2026, 5, 1, 8);
      const days = Object.fromEntries(
        ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => [d, "18:00"]),
      ) as never;
      const plan = planReminders({
        days,
        now,
        sessions: [],
        sessionActive: false,
        state: { resumeDate: null, log: [] },
        pausedUntil: "2026-06-15",
        offer: { kind: "gallery", trained: false },
        oath: null,
        language: "en",
        t: (key: string) => key,
      });
      expect(plan.entries[0]?.date).toBe("2026-06-15");
    });
  });
});

/**
 * The flame skips a paused day entirely: it is neither lit nor idle. Every call names its own clock
 * and a pivot before the journal, so the dormant flame is on and no result depends on today.
 */
describe("the flame under a pause", () => {
  const dbs = createTestDb();
  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(dbs));
  });
  afterAll(() => dbs.close());

  const early = new Date(2025, 11, 1);
  const day = (n: number) => new Date(2026, 0, 1 + n, 12);
  const key = (n: number) => dayKey(day(n));
  const streaks = () => require("../db/streaks") as typeof import("../db/streaks");
  const read = (now: number, pauses: { from: number; until: number }[] = []) =>
    streaks().describeFlame(
      [0, 1, 6, 7].map(day),
      2,
      day(now),
      early,
      pauses.map((p) => ({ from: key(p.from), until: key(p.until) })),
    );

  // Without a pause these four sessions light the flame from day 1 to day 19, and it is out after.
  test("21 days of pause leave the flame exactly as it was the day it stopped", () => {
    const pause = [{ from: 8, until: 29 }];
    const before = read(7);
    expect(before.current).toBeGreaterThan(0);

    // Inside the pause, and on the day back: the same flame, not one day older.
    expect(read(20, pause)).toMatchObject({ current: before.current, dormant: 0 });
    expect(read(29, pause)).toMatchObject({ current: before.current + 1, dormant: 0 });
    // Without the pause the same calendar has let it fall asleep.
    expect(read(29)).toMatchObject({ current: 0, dormant: 19 });
  });

  test("the days before and after a pause touch: the lit run carries on across it", () => {
    const pause = [{ from: 9, until: 30 }];
    // Day 35 is the 14th day that is not paused: the same flame as day 14 of the unpaused calendar.
    expect(read(35, pause)).toMatchObject({ current: read(14).current, best: read(14).best });
  });

  test("a paused day is not an idle day: the sleeping count is not eaten by the pause", () => {
    // Asleep from day 20; 56 idle days would wipe it, and a 56-day pause must not count as them.
    const pause = [{ from: 25, until: 81 }];
    expect(read(80, pause)).toMatchObject({ current: 0, dormant: 19 });
    expect(read(80)).toMatchObject({ current: 0, dormant: 0 });
  });

  test("a pause in the middle of nothing changes nothing", () => {
    expect(read(19, [{ from: 100, until: 120 }])).toEqual(read(19));
  });
});
