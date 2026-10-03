import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/muscleBalance", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  beforeEach(() => {
    // Clean up completed sessions before each test
    t.sqlite.exec(`DELETE FROM completed_exercises`);
    t.sqlite.exec(`DELETE FROM completed_sessions`);
    const { clearShortLivedQueries } =
      require("../db/queryCache") as typeof import("../db/queryCache");
    clearShortLivedQueries();
  });

  test("getMuscleBalance returns empty balance when no sessions exist", async () => {
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const balance = await getMuscleBalance("30d");

    expect(balance.totalVolume).toBe(0);
    expect(balance.totalSessions).toBe(0);
    expect(balance.muscles.length).toBe(6); // All muscles present
    expect(balance.weakAreas).toEqual([]); // No weak areas with 0 data
    expect(balance.strongAreas).toEqual([]);
  });

  test("getMuscleBalance calculates volume correctly from completed exercises", async () => {
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);

    // Get a seeded exercise ID (Push-ups has chest and arms)
    const pushupRow = t.sqlite
      .prepare(`SELECT id FROM exercises WHERE enName = 'Push-ups'`)
      .get() as { id: number } | undefined;
    const pushupId = pushupRow?.id ?? 2; // Fallback to ID 2

    // Add a completed session
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (1, ${pushupId}, 'reps', 20, ${now}, 0);
    `);

    const balance = await getMuscleBalance("30d");

    expect(balance.totalSessions).toBe(1);
    // Push-ups work chest and arms, 20 reps each
    expect(balance.totalVolume).toBeGreaterThan(0);

    const chest = balance.muscles.find((m) => m.muscle === "chest");
    const arms = balance.muscles.find((m) => m.muscle === "arms");

    // Each muscle gets the result value for exercises that work that muscle
    expect(chest?.volume).toBe(20);
    expect(arms?.volume).toBe(20);
  });

  test("getMuscleBalance identifies weak and strong areas correctly", async () => {
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);

    // Get a seeded exercise ID (Push-ups has chest and arms)
    const pushupRow = t.sqlite
      .prepare(`SELECT id FROM exercises WHERE enName = 'Push-ups'`)
      .get() as { id: number } | undefined;
    const pushupId = pushupRow?.id ?? 2;

    // Add sessions heavily biased towards one muscle (lots of push-ups)
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_sessions (id, performedAt) VALUES (2, ${now});
      INSERT INTO completed_sessions (id, performedAt) VALUES (3, ${now});

      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (1, ${pushupId}, 'reps', 50, ${now}, 0);
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (2, ${pushupId}, 'reps', 50, ${now}, 0);
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (3, ${pushupId}, 'reps', 50, ${now}, 0);
    `);

    const balance = await getMuscleBalance("30d");

    // Chest and arms should be strong (lots of push-ups)
    // Muscles with 0 volume should be weak
    expect(balance.weakAreas).toContain("abs");
    expect(balance.weakAreas).toContain("legs");
  });

  test("getSuggestedFocusAreas returns empty array when no data", async () => {
    const { getSuggestedFocusAreas } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const suggestions = await getSuggestedFocusAreas();
    expect(suggestions).toEqual([]);
  });

  const pushupId = () =>
    (t.sqlite.prepare(`SELECT id FROM exercises WHERE enName = 'Push-ups'`).get() as { id: number })
      .id;

  test("getSuggestedFocusAreas says nothing before three sessions, like the Journal", async () => {
    const { getSuggestedFocusAreas } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (1, ${pushupId()}, 'reps', 100, ${now}, 0);
    `);
    expect(await getSuggestedFocusAreas(2)).toEqual([]);
  });

  test("getSuggestedFocusAreas is the Journal's weakAreas, not the N lowest muscles", async () => {
    const { getSuggestedFocusAreas, getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);
    for (let i = 1; i <= 3; i++) {
      t.sqlite.exec(`
        INSERT INTO completed_sessions (id, performedAt) VALUES (${i}, ${now});
        INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (${i}, ${pushupId()}, 'reps', 50, ${now}, 0);
      `);
    }
    const { weakAreas } = await getMuscleBalance("30d");
    expect(weakAreas.length).toBeGreaterThan(0);
    expect((await getSuggestedFocusAreas(99)).toSorted()).toEqual(weakAreas.toSorted());
  });

  // weakAreas comes out in volume order, biggest first: a Home asking for one focus muscle got the
  // least neglected of the weak ones.
  test("getSuggestedFocusAreas names the most neglected muscle first", async () => {
    const { getSuggestedFocusAreas, getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);
    const lone = t.sqlite
      .prepare(
        `SELECT exerciseId FROM exercise_muscles GROUP BY exerciseId HAVING COUNT(*) = 1 AND MAX(muscle) <> (SELECT muscle FROM exercise_muscles WHERE exerciseId = ${pushupId()} LIMIT 1) LIMIT 1`,
      )
      .get() as { exerciseId: number };
    for (let i = 1; i <= 3; i++) {
      t.sqlite.exec(`
        INSERT INTO completed_sessions (id, performedAt) VALUES (${i}, ${now});
        INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (${i}, ${pushupId()}, 'reps', 100, ${now}, 0);
        INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (${i}, ${lone.exerciseId}, 'reps', 1, ${now}, 1);
      `);
    }
    const balance = await getMuscleBalance("30d");
    const share = (code: string) => balance.muscles.find((m) => m.muscle === code)?.percentage;
    const lowest = Math.min(...balance.weakAreas.map((m) => share(m) ?? 100));
    // The fixture is only worth something if the volume order does not already put it first.
    expect(share(balance.weakAreas[0] ?? "")).toBeGreaterThan(lowest);

    const [focus] = await getSuggestedFocusAreas(1);
    expect(share(focus ?? "")).toBe(lowest);
  });

  test("a balanced hero has no focus areas and no suggested quests", async () => {
    const { getSuggestedFocusAreas, getSuggestedQuestsForWeakAreas, getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);
    const muscles = t.sqlite.prepare(`SELECT DISTINCT muscle FROM exercise_muscles`).all() as {
      muscle: string;
    }[];
    let n = 0;
    const add = (session: number, muscle: string) => {
      const ex = t.sqlite
        .prepare(`SELECT exerciseId FROM exercise_muscles WHERE muscle = ? LIMIT 1`)
        .get(muscle) as { exerciseId: number };
      t.sqlite.exec(
        `INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (${session}, ${ex.exerciseId}, 'reps', 20, ${now}, ${n++})`,
      );
    };
    for (let i = 1; i <= 3; i++) {
      t.sqlite.exec(`INSERT INTO completed_sessions (id, performedAt) VALUES (${i}, ${now})`);
      for (const { muscle } of muscles) add(i, muscle);
    }
    // Feed whoever is still behind until the fixture is honestly balanced.
    for (let guard = 0; guard < 30; guard++) {
      const { weakAreas } = await getMuscleBalance("30d");
      if (weakAreas.length === 0) break;
      for (const m of weakAreas) add(1, m);
      const { clearShortLivedQueries } =
        require("../db/queryCache") as typeof import("../db/queryCache");
      clearShortLivedQueries();
    }
    expect((await getMuscleBalance("30d")).weakAreas).toEqual([]);
    expect(await getSuggestedFocusAreas(3)).toEqual([]);
    expect(await getSuggestedQuestsForWeakAreas(3)).toEqual([]);
    // The path the Home calls: no "weak points" offer for a hero the Journal calls balanced, and
    // no day-one on-ramp either. "Nothing to suggest" stopped meaning "never trained" the day the
    // weak-muscle rule learned to stay quiet: a balanced veteran was offered "Your first march".
    const { decideHomeOffer } = require("../db/homeOffer") as typeof import("../db/homeOffer");
    expect((await decideHomeOffer("en"))?.kind).toBe("gallery");
  });

  test("the Home does offer weak points to a hero the Journal calls behind", async () => {
    const now = Math.floor(Date.now() / 1000);
    for (let i = 1; i <= 3; i++) {
      t.sqlite.exec(`
        INSERT INTO completed_sessions (id, performedAt) VALUES (${i}, ${now});
        INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (${i}, ${pushupId()}, 'reps', 50, ${now}, 0);
      `);
    }
    const { decideHomeOffer } = require("../db/homeOffer") as typeof import("../db/homeOffer");
    expect((await decideHomeOffer("en"))?.kind).toBe("weak_muscles");
  });

  test("getSuggestedQuestsForWeakAreas returns empty when no training history", async () => {
    const { getSuggestedQuestsForWeakAreas } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    const suggestions = await getSuggestedQuestsForWeakAreas(3);
    expect(suggestions).toEqual([]);
  });

  test("getSuggestedQuestsForWeakAreas returns quests targeting weak muscles", async () => {
    const { getSuggestedQuestsForWeakAreas } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);

    // Create imbalance: train chest a lot, ignore other muscles
    // Get chest exercise
    const pushupRow = t.sqlite
      .prepare(`SELECT id FROM exercises WHERE enName = 'Push-ups'`)
      .get() as { id: number } | undefined;
    const pushupId = pushupRow?.id ?? 2;

    // Add many chest sessions to create imbalance
    for (let i = 1; i <= 10; i++) {
      t.sqlite.exec(`
        INSERT INTO completed_sessions (id, performedAt) VALUES (${i}, ${now - i * 3600});
        INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (${i}, ${pushupId}, 'reps', 50, ${now - i * 3600}, 0);
      `);
    }

    const suggestions = await getSuggestedQuestsForWeakAreas(3);

    // Should return quests (may vary based on seeded quests)
    // Just verify the structure and that it doesn't suggest chest-focused quests
    expect(Array.isArray(suggestions)).toBe(true);
    for (const s of suggestions) {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("enTitle");
      expect(s).toHaveProperty("frTitle");
      expect(s).toHaveProperty("matchingMuscles");
      expect(s).toHaveProperty("matchScore");
      expect(s.matchScore).toBeGreaterThan(0);
      // Should not include chest as a matching muscle (it's overworked)
      expect(s.matchingMuscles).not.toContain("chest");
    }
  });
  // ----------------------------------------------------------
  // Movement-pattern balance
  // ----------------------------------------------------------

  /** Seeds one session per (exercise, volume) pair. Patterns come from migration 0020. */
  function seedByName(entries: { name: string; volume: number; type?: "reps" | "time" }[]): void {
    const now = Math.floor(Date.now() / 1000);
    entries.forEach((e, i) => {
      const row = t.sqlite.prepare(`SELECT id FROM exercises WHERE enName = ?`).get(e.name) as
        | { id: number }
        | undefined;
      if (!row) throw new Error(`Seed exercise missing: ${e.name}`);
      const sessionId = i + 1;
      t.sqlite.exec(`
        INSERT INTO completed_sessions (id, performedAt) VALUES (${sessionId}, ${now - i * 3600});
        INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder)
        VALUES (${sessionId}, ${row.id}, '${e.type ?? "reps"}', ${e.volume}, ${now - i * 3600}, 0);
      `);
    });
  }

  test("getPatternBalance is empty with no sessions", async () => {
    const { getPatternBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const balance = await getPatternBalance("30d");

    expect(balance.totalVolume).toBe(0);
    expect(balance.pushVolume).toBe(0);
    expect(balance.pullVolume).toBe(0);
    expect(balance.pullPerPush).toBeNull();
    expect(balance.patterns.length).toBe(9);
  });

  test("getPatternBalance sums volume per movement family", async () => {
    const { getPatternBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    seedByName([
      { name: "Push-ups", volume: 100 }, // push_horizontal
      { name: "Table Row", volume: 30 }, // pull_horizontal
      { name: "Pull-ups", volume: 10 }, // pull_vertical
    ]);

    const balance = await getPatternBalance("30d");

    expect(balance.pushVolume).toBe(100);
    expect(balance.pullVolume).toBe(40);
    expect(balance.pullPerPush).toBeCloseTo(0.4);

    // An exercise is counted once, not once per muscle it happens to tag: Push-ups hit both
    // chest and arms, and 200 here would mean the exercise_muscles join had leaked in.
    const pushH = balance.patterns.find((p) => p.pattern === "push_horizontal");
    expect(pushH?.volume).toBe(100);
    expect(balance.totalVolume).toBe(140);
  });

  test("getPullDeficit fires only when pulling is under half of pushing", async () => {
    const { getPatternBalance, getPullDeficit } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    seedByName([
      { name: "Push-ups", volume: 100 },
      { name: "Table Row", volume: 40 },
    ]);

    const deficit = getPullDeficit(await getPatternBalance("30d"));
    expect(deficit).toEqual({ pullVolume: 40, pushVolume: 100 });
  });

  test("getPullDeficit stays quiet when pulling keeps up", async () => {
    const { getPatternBalance, getPullDeficit } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    seedByName([
      { name: "Push-ups", volume: 100 },
      { name: "Table Row", volume: 80 },
    ]);

    expect(getPullDeficit(await getPatternBalance("30d"))).toBeNull();
  });

  test("getPullDeficit stays quiet on too little pushing to judge", async () => {
    const { getPatternBalance, getPullDeficit } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    // One session's worth of pushing and no pulling at all is not a posture problem yet.
    seedByName([{ name: "Push-ups", volume: 20 }]);

    expect(getPullDeficit(await getPatternBalance("30d"))).toBeNull();
  });

  // BUG-009. `resultValue` holds reps for some rows and seconds for others, and summing it raw
  // made a 60 s plank outweigh a 20-rep set six to one — which then drove weak-area detection,
  // the home screen's quest suggestion and the village's building levels off the same bad number.
  test("a 60 s hold weighs the same as a 20-rep set, not six times more", async () => {
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    seedByName([
      { name: "Push-ups", volume: 20 }, // chest + arms, reps
      { name: "Plank", volume: 60, type: "time" }, // abs + back + shoulder, seconds
    ]);

    const balance = await getMuscleBalance("30d");
    const volumeOf = (m: string) => balance.muscles.find((x) => x.muscle === m)?.volume;

    expect(volumeOf("chest")).toBe(20);
    expect(volumeOf("abs")).toBe(20); // 60 s / 3, not 60
    expect(volumeOf("abs")).toBe(volumeOf("chest"));

    // Equal work, so neither side is weak or strong against the other.
    expect(balance.weakAreas).not.toContain("abs");
    expect(balance.strongAreas).not.toContain("abs");
  });

  test("pattern balance converts holds too", async () => {
    const { getPatternBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    seedByName([{ name: "Plank", volume: 60, type: "time" }]);

    const balance = await getPatternBalance("30d");
    expect(balance.totalVolume).toBe(20);
  });

  test("results from an unclassified hero exercise are counted, and named", async () => {
    const { createUserExercise, DEFAULT_USER_EXERCISE_DRAFT } =
      require("../db/exercises") as typeof import("../db/exercises");
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    // The fold left closed: no muscles, so the inner join in getMuscleBalance cannot see it and
    // its volume is in no bar and no total. Silently shrinking the number is the lie.
    const id = await createUserExercise({
      ...DEFAULT_USER_EXERCISE_DRAFT,
      name: "Qi Gong Flow",
      description: "Move slowly.",
      muscles: [],
    });

    t.sqlite
      .prepare("INSERT INTO completed_sessions (userLevel, performedAt) VALUES ('medium', ?)")
      .run(Math.floor(Date.now() / 1000));
    const session = t.sqlite.prepare("SELECT MAX(id) AS id FROM completed_sessions").get() as {
      id: number;
    };
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', 12, ?)`,
      )
      .run(session.id, id, Math.floor(Date.now() / 1000));

    const balance = await getMuscleBalance("all");

    expect(balance.totalVolume).toBe(0);
    expect(balance.unclassifiedResults).toBe(1);
  });

  test("a tagged exercise is not reported as unclassified", async () => {
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");

    seedByName([{ name: "Plank", volume: 30, type: "time" }]);

    const balance = await getMuscleBalance("all");
    expect(balance.unclassifiedResults).toBe(0);
  });
});
