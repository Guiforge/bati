import { eq, sql } from "drizzle-orm";
import { db, schema } from "./client";
import type { ExerciseStyle, MuscleCode, ResourceCode, ResourceTransactionType } from "./schema";
import { muscleToResource, resourceCodes } from "./schema";

const { resourceInventory, resourceTransactions } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type ResourceAmount = {
  resource: ResourceCode;
  amount: number;
};

export type ResourceLoot = {
  gold: number;
  materials: ResourceAmount[];
};

export type ResourceTransaction = {
  id: number;
  resource: ResourceCode;
  amount: number;
  transactionType: ResourceTransactionType;
  completedSessionId: number | null;
  reason: string;
  createdAt: Date;
};

// ------------------------------------------------------------
// Query Functions
// ------------------------------------------------------------

/**
 * Get current resource inventory for all resources
 */
export async function getResourceInventory(): Promise<ResourceAmount[]> {
  const rows = await db.select().from(resourceInventory);
  return rows.map((row) => ({
    resource: row.resource as ResourceCode,
    amount: row.amount,
  }));
}

/**
 * Get a single resource amount
 */
export async function getResourceAmount(resource: ResourceCode): Promise<number> {
  const rows = await db
    .select({ amount: resourceInventory.amount })
    .from(resourceInventory)
    .where(eq(resourceInventory.resource, resource))
    .limit(1);
  return rows[0]?.amount ?? 0;
}

/**
 * Add resources to inventory and log the transaction
 */
export async function addResources(
  resources: ResourceAmount[],
  options: {
    completedSessionId?: number;
    reason?: string;
    transactionType?: ResourceTransactionType;
  } = {},
): Promise<void> {
  const { completedSessionId, reason = "", transactionType = "earned" } = options;

  for (const { resource, amount } of resources) {
    if (amount <= 0) continue;

    // Update inventory
    await db
      .update(resourceInventory)
      .set({
        amount: sql`${resourceInventory.amount} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(resourceInventory.resource, resource));

    // Log transaction
    await db.insert(resourceTransactions).values({
      resource,
      amount,
      transactionType,
      completedSessionId: completedSessionId ?? null,
      reason,
      createdAt: new Date(),
    });
  }
}

/**
 * Spend resources from inventory
 * Returns true if successful, false if insufficient resources
 */
export async function spendResources(
  resources: ResourceAmount[],
  options: {
    reason?: string;
  } = {},
): Promise<boolean> {
  const { reason = "spent" } = options;

  // First check if we have enough of each resource
  for (const { resource, amount } of resources) {
    const current = await getResourceAmount(resource);
    if (current < amount) {
      return false; // Insufficient resources
    }
  }

  // Deduct resources
  for (const { resource, amount } of resources) {
    if (amount <= 0) continue;

    await db
      .update(resourceInventory)
      .set({
        amount: sql`${resourceInventory.amount} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(resourceInventory.resource, resource));

    // Log transaction (negative amount for spending)
    await db.insert(resourceTransactions).values({
      resource,
      amount: -amount,
      transactionType: "spent",
      reason,
      createdAt: new Date(),
    });
  }

  return true;
}

// ------------------------------------------------------------
// Resource Calculation from Workout
// ------------------------------------------------------------

/**
 * Calculate resources earned from a completed workout session
 */
export function calculateSessionResources(params: {
  durationSeconds: number;
  exercisesByMuscle: Map<MuscleCode, number>; // muscle -> total reps/seconds
  exercisesByStyle: Map<ExerciseStyle, number>; // style -> total reps/seconds
  difficultyMultiplier?: number; // 0.8 for easy, 1.0 for medium, 1.2 for hard
}): ResourceLoot {
  const {
    durationSeconds,
    exercisesByMuscle,
    exercisesByStyle,
    difficultyMultiplier = 1.0,
  } = params;

  // Gold: base 10 + 2 per minute
  const durationMinutes = Math.floor(durationSeconds / 60);
  const gold = Math.floor((10 + durationMinutes * 2) * difficultyMultiplier);

  // Materials: based on exercises by muscle and style
  const materials: ResourceAmount[] = [];

  // Helper to add material
  const addMaterial = (resource: ResourceCode, amount: number) => {
    if (amount <= 0) return;
    const existing = materials.find((m) => m.resource === resource);
    if (existing) {
      existing.amount += amount;
    } else {
      materials.push({ resource, amount });
    }
  };

  // 1. Style-based resources (Mana, Leaf)
  for (const [style, value] of exercisesByStyle) {
    const amount = Math.floor(value * difficultyMultiplier);
    if (style === "calisthenics") {
      addMaterial("mana", amount);
    } else if (style === "yoga") {
      addMaterial("leaf", amount);
    }
  }

  // 2. Muscle-based resources (Wood, Stone, etc.)
  // Only for Strength and Cardio styles (handled by caller filtering or here?)
  // The caller should only populate exercisesByMuscle for exercises that SHOULD generate muscle resources.
  // OR we iterate exercisesByMuscle and add them.
  // If an exercise is Calisthenics, it shouldn't contribute to Muscle resources in this model?
  // "Strength Training (Muscle-Based) ... Special Styles (Skill-Based)"
  // Let's assume they are mutually exclusive for simplicity and clarity.
  // So the caller must separate them.

  for (const [muscle, value] of exercisesByMuscle) {
    const resource = muscleToResource[muscle];
    if (!resource) continue;
    const amount = Math.floor(value * difficultyMultiplier);
    addMaterial(resource, amount);
  }

  return { gold, materials };
}

/**
 * Map difficulty code to multiplier
 */
export function getDifficultyMultiplier(difficulty: "easy" | "medium" | "hard"): number {
  switch (difficulty) {
    case "easy":
      return 0.8;
    case "medium":
      return 1.0;
    case "hard":
      return 1.2;
    default:
      return 1.0;
  }
}

/**
 * Preview the loot that would be earned from a session (without awarding)
 * This is a pure calculation - does not touch the database
 */
export function previewSessionLoot(params: {
  durationSeconds: number;
  userLevel: "easy" | "medium" | "hard";
  exerciseResults: ExerciseResultForResources[];
}): ResourceLoot {
  const { durationSeconds, userLevel, exerciseResults } = params;

  // Build maps
  const muscleMap = new Map<MuscleCode, number>();
  const styleMap = new Map<ExerciseStyle, number>();

  for (const result of exerciseResults) {
    const { style, muscles, result: res } = result;

    if (style === "calisthenics" || style === "yoga") {
      // Style-based resources
      const current = styleMap.get(style) ?? 0;
      styleMap.set(style, current + res.value);
    } else {
      // Muscle-based resources (Strength, Cardio)
      for (const muscle of muscles) {
        const current = muscleMap.get(muscle) ?? 0;
        muscleMap.set(muscle, current + res.value);
      }
    }
  }

  // Calculate loot
  const difficultyMultiplier = getDifficultyMultiplier(userLevel);
  return calculateSessionResources({
    durationSeconds,
    exercisesByMuscle: muscleMap,
    exercisesByStyle: styleMap,
    difficultyMultiplier,
  });
}

// ------------------------------------------------------------
// Initialization
// ------------------------------------------------------------

/**
 * Ensure all resource types exist in inventory (called during app init)
 * This is a safety net - the migration should have already seeded them
 */
export async function ensureResourceInventoryExists(): Promise<void> {
  for (const resource of resourceCodes) {
    const existing = await db
      .select()
      .from(resourceInventory)
      .where(eq(resourceInventory.resource, resource))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(resourceInventory).values({
        resource,
        amount: 0,
        updatedAt: new Date(),
      });
    }
  }
}

