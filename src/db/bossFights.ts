import { eq } from "drizzle-orm";
import { db, schema } from "./client";
import { addResources } from "./resources";
import type { MuscleCode } from "./schema";

const { bossFights, bossDamageLog, adventures, adventureSteps, questExercises } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type BossFight = {
  id: number;
  adventureId: number;
  totalHp: number;
  currentHp: number;
  weaknessMuscle: MuscleCode | null;
  resistanceMuscle: MuscleCode | null;
  defeatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BossDamageEntry = {
  id: number;
  bossFightId: number;
  completedSessionId: number | null;
  exerciseId: number | null;
  damageDealt: number;
  isCritical: boolean;
  muscle: MuscleCode | null;
  createdAt: Date;
};

export type DamageResult = {
  damage: number;
  isCritical: boolean;
  newHp: number;
  defeated: boolean;
  weaknessBonus: boolean;
  resistancePenalty: boolean;
  bossTokensEarned: number; // Tokens earned when boss is defeated
};

// ------------------------------------------------------------
// Boss Fight CRUD
// ------------------------------------------------------------

/**
 * Get or create a boss fight for an adventure.
 * If the adventure is kind="boss" and no fight exists, create one.
 */
export async function getOrCreateBossFight(adventureId: number): Promise<BossFight | null> {
  // Check if adventure is a boss
  const adventureRows = await db
    .select({
      id: adventures.id,
      kind: adventures.kind,
      bossTotalHp: adventures.bossTotalHp,
      bossWeaknessMuscle: adventures.bossWeaknessMuscle,
      bossResistanceMuscle: adventures.bossResistanceMuscle,
    })
    .from(adventures)
    .where(eq(adventures.id, adventureId))
    .limit(1);

  if (adventureRows.length === 0) return null;

  const adventure = adventureRows[0];
  if (adventure.kind !== "boss") return null;

  // Check if fight already exists
  const existingRows = await db
    .select()
    .from(bossFights)
    .where(eq(bossFights.adventureId, adventureId))
    .limit(1);

  if (existingRows.length > 0) {
    const row = existingRows[0];
    return {
      id: row.id,
      adventureId: row.adventureId,
      totalHp: row.totalHp,
      currentHp: row.currentHp,
      weaknessMuscle: row.weaknessMuscle as MuscleCode | null,
      resistanceMuscle: row.resistanceMuscle as MuscleCode | null,
      defeatedAt: row.defeatedAt,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    };
  }

  // Calculate total HP from adventure steps
  const totalHp = adventure.bossTotalHp ?? (await calculateBossHp(adventureId));

  // Create new boss fight
  const result = await db
    .insert(bossFights)
    .values({
      adventureId,
      totalHp,
      currentHp: totalHp,
      weaknessMuscle: adventure.bossWeaknessMuscle,
      resistanceMuscle: adventure.bossResistanceMuscle,
    })
    .returning();

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    adventureId: row.adventureId,
    totalHp: row.totalHp,
    currentHp: row.currentHp,
    weaknessMuscle: row.weaknessMuscle as MuscleCode | null,
    resistanceMuscle: row.resistanceMuscle as MuscleCode | null,
    defeatedAt: row.defeatedAt,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

/**
 * Get boss fight by adventure ID.
 */
export async function getBossFightByAdventure(adventureId: number): Promise<BossFight | null> {
  const rows = await db
    .select()
    .from(bossFights)
    .where(eq(bossFights.adventureId, adventureId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    adventureId: row.adventureId,
    totalHp: row.totalHp,
    currentHp: row.currentHp,
    weaknessMuscle: row.weaknessMuscle as MuscleCode | null,
    resistanceMuscle: row.resistanceMuscle as MuscleCode | null,
    defeatedAt: row.defeatedAt,
    createdAt: row.createdAt ?? new Date(),
    updatedAt: row.updatedAt ?? new Date(),
  };
}

/**
 * Calculate total HP for a boss based on exercise targets.
 * HP = sum of all target values across all quest steps.
 */
async function calculateBossHp(adventureId: number): Promise<number> {
  // Get all quests in adventure steps
  const steps = await db
    .select({ questId: adventureSteps.questId })
    .from(adventureSteps)
    .where(eq(adventureSteps.adventureId, adventureId));

  if (steps.length === 0) return 100; // Default HP

  let totalHp = 0;
  for (const step of steps) {
    const exercises = await db
      .select({ targetMax: questExercises.targetMax })
      .from(questExercises)
      .where(eq(questExercises.questId, step.questId));

    for (const ex of exercises) {
      totalHp += ex.targetMax;
    }
  }

  // Minimum HP of 50, multiply by difficulty factor
  return Math.max(50, totalHp);
}

// ------------------------------------------------------------
// Damage System
// ------------------------------------------------------------

/**
 * Deal damage to a boss after completing an exercise.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Boss damage calculation with phase transitions and combat logic
export async function dealDamage(
  bossFightId: number,
  params: {
    exerciseId: number;
    completedSessionId?: number;
    resultValue: number;
    targetValue: number;
    muscle?: MuscleCode;
  }
): Promise<DamageResult> {
  // Get current boss fight state
  const fightRows = await db
    .select()
    .from(bossFights)
    .where(eq(bossFights.id, bossFightId))
    .limit(1);

  if (fightRows.length === 0) {
    throw new Error(`Boss fight ${bossFightId} not found`);
  }

  const fight = fightRows[0];

  // If already defeated, no damage
  if (fight.defeatedAt || fight.currentHp <= 0) {
    return {
      damage: 0,
      isCritical: false,
      newHp: 0,
      defeated: true,
      weaknessBonus: false,
      resistancePenalty: false,
      bossTokensEarned: 0,
    };
  }

  // Base damage = result value (reps or seconds)
  let damage = params.resultValue;
  let weaknessBonus = false;
  let resistancePenalty = false;

  // Apply weakness bonus (1.5x damage)
  if (params.muscle && fight.weaknessMuscle === params.muscle) {
    damage = Math.floor(damage * 1.5);
    weaknessBonus = true;
  }

  // Apply resistance penalty (0.5x damage)
  if (params.muscle && fight.resistanceMuscle === params.muscle) {
    damage = Math.floor(damage * 0.5);
    resistancePenalty = true;
  }

  // Check for critical hit (exceeded target = 30% crit chance)
  const isCritical = params.resultValue >= params.targetValue && Math.random() < 0.3;
  if (isCritical) {
    damage = damage * 2;
  }

  // Ensure minimum 1 damage
  damage = Math.max(1, damage);

  // Calculate new HP
  const newHp = Math.max(0, fight.currentHp - damage);
  const defeated = newHp === 0;

  // Calculate boss tokens if defeated (based on total HP)
  // 1 token per 100 HP, minimum 1 token
  const bossTokensEarned = defeated ? Math.max(1, Math.floor(fight.totalHp / 100)) : 0;

  // Update boss fight
  await db
    .update(bossFights)
    .set({
      currentHp: newHp,
      defeatedAt: defeated ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(bossFights.id, bossFightId));

  // Log the damage
  await db.insert(bossDamageLog).values({
    bossFightId,
    completedSessionId: params.completedSessionId ?? null,
    exerciseId: params.exerciseId,
    damageDealt: damage,
    isCritical: isCritical ? 1 : 0,
    muscle: params.muscle ?? null,
  });

  // Award boss tokens when defeated
  if (defeated && bossTokensEarned > 0) {
    await addResources([{ resource: "boss_token", amount: bossTokensEarned }], {
      completedSessionId: params.completedSessionId,
      reason: "Boss defeated",
      transactionType: "earned",
    });
  }

  return {
    damage,
    isCritical,
    newHp,
    defeated,
    weaknessBonus,
    resistancePenalty,
    bossTokensEarned,
  };
}

/**
 * Reset a boss fight (for replaying).
 */
export async function resetBossFight(bossFightId: number): Promise<void> {
  const fightRows = await db
    .select({ totalHp: bossFights.totalHp })
    .from(bossFights)
    .where(eq(bossFights.id, bossFightId))
    .limit(1);

  if (fightRows.length === 0) return;

  await db
    .update(bossFights)
    .set({
      currentHp: fightRows[0].totalHp,
      defeatedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(bossFights.id, bossFightId));
}

/**
 * Get damage history for a boss fight.
 */
export async function getBossDamageHistory(bossFightId: number): Promise<BossDamageEntry[]> {
  const rows = await db
    .select()
    .from(bossDamageLog)
    .where(eq(bossDamageLog.bossFightId, bossFightId));

  return rows.map((row) => ({
    id: row.id,
    bossFightId: row.bossFightId,
    completedSessionId: row.completedSessionId,
    exerciseId: row.exerciseId,
    damageDealt: row.damageDealt,
    isCritical: row.isCritical === 1,
    muscle: row.muscle as MuscleCode | null,
    createdAt: row.createdAt ?? new Date(),
  }));
}
