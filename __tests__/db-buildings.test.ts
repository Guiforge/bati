import { createTestDb } from "./helpers/testDb";

describe("db/buildings", () => {
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

  describe("getAllBuildings", () => {
    test("should return all building types", async () => {
      const { getAllBuildings } = require("../db/buildings") as typeof import("../db/buildings");

      const buildings = await getAllBuildings();
      expect(buildings.length).toBe(20); // 3 tier1 + 8 tier2 + 6 tier3 + 3 tier4
    });
  });

  describe("getUnlockedBuildings", () => {
    test("should return only starter buildings by default", async () => {
      const { getUnlockedBuildings } =
        require("../db/buildings") as typeof import("../db/buildings");

      const unlocked = await getUnlockedBuildings();
      expect(unlocked.length).toBe(3); // campfire, tent, training_dummy
      expect(unlocked.find((b) => b.buildingType === "campfire")).toBeDefined();
      expect(unlocked.find((b) => b.buildingType === "tent")).toBeDefined();
      expect(unlocked.find((b) => b.buildingType === "training_dummy")).toBeDefined();
    });
  });

  describe("getBuildingByType", () => {
    test("should return a specific building", async () => {
      const { getBuildingByType } = require("../db/buildings") as typeof import("../db/buildings");

      const campfire = await getBuildingByType("campfire");
      expect(campfire).not.toBeNull();
      expect(campfire?.buildingType).toBe("campfire");
      expect(campfire?.tier).toBe(1);
      expect(campfire?.emoji).toBe("🔥");
      expect(campfire?.isUnlocked).toBe(true);
    });

    test("should return locked status for tier 2 buildings", async () => {
      const { getBuildingByType } = require("../db/buildings") as typeof import("../db/buildings");

      const archeryRange = await getBuildingByType("archery_range");
      expect(archeryRange).not.toBeNull();
      expect(archeryRange?.isUnlocked).toBe(false);
      expect(archeryRange?.tier).toBe(2);
    });
  });

  describe("getVillageStats", () => {
    test("should return village stats", async () => {
      const { getVillageStats } = require("../db/buildings") as typeof import("../db/buildings");

      const stats = await getVillageStats();
      expect(stats).not.toBeNull();
      expect(stats?.totalBuildingsUnlocked).toBe(3);
      expect(stats?.highestBuildingLevel).toBe(1);
      expect(stats?.prestigeScore).toBe(0);
    });
  });

  describe("calculateLevelFromXp", () => {
    test("should calculate correct levels", () => {
      const { calculateLevelFromXp } =
        require("../db/buildings") as typeof import("../db/buildings");

      expect(calculateLevelFromXp(0)).toBe(1);
      expect(calculateLevelFromXp(50)).toBe(1);
      expect(calculateLevelFromXp(100)).toBe(2);
      expect(calculateLevelFromXp(299)).toBe(2);
      expect(calculateLevelFromXp(300)).toBe(3);
      expect(calculateLevelFromXp(599)).toBe(3);
      expect(calculateLevelFromXp(600)).toBe(4);
      expect(calculateLevelFromXp(999)).toBe(4);
      expect(calculateLevelFromXp(1000)).toBe(5);
      expect(calculateLevelFromXp(9999)).toBe(5);
    });
  });

  describe("unlockBuilding", () => {
    test("should unlock a building", async () => {
      const { unlockBuilding, getBuildingByType, getVillageStats } =
        require("../db/buildings") as typeof import("../db/buildings");

      // Initially locked
      let forge = await getBuildingByType("forge");
      expect(forge?.isUnlocked).toBe(false);

      // Unlock it
      await unlockBuilding("forge");

      // Now unlocked
      forge = await getBuildingByType("forge");
      expect(forge?.isUnlocked).toBe(true);
      expect(forge?.unlockedAt).not.toBeNull();

      // Stats updated
      const stats = await getVillageStats();
      expect(stats?.totalBuildingsUnlocked).toBe(4);
      expect(stats?.prestigeScore).toBeGreaterThan(0);
    });
  });

  describe("addBuildingXp", () => {
    test("should add XP to an unlocked building", async () => {
      const { addBuildingXp, getBuildingByType, unlockBuilding } =
        require("../db/buildings") as typeof import("../db/buildings");

      // First unlock the building
      await unlockBuilding("quarry");
      let quarry = await getBuildingByType("quarry");
      expect(quarry?.xp).toBe(0);

      // Add XP
      await addBuildingXp("quarry", 50);
      quarry = await getBuildingByType("quarry");
      expect(quarry?.xp).toBe(50);
    });

    test("should not add XP to locked buildings", async () => {
      const { addBuildingXp, getBuildingByType } =
        require("../db/buildings") as typeof import("../db/buildings");

      // Well is still locked
      const result = await addBuildingXp("well", 100);
      expect(result).toBeNull();

      const well = await getBuildingByType("well");
      expect(well?.xp).toBe(0);
    });

    test("should trigger level up when XP threshold reached", async () => {
      const { addBuildingXp, getBuildingByType, unlockBuilding } =
        require("../db/buildings") as typeof import("../db/buildings");

      await unlockBuilding("windmill");
      let windmill = await getBuildingByType("windmill");
      expect(windmill?.level).toBe(1);

      // Add enough XP for level 2
      const levelUp = await addBuildingXp("windmill", 100);
      expect(levelUp).not.toBeNull();
      expect(levelUp?.oldLevel).toBe(1);
      expect(levelUp?.newLevel).toBe(2);

      windmill = await getBuildingByType("windmill");
      expect(windmill?.level).toBe(2);
    });
  });

  describe("applyResourcesToBuildings", () => {
    test("should apply resources to correct buildings", async () => {
      const { applyResourcesToBuildings, getBuildingByType, unlockBuilding } =
        require("../db/buildings") as typeof import("../db/buildings");

      // Unlock buildings first so they can gain XP
      await unlockBuilding("archery_range");
      await unlockBuilding("wizard_tower");

      type ResourceAmount = import("../db/resources").ResourceAmount;

      const resources: ResourceAmount[] = [
        { resource: "wood", amount: 100 }, // Archery Range -> Level 2
        { resource: "mana", amount: 100 }, // Wizard Tower -> Level 2
        { resource: "gold", amount: 100 }, // Ignored
      ];

      const levelUps = await applyResourcesToBuildings(resources);

      expect(levelUps).toHaveLength(2);

      const archery = await getBuildingByType("archery_range");
      expect(archery?.level).toBe(2);
      expect(archery?.xp).toBe(100);

      const wizard = await getBuildingByType("wizard_tower");
      expect(wizard?.level).toBe(2);
      expect(wizard?.xp).toBe(100);
    });
  });
});