// ------------------------------------------------------------
// Session Resource Awarding
// ------------------------------------------------------------

export type ExerciseResultForResources = {
  exerciseId: number;
  muscles: MuscleCode[];
  style: ExerciseStyle;
  result: { type: "reps" | "time"; value: number };
};

/**
 * Calculate and award resources for a completed session
 * Returns the loot that was awarded for display
 */
export async function awardSessionResources(params: {
  durationSeconds: number;
  userLevel: "easy" | "medium" | "hard";
  completedSessionId: number;
  exerciseResults: ExerciseResultForResources[];
}): Promise<ResourceLoot> {
  const { durationSeconds, userLevel, completedSessionId, exerciseResults } = params;

  // Build maps
  const muscleMap = new Map<MuscleCode, number>();
  const styleMap = new Map<ExerciseStyle, number>();

  for (const result of exerciseResults) {
    const { style, muscles, result: res } = result;

    if (style === "calisthenics" || style === "yoga") {
      // Style-based resources
      const current = styleMap.get(style) ?? 0;
      styleMap.set(style, current + res.value);
    } else {
      // Muscle-based resources (Strength, Cardio)
      for (const muscle of muscles) {
        const current = muscleMap.get(muscle) ?? 0;
        muscleMap.set(muscle, current + res.value);
      }
    }
  }

  // Calculate loot
  const difficultyMultiplier = getDifficultyMultiplier(userLevel);
  const loot = calculateSessionResources({
    durationSeconds,
    exercisesByMuscle: muscleMap,
    exercisesByStyle: styleMap,
    difficultyMultiplier,
  });

  // Award gold
  if (loot.gold > 0) {
    await addResources([{ resource: "gold", amount: loot.gold }], {
      completedSessionId,
      reason: "session_complete",
      transactionType: "earned",
    });
  }

  // Award materials
  if (loot.materials.length > 0) {
    await addResources(loot.materials, {
      completedSessionId,
      reason: "session_complete",
      transactionType: "earned",
    });
  }

  return loot;
}
