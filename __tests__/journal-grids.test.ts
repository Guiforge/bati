import {
  buildJournalStats,
  buildMonthGrid,
  buildWeekdayBars,
} from "@/components/journal/journalGrids";

// Both of these were pure functions buried in 300-line screens with no test. Every failure mode
// they have is *plausible output*: the calendar still draws 42 cells, the histogram still has
// seven bars, they are just shifted by a day. That is reported as "my sessions moved", if it is
// reported at all.

describe("buildMonthGrid", () => {
  // 2026-08 (month index 7): 31 days, the 1st is a Saturday.
  const AUG = { year: 2026, month: 7 };
  const noWorkouts = new Set<string>();

  it("always returns six full rows, so the calendar never changes height", () => {
    for (let month = 0; month < 12; month++) {
      const grid = buildMonthGrid(2026, month, noWorkouts, 1);
      expect(grid.days).toHaveLength(42);
    }
  });

  it("pads the front with the previous month's real dates", () => {
    // Week starting Monday: 2026-08-01 is a Saturday, so five padding cells (Mon–Fri), and they
    // are July's last five days, 27..31 — not blanks and not 1..5.
    const grid = buildMonthGrid(AUG.year, AUG.month, noWorkouts, 1);
    const padding = grid.days.filter((d) => !d.isCurrentMonth).slice(0, 5);

    expect(padding.map((d) => d.date)).toEqual([27, 28, 29, 30, 31]);
    expect(grid.days[5]).toMatchObject({ date: 1, isCurrentMonth: true });
  });

  it("shifts the whole grid when the week starts on Sunday", () => {
    const monday = buildMonthGrid(AUG.year, AUG.month, noWorkouts, 1);
    const sunday = buildMonthGrid(AUG.year, AUG.month, noWorkouts, 0);

    // One more padding cell before the 1st when the week opens on Sunday.
    const firstOfMonth = (g: typeof monday) =>
      g.days.findIndex((d) => d.isCurrentMonth && d.date === 1);
    expect(firstOfMonth(sunday)).toBe(firstOfMonth(monday) + 1);
  });

  it("counts only workouts inside the month, never the padding", () => {
    const dates = new Set(["2026-08-03", "2026-08-04", "2026-07-31", "2026-09-01"]);
    const grid = buildMonthGrid(AUG.year, AUG.month, dates, 1);

    expect(grid.workoutCount).toBe(2);
    // The padding days still light up — they are real days — they just do not count.
    expect(grid.days.filter((d) => d.hasWorkout)).toHaveLength(4);
  });

  it("marks today, and only when today is in the month being drawn", () => {
    const today = new Date(2026, 7, 16);
    const august = buildMonthGrid(2026, 7, noWorkouts, 1, today);
    const september = buildMonthGrid(2026, 8, noWorkouts, 1, today);

    expect(august.days.filter((d) => d.isToday)).toHaveLength(1);
    expect(august.days.find((d) => d.isToday)?.date).toBe(16);
    // September's grid pads with August dates, but none of them is "today".
    expect(september.days.filter((d) => d.isToday)).toHaveLength(0);
  });

  it("rolls the year over in both directions", () => {
    const january = buildMonthGrid(2026, 0, new Set(["2025-12-31"]), 1);
    const december = buildMonthGrid(2026, 11, new Set(["2027-01-01"]), 1);

    expect(january.days.some((d) => !d.isCurrentMonth && d.hasWorkout)).toBe(true);
    expect(december.days.some((d) => !d.isCurrentMonth && d.hasWorkout)).toBe(true);
  });
});

