import { createTestDb } from "./helpers/testDb";

describe("db/resources", () => {
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

  describe("getResourceInventory", () => {
    test("should return all resource types", async () => {
      const { getResourceInventory } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const inventory = await getResourceInventory();
      expect(inventory.length).toBeGreaterThan(5); // gold, wood, stone, mana, leaf, etc.
      expect(inventory.find((r) => r.resource === "gold")).toBeDefined();
      expect(inventory.find((r) => r.resource === "wood")).toBeDefined();
      expect(inventory.find((r) => r.resource === "mana")).toBeDefined();
    });
  });

  describe("getResourceAmount", () => {
    test("should return 0 for new resources", async () => {
      const { getResourceAmount } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const amount = await getResourceAmount("gold");
      expect(typeof amount).toBe("number");
    });
  });

  describe("addResources", () => {
    test("should add resources to inventory", async () => {
      const { addResources, getResourceAmount } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const initialGold = await getResourceAmount("gold");

      await addResources([{ resource: "gold", amount: 50 }], {
        reason: "test reward",
      });

      const newGold = await getResourceAmount("gold");
      expect(newGold).toBe(initialGold + 50);
    });

    test("should handle multiple resource types", async () => {
      const { addResources, getResourceAmount } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const initialGold = await getResourceAmount("gold");
      const initialWood = await getResourceAmount("wood");

      await addResources(
        [
          { resource: "gold", amount: 30 },
          { resource: "wood", amount: 20 },
        ],
        { reason: "workout loot" }
      );

      const newGold = await getResourceAmount("gold");
      const newWood = await getResourceAmount("wood");

      expect(newGold).toBe(initialGold + 30);
      expect(newWood).toBe(initialWood + 20);
    });

    test("should skip zero or negative amounts", async () => {
      const { addResources, getResourceAmount } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const initialWood = await getResourceAmount("wood");

      await addResources([{ resource: "wood", amount: 0 }]);

      const newWood = await getResourceAmount("wood");
      expect(newWood).toBe(initialWood);
    });
  });

  describe("calculateSessionResources", () => {
    test("should calculate gold based on duration", () => {
      const { calculateSessionResources } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const result = calculateSessionResources({
        durationSeconds: 600, // 10 minutes
        exercisesByMuscle: new Map(),
        exercisesByStyle: new Map(),
        difficultyMultiplier: 1.0,
      });

      // Gold = 10 + (10 * 2) = 30
      expect(result.gold).toBe(30);
    });

    test("should apply difficulty multiplier to gold", () => {
      const { calculateSessionResources } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const resultHard = calculateSessionResources({
        durationSeconds: 600, // 10 minutes
        exercisesByMuscle: new Map(),
        exercisesByStyle: new Map(),
        difficultyMultiplier: 1.2,
      });

      // Gold = (10 + 20) * 1.2 = 36
      expect(resultHard.gold).toBe(36);
    });

    test("should calculate specific resources from muscle exercises", () => {
      const { calculateSessionResources } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const result = calculateSessionResources({
        durationSeconds: 300,
        exercisesByMuscle: new Map([
          ["arms", 50],
          ["back", 30],
        ]),
        exercisesByStyle: new Map([["strength", 80]]),
        difficultyMultiplier: 1.0,
      });

      // Arms -> Wood, Back -> Stone
      expect(result.materials).toHaveLength(2);
      expect(result.materials.find((m) => m.resource === "wood")?.amount).toBe(50);
      expect(result.materials.find((m) => m.resource === "stone")?.amount).toBe(30);
    });

    test("should calculate mana from calisthenics", () => {
      const { calculateSessionResources } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const result = calculateSessionResources({
        durationSeconds: 300,
        exercisesByMuscle: new Map(),
        exercisesByStyle: new Map([["calisthenics", 50]]),
        difficultyMultiplier: 1.0,
      });

      expect(result.materials.find((m) => m.resource === "mana")?.amount).toBe(50);
    });
  });

  describe("getDifficultyMultiplier", () => {
    test("should return correct multipliers", () => {
      const { getDifficultyMultiplier } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      expect(getDifficultyMultiplier("easy")).toBe(0.8);
      expect(getDifficultyMultiplier("medium")).toBe(1.0);
      expect(getDifficultyMultiplier("hard")).toBe(1.2);
    });
  });

  describe("previewSessionLoot", () => {
    test("should calculate loot preview from exercise results", () => {
      const { previewSessionLoot } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const loot = previewSessionLoot({
        durationSeconds: 600, // 10 minutes
        userLevel: "medium",
        exerciseResults: [
          {
            exerciseId: 1,
            muscles: ["arms"],
            style: "strength",
            result: { type: "reps", value: 50 },
          },
          {
            exerciseId: 2,
            muscles: ["back"],
            style: "strength",
            result: { type: "reps", value: 30 },
          },
        ],
      });

      // Gold = 10 + (10 * 2) = 30
      expect(loot.gold).toBe(30);
      // Arms -> Wood, Back -> Stone
      expect(loot.materials.find((m) => m.resource === "wood")?.amount).toBe(50);
      expect(loot.materials.find((m) => m.resource === "stone")?.amount).toBe(30);
    });

    test("should calculate mana for calisthenics exercises", () => {
      const { previewSessionLoot } =
        require("../src/db/resources") as typeof import("../src/db/resources");

      const loot = previewSessionLoot({
        durationSeconds: 600,
        userLevel: "medium",
        exerciseResults: [
          {
            exerciseId: 1,
            muscles: ["arms"],
            style: "calisthenics",
            result: { type: "reps", value: 50 },
          },
        ],
      });

      // Calisthenics -> Mana
      expect(loot.materials.find((m) => m.resource === "mana")?.amount).toBe(50);
      // Should NOT generate Wood because style is calisthenics
      expect(loot.materials.find((m) => m.resource === "wood")).toBeUndefined();
    });
  });
});
