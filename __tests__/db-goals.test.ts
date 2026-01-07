import { createTestDb } from "./helpers/testDb";

describe("db/goals", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../src/db/client", () => ({
      db: t.db,
      schema: require("../src/db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  describe("getWeekKey", () => {
    test("should return ISO week format", () => {
      const { getWeekKey } = require("../src/db/goals") as typeof import("../src/db/goals");

      const weekKey = getWeekKey(new Date("2026-01-01"));
      // January 1, 2026 is in week 1 of 2026
      expect(weekKey).toMatch(/^\d{4}-\d{2}$/);
    });

    test("should return current week when no date provided", () => {
      const { getWeekKey } = require("../src/db/goals") as typeof import("../src/db/goals");

      const weekKey = getWeekKey();
      expect(weekKey).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe("goalTypeInfo", () => {
    test("should have all four goal types", () => {
      const { goalTypeInfo } = require("../src/db/goals") as typeof import("../src/db/goals");

      expect(goalTypeInfo.strength).toBeDefined();
      expect(goalTypeInfo.endurance).toBeDefined();
      expect(goalTypeInfo.flexibility).toBeDefined();
      expect(goalTypeInfo.balanced).toBeDefined();
    });

    test("should have localized names and descriptions", () => {
      const { goalTypeInfo } = require("../src/db/goals") as typeof import("../src/db/goals");

      expect(goalTypeInfo.strength.en).toBe("Strength");
      expect(goalTypeInfo.strength.fr).toBe("Force");
      expect(goalTypeInfo.strength.emoji).toBe("💪");
      expect(goalTypeInfo.strength.description.en).toBeDefined();
      expect(goalTypeInfo.strength.description.fr).toBeDefined();
    });
  });

  describe("createGoal", () => {
    test("should create a new goal", async () => {
      const { createGoal, getGoalById } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      const goalId = await createGoal({
        goalType: "strength",
        daysPerWeek: 4,
        sessionMinutes: 30,
      });

      expect(goalId).toBeGreaterThan(0);

      const goal = await getGoalById(goalId);
      expect(goal).not.toBeNull();
      expect(goal?.goalType).toBe("strength");
      expect(goal?.daysPerWeek).toBe(4);
      expect(goal?.sessionMinutes).toBe(30);
      expect(goal?.status).toBe("active");
    });

    test("should deactivate previous active goal when creating new one", async () => {
      const { createGoal, getGoalById } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      // Create first goal
      const goal1Id = await createGoal({
        goalType: "endurance",
        daysPerWeek: 3,
        sessionMinutes: 20,
      });

      // Verify first goal is active
      const goal1Before = await getGoalById(goal1Id);
      expect(goal1Before?.status).toBe("active");

      // Create second goal
      const goal2Id = await createGoal({
        goalType: "flexibility",
        daysPerWeek: 5,
        sessionMinutes: 15,
      });

      // First goal should now be paused
      const goal1After = await getGoalById(goal1Id);
      const goal2 = await getGoalById(goal2Id);

      expect(goal1After?.status).toBe("paused");
      expect(goal2?.status).toBe("active");
    });
  });

  describe("getActiveGoal", () => {
    test("should return the active goal", async () => {
      const { createGoal, getActiveGoal } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      await createGoal({
        goalType: "balanced",
        daysPerWeek: 4,
        sessionMinutes: 25,
      });

      const goal = await getActiveGoal();
      expect(goal).not.toBeNull();
      expect(goal?.goalType).toBe("balanced");
      expect(goal?.status).toBe("active");
    });
  });

  describe("updateGoalStatus", () => {
    test("should update goal status", async () => {
      const { createGoal, getGoalById, updateGoalStatus } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      const goalId = await createGoal({
        goalType: "strength",
        daysPerWeek: 3,
        sessionMinutes: 20,
      });

      await updateGoalStatus(goalId, "completed");

      const goal = await getGoalById(goalId);
      expect(goal?.status).toBe("completed");
    });
  });

  describe("getOrCreateWeekProgress", () => {
    test("should create progress for current week", async () => {
      const { createGoal, getOrCreateWeekProgress, getWeekKey } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      const goalId = await createGoal({
        goalType: "endurance",
        daysPerWeek: 5,
        sessionMinutes: 30,
      });

      const progress = await getOrCreateWeekProgress(goalId);

      expect(progress.goalId).toBe(goalId);
      expect(progress.weekKey).toBe(getWeekKey());
      expect(progress.targetSessions).toBe(5);
      expect(progress.completedSessions).toBe(0);
    });

    test("should return existing progress if already created", async () => {
      const { createGoal, getOrCreateWeekProgress } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      const goalId = await createGoal({
        goalType: "flexibility",
        daysPerWeek: 4,
        sessionMinutes: 25,
      });

      const progress1 = await getOrCreateWeekProgress(goalId);
      const progress2 = await getOrCreateWeekProgress(goalId);

      expect(progress1.id).toBe(progress2.id);
    });
  });

  describe("getCurrentWeekCompletion", () => {
    test("should return completion status", async () => {
      const { createGoal, getCurrentWeekCompletion } =
        require("../src/db/goals") as typeof import("../src/db/goals");

      await createGoal({
        goalType: "balanced",
        daysPerWeek: 3,
        sessionMinutes: 20,
      });

      const result = await getCurrentWeekCompletion();

      expect(result.goal).not.toBeNull();
      expect(result.progress).not.toBeNull();
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
    });
  });
});
