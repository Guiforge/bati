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

  test("getSuggestedFocusAreas returns weakest muscles as focus areas", async () => {
    const { getSuggestedFocusAreas } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const now = Math.floor(Date.now() / 1000);

    // Get a seeded exercise ID (Push-ups has chest and arms)
    const pushupRow = t.sqlite
      .prepare(`SELECT id FROM exercises WHERE enName = 'Push-ups'`)
      .get() as { id: number } | undefined;
    const pushupId = pushupRow?.id ?? 2;

    // Add sessions with only chest and arms
    t.sqlite.exec(`
      INSERT INTO completed_sessions (id, performedAt) VALUES (1, ${now});
      INSERT INTO completed_exercises (sessionId, exerciseId, resultType, resultValue, performedAt, sortOrder) VALUES (1, ${pushupId}, 'reps', 100, ${now}, 0);
    `);

    const suggestions = await getSuggestedFocusAreas(2);

    // Should suggest muscles with 0 volume
    expect(suggestions.length).toBe(2);
    // These should be muscles not worked (back, calf, abs, shoulder)
    expect(["back", "legs", "abs", "shoulder"]).toEqual(expect.arrayContaining(suggestions));
  });

  test("getBalanceRecommendation returns no_data status when no training", () => {
    const { getBalanceRecommendation } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const balance = {
      period: "30d" as const,
      startDate: new Date(),
      endDate: new Date(),
      totalVolume: 0,
      totalSessions: 0,
      muscles: [],
      weakAreas: [],
      strongAreas: [],
    };

    const rec = getBalanceRecommendation(balance);
    expect(rec.status).toBe("no_data");
    expect(rec.focusAreas).toEqual([]);
  });

  test("getBalanceRecommendation returns balanced status when no weak areas", () => {
    const { getBalanceRecommendation } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const balance = {
      period: "30d" as const,
      startDate: new Date(),
      endDate: new Date(),
      totalVolume: 600,
      totalSessions: 10,
      muscles: [],
      weakAreas: [],
      strongAreas: [],
    };

    const rec = getBalanceRecommendation(balance);
    expect(rec.status).toBe("balanced");
    expect(rec.message.en).toContain("Great balance");
  });

  test("getBalanceRecommendation returns needs_attention status with weak areas", () => {
    const { getBalanceRecommendation } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const balance = {
      period: "30d" as const,
      startDate: new Date(),
      endDate: new Date(),
      totalVolume: 600,
      totalSessions: 10,
      muscles: [],
      weakAreas: ["abs", "legs"] as ("arms" | "back" | "shoulder" | "chest" | "abs" | "legs")[],
      strongAreas: ["chest"] as ("arms" | "back" | "shoulder" | "chest" | "abs" | "legs")[],
    };

    const rec = getBalanceRecommendation(balance);
    expect(rec.status).toBe("needs_attention");
    expect(rec.message.en).toContain("abs");
    expect(rec.message.en).toContain("legs");
    expect(rec.focusAreas).toEqual(["abs", "legs"]);
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
});
