import { createTestDb } from "./helpers/testDb";

describe("db/achievements", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  describe("achievementDefinitions", () => {
    test("has all achievement codes defined", () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");
      expect(achievements.achievementDefinitions.length).toBeGreaterThan(20);

      // Check all codes are unique
      const codes = achievements.achievementDefinitions.map((a) => a.code);
      expect(new Set(codes).size).toBe(codes.length);
    });

    test("getAchievementDefinition returns correct definition", () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      const def = achievements.getAchievementDefinition("first_workout");
      expect(def).toBeTruthy();
      expect(def?.icon).toBe("🎯");
      expect(def?.category).toBe("sessions");
    });

    test("getAchievementDefinition returns undefined for invalid code", () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      const def = achievements.getAchievementDefinition("invalid_code" as never);
      expect(def).toBeUndefined();
    });
  });

  describe("unlockAchievement", () => {
    test("unlocks a new achievement", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      // Start with no achievements
      const beforeUnlock = await achievements.getUnlockedAchievements();
      const initialCount = beforeUnlock.length;

      // Unlock first_workout
      const result = await achievements.unlockAchievement("first_workout");
      expect(result).toBe(true);

      const afterUnlock = await achievements.getUnlockedAchievements();
      expect(afterUnlock.length).toBe(initialCount + 1);
      expect(afterUnlock.some((a) => a.code === "first_workout")).toBe(true);
    });

    test("does not double-unlock same achievement", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      // Try to unlock again
      const result = await achievements.unlockAchievement("first_workout");
      expect(result).toBe(false);

      // Count should not change
      const unlocked = await achievements.getUnlockedAchievements();
      expect(unlocked.filter((a) => a.code === "first_workout").length).toBe(1);
    });
  });

  describe("getAchievementStats", () => {
    test("returns correct stats", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      const stats = await achievements.getAchievementStats();
      expect(stats.total).toBe(achievements.achievementDefinitions.length);
      expect(stats.unlocked).toBeGreaterThanOrEqual(1); // We unlocked first_workout
      expect(stats.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe("getAllAchievementsWithProgress", () => {
    test("returns progress for all achievements", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      const progress = await achievements.getAllAchievementsWithProgress();
      expect(progress.length).toBe(achievements.achievementDefinitions.length);

      // Check structure - first_workout should be unlocked from earlier test
      const first = progress.find((p) => p.code === "first_workout");
      expect(first).toBeTruthy();
      expect(first?.isUnlocked).toBe(true);
      // Progress calculation depends on session count, not unlock status
      expect(first?.targetValue).toBe(1);

      // Check not yet unlocked
      const sessions500 = progress.find((p) => p.code === "sessions_500");
      expect(sessions500).toBeTruthy();
      expect(sessions500?.isUnlocked).toBe(false);
      expect(sessions500?.targetValue).toBe(500);
    });
  });

  describe("checkForNewAchievements", () => {
    test("returns newly unlocked achievements", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");
      const completed = require("../db/completed") as typeof import("../db/completed");
      const exercises = require("../db/exercises") as typeof import("../db/exercises");

      // Create some sessions to trigger achievements
      const allExercises = await exercises.listExercises();
      const squat = allExercises.find((e) => e.enName === "Squat");
      if (!squat) throw new Error("Squat not found");

      // Create 10 sessions to trigger sessions_10
      for (let i = 0; i < 10; i++) {
        await completed.createCompletedSession({
          questId: null,
          xpEarned: 50,
          durationSeconds: 600,
          exercises: [
            {
              exerciseId: squat.id,
              sortOrder: 0,
              result: { type: "reps", value: 10 },
            },
          ],
        });
      }

      const newAchievements = await achievements.checkForNewAchievements({
        durationSeconds: 600,
        xpEarned: 50,
        performedAt: new Date(),
        questId: null,
      });

      // Should have unlocked sessions_10 (and possibly xp_100 with 500 total XP)
      const has10Sessions = newAchievements.some((a) => a.code === "sessions_10");
      expect(has10Sessions).toBe(true);
    });

    test("detects early bird achievement", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      // Create a session at 6am
      const earlyMorning = new Date();
      earlyMorning.setHours(6, 0, 0, 0);

      const newAchievements = await achievements.checkForNewAchievements({
        durationSeconds: 600,
        xpEarned: 50,
        performedAt: earlyMorning,
        questId: null,
      });

      const hasEarlyBird = newAchievements.some((a) => a.code === "early_bird");
      expect(hasEarlyBird).toBe(true);
    });

    test("detects long session achievement", async () => {
      const achievements = require("../db/achievements") as typeof import("../db/achievements");

      const newAchievements = await achievements.checkForNewAchievements({
        durationSeconds: 1800, // 30 minutes
        xpEarned: 100,
        performedAt: new Date(),
        questId: null,
      });

      const hasLongSession = newAchievements.some((a) => a.code === "long_session_30min");
      expect(hasLongSession).toBe(true);
    });
  });
});
