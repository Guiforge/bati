import { eq, sql } from "drizzle-orm";
import { db, schema } from "./client";
import type { ResourceAmount } from "./resources";
import type { BuildingCode, MuscleCode } from "./schema";
import {
  buildingCodes,
  buildingDefinitions,
  buildingLevelThresholds,
  muscleToBuilding,
  resourceToBuilding,
} from "./schema";

const { villageBuildings, villageStats } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type VillageBuilding = {
  id: number;
  buildingType: BuildingCode;
  level: number;
  xp: number;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  updatedAt: Date | null;
};

export type VillageBuildingWithMeta = VillageBuilding & {
  tier: number;
  emoji: string;
  relatedMuscle: MuscleCode | null;
  xpToNextLevel: number;
  isMaxLevel: boolean;
};

export type VillageStatsType = {
  id: number;
  prestigeScore: number;
  totalBuildingsUnlocked: number;
  highestBuildingLevel: number;
  updatedAt: Date | null;
};

export type BuildingLevelUp = {
  buildingType: BuildingCode;
  oldLevel: number;
  newLevel: number;
};

export type BuildingUnlock = {
  buildingType: BuildingCode;
  tier: number;
};

// ------------------------------------------------------------
// Query Functions
// ------------------------------------------------------------

/**
 * Get all village buildings with metadata
 */
export async function getAllBuildings(): Promise<VillageBuildingWithMeta[]> {
  const rows = await db.select().from(villageBuildings);

  return rows.map((row) => {
    const def = buildingDefinitions[row.buildingType as BuildingCode];
    const nextLevelXp = buildingLevelThresholds[row.level + 1] ?? null;
    const isMaxLevel = row.level >= 5;

    return {
      id: row.id,
      buildingType: row.buildingType as BuildingCode,
      level: row.level,
      xp: row.xp,
      isUnlocked: Boolean(row.isUnlocked),
      unlockedAt: row.unlockedAt ?? null,
      updatedAt: row.updatedAt ?? null,
      tier: def?.tier ?? 1,
      emoji: def?.emoji ?? "❓",
      relatedMuscle: def?.relatedMuscle ?? null,
      xpToNextLevel: isMaxLevel ? 0 : (nextLevelXp ?? 0) - row.xp,
      isMaxLevel,
    };
  });
}

/**
 * Get unlocked buildings only
 */
export async function getUnlockedBuildings(): Promise<VillageBuildingWithMeta[]> {
  const all = await getAllBuildings();
  return all.filter((b) => b.isUnlocked);
}

/**
 * Get a single building by type
 */
export async function getBuildingByType(
  buildingType: BuildingCode,
): Promise<VillageBuildingWithMeta | null> {
  const rows = await db
    .select()
    .from(villageBuildings)
    .where(eq(villageBuildings.buildingType, buildingType))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const def = buildingDefinitions[buildingType];
  const nextLevelXp = buildingLevelThresholds[row.level + 1] ?? null;
  const isMaxLevel = row.level >= 5;

  return {
    id: row.id,
    buildingType: row.buildingType as BuildingCode,
    level: row.level,
    xp: row.xp,
    isUnlocked: Boolean(row.isUnlocked),
    unlockedAt: row.unlockedAt ?? null,
    updatedAt: row.updatedAt ?? null,
    tier: def?.tier ?? 1,
    emoji: def?.emoji ?? "❓",
    relatedMuscle: def?.relatedMuscle ?? null,
    xpToNextLevel: isMaxLevel ? 0 : (nextLevelXp ?? 0) - row.xp,
    isMaxLevel,
  };
}

/**
 * Get village stats
 */
export async function getVillageStats(): Promise<VillageStatsType | null> {
  const rows = await db.select().from(villageStats).limit(1);
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    prestigeScore: row.prestigeScore,
    totalBuildingsUnlocked: row.totalBuildingsUnlocked,
    highestBuildingLevel: row.highestBuildingLevel,
    updatedAt: row.updatedAt ?? null,
  };
}

// ------------------------------------------------------------
// Building XP & Level Logic
// ------------------------------------------------------------

/**
 * Calculate level from XP
 */
export function calculateLevelFromXp(xp: number): number {
  let level = 1;
  for (let l = 5; l >= 2; l--) {
    if (xp >= buildingLevelThresholds[l]) {
      level = l;
      break;
    }
  }
  return level;
}

/**
 * Add XP to a building and check for level up
 * Returns the level up info if one occurred
 */