describe("buildWeekdayBars", () => {
  // 2026-08-17 is a Monday, 2026-08-16 a Sunday.
  const monday = new Date(2026, 7, 17);
  const sunday = new Date(2026, 7, 16);

  it("always returns seven bars", () => {
    expect(buildWeekdayBars([], "fr")).toHaveLength(7);
    expect(buildWeekdayBars([], "en")).toHaveLength(7);
  });

  it("opens the week on Monday in French and Sunday in English", () => {
    const fr = buildWeekdayBars([monday], "fr");
    const en = buildWeekdayBars([monday], "en");

    // Same single Monday session: first bar in French, second in English.
    expect(fr[0]?.count).toBe(1);
    expect(en[0]?.count).toBe(0);
    expect(en[1]?.count).toBe(1);
  });

  it("counts several sessions on the same weekday", () => {
    const bars = buildWeekdayBars([monday, monday, sunday], "fr");

    expect(bars[0]?.count).toBe(2); // Monday
    expect(bars[6]?.count).toBe(1); // Sunday, last when the week opens on Monday
  });

  it("accepts the shapes the database actually returns", () => {
    const fromString = buildWeekdayBars([monday.toISOString()], "fr");
    const fromNumber = buildWeekdayBars([monday.getTime()], "fr");

    expect(fromString[0]?.count).toBe(1);
    expect(fromNumber[0]?.count).toBe(1);
  });

  it("labels every bar with a non-empty capitalised weekday", () => {
    for (const bar of buildWeekdayBars([], "fr")) {
      expect(bar.day.length).toBeGreaterThan(0);
      expect(bar.day[0]).toBe(bar.day[0]?.toUpperCase());
    }
  });
});

describe("buildJournalStats", () => {
  // A hero who trains 20 minutes three times a week and walks an hour on Sunday. Averaged
  // together that is the 77 min the stats tab used to call their usual workout.
  const monday = new Date(2026, 7, 17, 18, 0);
  const tuesday = new Date(2026, 7, 18, 18, 0);
  const wednesday = new Date(2026, 7, 19, 18, 0);
  const sunday = new Date(2026, 7, 23, 10, 0);
  const today = new Date(2026, 7, 23, 20, 0);

  const workout = (performedAt: Date, minutes: number) => ({
    performedAt,
    durationSeconds: minutes * 60,
    userLevel: "medium",
    outing: null,
    movingSeconds: null,
    leaguesM: null,
  });
  const outing = (performedAt: Date, minutes: number, leaguesM: number, movingMinutes = minutes) =>
    ({
      performedAt,
      durationSeconds: minutes * 60,
      userLevel: "medium",
      outing: "walk",
      movingSeconds: movingMinutes * 60,
      leaguesM,
    }) as const;

  const week = [
    workout(monday, 20),
    workout(tuesday, 20),
    workout(wednesday, 20),
    outing(sunday, 65, 5200),
  ];

  it("averages workouts alone, so a walk cannot inflate the training duration", () => {
    const stats = buildJournalStats(week, "fr", today);

    expect(stats.totalWorkouts).toBe(3);
    expect(stats.totalMinutes).toBe(60);
    expect(stats.avgMinutes).toBe(20);
  });

  it("counts the outings apart, with their own ground and average", () => {
    const stats = buildJournalStats([...week, outing(monday, 45, 3800)], "fr", today);

    expect(stats.outings).toEqual({ count: 2, leaguesM: 9000, avgMinutes: 55 });
  });

  /**
   * `outing` on the row, not `leaguesM`. The two disagree exactly where it matters, and a walk
   * whose service never started is the case that proves it: no ground, still a walk. Counting it
   * as a workout would put an hour on the road back into the average this function exists to fix.
   */
  it("a walk with no ground is still a walk", () => {
    const stats = buildJournalStats([workout(monday, 20), outing(sunday, 65, 0, 60)], "fr", today);

    expect(stats.totalWorkouts).toBe(1);
    expect(stats.avgMinutes).toBe(20);
    expect(stats.outings).toEqual({ count: 1, leaguesM: 0, avgMinutes: 60 });
  });

  it("has no outings block at all until the hero goes out", () => {
    expect(buildJournalStats([workout(monday, 20)], "fr", today).outings).toBeNull();
  });

  /** Moving minutes, which is what an outing's trace can prove and what its XP was paid on. */
  it("times an outing by what moved, not by how long the hero was out", () => {
    const stats = buildJournalStats([outing(sunday, 90, 4000, 45)], "fr", today);

    expect(stats.outings?.avgMinutes).toBe(45);
  });

  it("splits difficulty over workouts alone", () => {
    const stats = buildJournalStats(week, "fr", today);

    expect(stats.levels).toEqual({ easy: 0, medium: 3, hard: 0 });
  });

  it("still counts a walk as recent activity, which is what that block asks", () => {
    const stats = buildJournalStats(week, "fr", today);

    expect(stats.thisWeekCount).toBe(4);
    expect(stats.thisWeekMinutes).toBe(125);
    expect(stats.thisMonthCount).toBe(4);
  });
});
