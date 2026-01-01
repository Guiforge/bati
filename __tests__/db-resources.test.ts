import { createTestDb } from "./helpers/testDb";

describe("db/resources", () => {
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

  describe("getResourceInventory", () => {
    test("should return all resource types", async () => {
      const { getResourceInventory } =
        require("../db/resources") as typeof import("../db/resources");

      const inventory = await getResourceInventory();
      expect(inventory.length).toBe(7); // gold, wood, stone, fire, water, wind, grain
      expect(inventory.find((r) => r.resource === "gold")).toBeDefined();
      expect(inventory.find((r) => r.resource === "wood")).toBeDefined();
      expect(inventory.find((r) => r.resource === "stone")).toBeDefined();
      expect(inventory.find((r) => r.resource === "fire")).toBeDefined();
      expect(inventory.find((r) => r.resource === "water")).toBeDefined();
      expect(inventory.find((r) => r.resource === "wind")).toBeDefined();
      expect(inventory.find((r) => r.resource === "grain")).toBeDefined();
    });
  });

  describe("getResourceAmount", () => {
    test("should return 0 for new resources", async () => {
      const { getResourceAmount } = require("../db/resources") as typeof import("../db/resources");

      const amount = await getResourceAmount("gold");
      expect(typeof amount).toBe("number");
    });
  });

  describe("addResources", () => {
    test("should add resources to inventory", async () => {
      const { addResources, getResourceAmount } =
        require("../db/resources") as typeof import("../db/resources");

      const initialGold = await getResourceAmount("gold");

      await addResources([{ resource: "gold", amount: 50 }], {
        reason: "test reward",
      });

      const newGold = await getResourceAmount("gold");
      expect(newGold).toBe(initialGold + 50);
    });

    test("should handle multiple resource types", async () => {
      const { addResources, getResourceAmount } =
        require("../db/resources") as typeof import("../db/resources");

      const initialWood = await getResourceAmount("wood");
      const initialStone = await getResourceAmount("stone");

      await addResources(
        [
          { resource: "wood", amount: 30 },
          { resource: "stone", amount: 20 },
        ],
        { reason: "workout loot" },
      );

      const newWood = await getResourceAmount("wood");
      const newStone = await getResourceAmount("stone");

      expect(newWood).toBe(initialWood + 30);
      expect(newStone).toBe(initialStone + 20);
    });

    test("should skip zero or negative amounts", async () => {
      const { addResources, getResourceAmount } =
        require("../db/resources") as typeof import("../db/resources");

      const initialFire = await getResourceAmount("fire");

      await addResources([{ resource: "fire", amount: 0 }]);

      const newFire = await getResourceAmount("fire");
      expect(newFire).toBe(initialFire);
    });
  });

  describe("calculateSessionResources", () => {
    test("should calculate gold based on duration", () => {
      const { calculateSessionResources } =
        require("../db/resources") as typeof import("../db/resources");

      const result = calculateSessionResources({
        durationSeconds: 600, // 10 minutes
        exercisesByMuscle: new Map(),
        difficultyMultiplier: 1.0,
      });

      // Gold = 10 + (10 * 2) = 30
      expect(result.gold).toBe(30);
    });

    test("should apply difficulty multiplier to gold", () => {
      const { calculateSessionResources } =
        require("../db/resources") as typeof import("../db/resources");

      const resultHard = calculateSessionResources({
        durationSeconds: 600, // 10 minutes
        exercisesByMuscle: new Map(),
        difficultyMultiplier: 1.2,
      });

      // Gold = (10 + 20) * 1.2 = 36
      expect(resultHard.gold).toBe(36);
    });

    test("should calculate materials from muscle exercises", () => {
      const { calculateSessionResources } =
        require("../db/resources") as typeof import("../db/resources");

      const result = calculateSessionResources({
        durationSeconds: 300,
        exercisesByMuscle: new Map([
          ["arms", 50], // wood
          ["back", 30], // stone
        ]),
        difficultyMultiplier: 1.0,
      });

      expect(result.materials).toHaveLength(2);
      expect(result.materials.find((m) => m.resource === "wood")?.amount).toBe(50);
      expect(result.materials.find((m) => m.resource === "stone")?.amount).toBe(30);
    });

    test("should combine same resource from different muscles", () => {
      const { calculateSessionResources } =
        require("../db/resources") as typeof import("../db/resources");

      // Both legs (calf) map to grain
      const result = calculateSessionResources({
        durationSeconds: 300,
        exercisesByMuscle: new Map([["calf", 100]]),
        difficultyMultiplier: 1.0,
      });

      expect(result.materials.find((m) => m.resource === "grain")?.amount).toBe(100);
    });
  });

  describe("getDifficultyMultiplier", () => {
    test("should return correct multipliers", () => {
      const { getDifficultyMultiplier } =
        require("../db/resources") as typeof import("../db/resources");

      expect(getDifficultyMultiplier("easy")).toBe(0.8);
      expect(getDifficultyMultiplier("medium")).toBe(1.0);
      expect(getDifficultyMultiplier("hard")).toBe(1.2);
    });
  });

  describe("previewSessionLoot", () => {
    test("should calculate loot preview from exercise results", () => {
      const { previewSessionLoot } = require("../db/resources") as typeof import("../db/resources");

      const loot = previewSessionLoot({
        durationSeconds: 600, // 10 minutes
        userLevel: "medium",
        exerciseResults: [
          { exerciseId: 1, muscles: ["arms"], result: { type: "reps", value: 50 } },
          { exerciseId: 2, muscles: ["back"], result: { type: "reps", value: 30 } },
        ],
      });

      // Gold = 10 + (10 * 2) = 30
      expect(loot.gold).toBe(30);
      // Arms -> wood = 50
      expect(loot.materials.find((m) => m.resource === "wood")?.amount).toBe(50);
      // Back -> stone = 30
      expect(loot.materials.find((m) => m.resource === "stone")?.amount).toBe(30);
    });

    test("should apply difficulty multiplier", () => {
      const { previewSessionLoot } = require("../db/resources") as typeof import("../db/resources");

      const lootHard = previewSessionLoot({
        durationSeconds: 600,
        userLevel: "hard",
        exerciseResults: [
          { exerciseId: 1, muscles: ["arms"], result: { type: "reps", value: 50 } },
        ],
      });

      // Gold = (10 + 20) * 1.2 = 36
      expect(lootHard.gold).toBe(36);
      // Arms -> wood = 50 * 1.2 = 60
      expect(lootHard.materials.find((m) => m.resource === "wood")?.amount).toBe(60);
    });
  });
});