export async function addBuildingXp(
  buildingType: BuildingCode,
  xpAmount: number,
): Promise<BuildingLevelUp | null> {
  if (xpAmount <= 0) return null;

  // Get current building state
  const building = await getBuildingByType(buildingType);
  if (!building || !building.isUnlocked) return null;
  if (building.isMaxLevel) return null;

  const oldLevel = building.level;
  const newXp = building.xp + xpAmount;
  const newLevel = calculateLevelFromXp(newXp);

  // Update building
  await db
    .update(villageBuildings)
    .set({
      xp: newXp,
      level: newLevel,
      updatedAt: new Date(),
    })
    .where(eq(villageBuildings.buildingType, buildingType));

  // Update village stats if level changed
  if (newLevel > oldLevel) {
    await updateVillageStatsAfterLevelUp(newLevel);
    return { buildingType, oldLevel, newLevel };
  }

  return null;
}

/**
 * Update village stats after a building levels up
 */
async function updateVillageStatsAfterLevelUp(newLevel: number): Promise<void> {
  const stats = await getVillageStats();
  if (!stats) return;

  if (newLevel > stats.highestBuildingLevel) {
    await db
      .update(villageStats)
      .set({
        highestBuildingLevel: newLevel,
        prestigeScore: sql`${villageStats.prestigeScore} + ${newLevel * 10}`,
        updatedAt: new Date(),
      })
      .where(eq(villageStats.id, stats.id));
  } else {
    // Just add prestige for leveling up
    await db
      .update(villageStats)
      .set({
        prestigeScore: sql`${villageStats.prestigeScore} + ${newLevel * 5}`,
        updatedAt: new Date(),
      })
      .where(eq(villageStats.id, stats.id));
  }
}

// ------------------------------------------------------------
// Building Unlock Logic
// ------------------------------------------------------------

/**
 * Check if a Tier 2 building should be unlocked based on muscle reps
 * Returns the building if it should be unlocked, null otherwise
 */
export async function checkTier2Unlock(
  muscle: MuscleCode,
  totalReps: number,
): Promise<BuildingUnlock | null> {
  const buildingType = muscleToBuilding[muscle];
  if (!buildingType) return null;

  const building = await getBuildingByType(buildingType);
  if (!building) return null;

  // Already unlocked
  if (building.isUnlocked) return null;

  // Tier 2 buildings unlock at 50 reps
  if (totalReps >= 50) {
    await unlockBuilding(buildingType);
    return { buildingType, tier: 2 };
  }

  return null;
}

/**
 * Check if a Tier 3 building should be unlocked based on prerequisite
 */
export async function checkTier3Unlock(buildingType: BuildingCode): Promise<BuildingUnlock | null> {
  const def = buildingDefinitions[buildingType];
  if (def.tier !== 3 || !def.prerequisiteBuilding) return null;

  const building = await getBuildingByType(buildingType);
  if (!building) return null;

  // Already unlocked
  if (building.isUnlocked) return null;

  // Check prerequisite building level
  const prereq = await getBuildingByType(def.prerequisiteBuilding);
  if (!prereq || !prereq.isUnlocked) return null;

  if (prereq.level >= (def.prerequisiteLevel ?? 3)) {
    await unlockBuilding(buildingType);
    return { buildingType, tier: 3 };
  }

  return null;
}

/**
 * Unlock a building
 */
export async function unlockBuilding(buildingType: BuildingCode): Promise<void> {
  await db
    .update(villageBuildings)
    .set({
      isUnlocked: true,
      unlockedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(villageBuildings.buildingType, buildingType));

  // Update village stats
  const stats = await getVillageStats();
  if (stats) {
    await db
      .update(villageStats)
      .set({
        totalBuildingsUnlocked: sql`${villageStats.totalBuildingsUnlocked} + 1`,
        prestigeScore: sql`${villageStats.prestigeScore} + 50`,
        updatedAt: new Date(),
      })
      .where(eq(villageStats.id, stats.id));
  }
}

// ------------------------------------------------------------
// Session Integration
// ------------------------------------------------------------

export type SessionBuildingResult = {
  xpGained: { buildingType: BuildingCode; xp: number }[];
  levelUps: BuildingLevelUp[];
  newUnlocks: BuildingUnlock[];
};

/**
 * Process building updates after a session completes
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Building updates require muscle-specific resource calculations
export async function processSessionBuildings(params: {
  exercisesByMuscle: Map<MuscleCode, number>;
}): Promise<SessionBuildingResult> {
  const { exercisesByMuscle } = params;
  const xpGained: { buildingType: BuildingCode; xp: number }[] = [];
  const levelUps: BuildingLevelUp[] = [];
  const newUnlocks: BuildingUnlock[] = [];

  for (const [muscle, value] of exercisesByMuscle) {
    const buildingType = muscleToBuilding[muscle];
    if (!buildingType) continue;

    // Check for Tier 2 unlock first
    const unlock = await checkTier2Unlock(muscle, value);
    if (unlock) {
      newUnlocks.push(unlock);
    }

    // Add XP to the building (only if unlocked)
    const building = await getBuildingByType(buildingType);
    if (building?.isUnlocked) {
      const xpAmount = value; // 1 rep/second = 1 XP
      xpGained.push({ buildingType, xp: xpAmount });

      const levelUp = await addBuildingXp(buildingType, xpAmount);
      if (levelUp) {
        levelUps.push(levelUp);

        // Check for Tier 3 unlocks after level up
        const tier3Buildings: BuildingCode[] = [
          "watchtower",
          "castle_wall",
          "armory",
          "fountain",
          "observatory",
          "barn",
        ];
        for (const tier3Type of tier3Buildings) {
          const tier3Unlock = await checkTier3Unlock(tier3Type);
          if (tier3Unlock) {
            newUnlocks.push(tier3Unlock);
          }
        }
      }
    }
  }

  return { xpGained, levelUps, newUnlocks };
}

/**
 * Process building updates after a session completes, based on awarded resources.
 * This supports style-based buildings (e.g. Calisthenics -> Wizard Tower, Yoga -> Druid Grove).
 */
export async function processSessionBuildingsFromResources(params: {
  resources: ResourceAmount[];
}): Promise<SessionBuildingResult> {
  const { resources } = params;
  const xpGained: { buildingType: BuildingCode; xp: number }[] = [];
  const levelUps: BuildingLevelUp[] = [];
  const newUnlocks: BuildingUnlock[] = [];

  for (const { resource, amount } of resources) {
    const buildingType = resourceToBuilding[resource];
    if (!buildingType) continue;

    // Auto-unlock tier2 buildings at first resource gain.
    // (Keeps the "zero management" philosophy.)
    const building = await getBuildingByType(buildingType);
    if (building && !building.isUnlocked && amount > 0) {
      await unlockBuilding(buildingType);
      newUnlocks.push({ buildingType, tier: 2 });
    }

    // Add XP if unlocked.
    const afterUnlock = await getBuildingByType(buildingType);
    if (afterUnlock?.isUnlocked) {
      xpGained.push({ buildingType, xp: amount });
      const levelUp = await addBuildingXp(buildingType, amount);
      if (levelUp) {
        levelUps.push(levelUp);
      }
    }
  }

  // Tier 3 unlock checks remain driven by level ups on their prerequisite buildings.
  // In the current design, special buildings don't have tier3 dependencies.

  return { xpGained, levelUps, newUnlocks };
}

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

/**
 * Ensure all building types exist in the database
 */
export async function ensureVillageBuildingsExist(): Promise<void> {
  for (const buildingType of buildingCodes) {
    const existing = await db
      .select()
      .from(villageBuildings)
      .where(eq(villageBuildings.buildingType, buildingType))
      .limit(1);

    if (existing.length === 0) {
      const def = buildingDefinitions[buildingType];
      const isStarter = def.tier === 1;

      await db.insert(villageBuildings).values({
        buildingType,
        level: 1,
        xp: 0,
        isUnlocked: isStarter,
        unlockedAt: isStarter ? new Date() : null,
        updatedAt: new Date(),
      });
    }
  }

  // Ensure village stats exists
  const statsRows = await db.select().from(villageStats).limit(1);
  if (statsRows.length === 0) {
    await db.insert(villageStats).values({
      prestigeScore: 0,
      totalBuildingsUnlocked: 3, // 3 starter buildings
      highestBuildingLevel: 1,
      updatedAt: new Date(),
    });
  }
}

/**
 * Apply resources to buildings as XP
 * Returns list of level ups
 */
export async function applyResourcesToBuildings(
  resources: ResourceAmount[],
): Promise<BuildingLevelUp[]> {
  const levelUps: BuildingLevelUp[] = [];

  for (const { resource, amount } of resources) {
    const buildingType = resourceToBuilding[resource];
    if (!buildingType) continue;

    // Add XP to building
    // 1 Resource = 1 XP
    const levelUp = await addBuildingXp(buildingType, amount);
    if (levelUp) {
      levelUps.push(levelUp);
    }
  }

  return levelUps;
}
