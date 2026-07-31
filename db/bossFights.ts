import { eq, inArray } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";
import type { MuscleCode, QuestTargetType } from "./schema";
import { toRepEquivalent } from "./workUnits";

const { bossFights, bossDamageLog, adventures, adventureSteps, questExercises, quests } = schema;

// Same fallback used by every getXAsset() helper in constants/assetMap.ts — never expose
// `| null` for imagePath, resolve to the placeholder here so callers have one code path.
const PLACEHOLDER_IMAGE_PATH = "assets/placeholder.jpg";

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
  // The monster's own painting when the campaign has one, else its cover as a fallback. Resolve
  // with getBossAsset(): a fight should show what you are hitting, not the poster for the journey.
  imagePath: string;
  // The boss wears its adventure's title. Both locales travel together so the HUD can pick one
  // without a second query — the session store holds the fight, not the adventure.
  enName: string;
  frName: string;
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

/**
 * Damage is the result value in rep-equivalents: at face value a 60 s plank hit five times
 * harder than a 12-rep squat, so the app's hardest content (low-rep strength work) dealt the
 * least damage and every boss HP had to be tuned per campaign to compensate. The conversion
 * itself now lives in ./workUnits, shared with every other aggregate that sums work.
 */

/** A crit doubles damage and fires 30 % of the time when the target is met. */
const EXPECTED_CRIT_MULTIPLIER = 1.3;

export type DamageResult = {
  damage: number;
  isCritical: boolean;
  newHp: number;
  defeated: boolean;
  weaknessBonus: boolean;
  resistancePenalty: boolean;
};

/**
 * One landed hit, held in memory until the session it belongs to is saved.
 * `roundIndex` is what lets a restarted round drop exactly its own hits.
 */
export type PendingHit = {
  roundIndex: number;
  exerciseId: number;
  damage: number;
  isCritical: boolean;
  muscle: MuscleCode | null;
};

/** The fight fields the damage maths reads. Keeps `computeDamage` callable on an in-memory fight. */
type DamageableFight = Pick<
  BossFight,
  "currentHp" | "weaknessMuscle" | "resistanceMuscle" | "defeatedAt"
>;

export type DamageParams = {
  resultValue: number;
  targetValue: number;
  muscle?: MuscleCode;
  /** Omitted means reps. Time results are normalised before they become damage. */
  targetType?: QuestTargetType;
};

/**
 * The damage maths, with no database in it.
 *
 * Split out so a live session can show a hit land without committing it: the session store runs
 * this against the fight it holds in memory and banks the result, and `dealDamage` runs the same
 * function inside its transaction. One set of rules, two moments.
 */
export function computeDamage(fight: DamageableFight, params: DamageParams): DamageResult {
  if (fight.defeatedAt || fight.currentHp <= 0) {
    return {
      damage: 0,
      isCritical: false,
      newHp: 0,
      defeated: true,
      weaknessBonus: false,
      resistancePenalty: false,
    };
  }

  // Base damage = the result value, with seconds converted to rep-equivalents
  let damage = toRepEquivalent(params.resultValue, params.targetType);
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

  const newHp = Math.max(0, fight.currentHp - damage);

  return {
    damage,
    isCritical,
    newHp,
    defeated: newHp === 0,
    weaknessBonus,
    resistancePenalty,
  };
}

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
      imagePath: adventures.imagePath,
      bossImagePath: adventures.bossImagePath,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
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
      imagePath: adventure.bossImagePath ?? adventure.imagePath ?? PLACEHOLDER_IMAGE_PATH,
      enName: adventure.enTitle,
      frName: adventure.frTitle,
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
    imagePath: adventure.bossImagePath ?? adventure.imagePath ?? PLACEHOLDER_IMAGE_PATH,
    enName: adventure.enTitle,
    frName: adventure.frTitle,
  };
}

/**
 * Get boss fight by adventure ID.
 */
/** @legacy Lecture sans création. Aucun écran ne l'appelle depuis que la session utilise
 *  getOrCreateBossFight. */
export async function getBossFightByAdventure(adventureId: number): Promise<BossFight | null> {
  const rows = await db
    .select({
      id: bossFights.id,
      adventureId: bossFights.adventureId,
      totalHp: bossFights.totalHp,
      currentHp: bossFights.currentHp,
      weaknessMuscle: bossFights.weaknessMuscle,
      resistanceMuscle: bossFights.resistanceMuscle,
      defeatedAt: bossFights.defeatedAt,
      createdAt: bossFights.createdAt,
      updatedAt: bossFights.updatedAt,
      imagePath: adventures.imagePath,
      bossImagePath: adventures.bossImagePath,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
    })
    .from(bossFights)
    .innerJoin(adventures, eq(bossFights.adventureId, adventures.id))
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
    imagePath: row.bossImagePath ?? row.imagePath ?? PLACEHOLDER_IMAGE_PATH,
    enName: row.enTitle,
    frName: row.frTitle,
  };
}

/**
 * Fallback HP for a boss adventure that ships without an explicit `bossTotalHp`. Every seeded
 * boss sets one, so this only catches new content.
 *
 * It mirrors how the seeded values were tuned: a step deals `rounds × Σ target`, seconds count
 * as rep-equivalents like `dealDamage` treats them, and the whole campaign is scaled by the
 * expected crit rate. Weakness and resistance are ignored — they roughly cancel across a
 * campaign, and this is a fallback, not a balance pass.
 */
async function calculateBossHp(adventureId: number): Promise<number> {
  // Get all quests in adventure steps
  const steps = await db
    .select({ questId: adventureSteps.questId })
    .from(adventureSteps)
    .where(eq(adventureSteps.adventureId, adventureId));

  if (steps.length === 0) return 100; // Default HP

  // A quest can appear in more than one step (e.g. repeated within a campaign); its
  // exercises must be counted once per occurrence, matching the original per-step loop.
  const stepCountByQuestId = new Map<number, number>();
  for (const step of steps) {
    stepCountByQuestId.set(step.questId, (stepCountByQuestId.get(step.questId) ?? 0) + 1);
  }

  const questIds = [...stepCountByQuestId.keys()];

  const exercises = await db
    .select({
      questId: questExercises.questId,
      targetMax: questExercises.targetMax,
      targetType: questExercises.targetType,
      rounds: quests.rounds,
    })
    .from(questExercises)
    .innerJoin(quests, eq(quests.id, questExercises.questId))
    .where(inArray(questExercises.questId, questIds));

  const totalHp = exercises.reduce((sum, ex) => {
    const perSet = toRepEquivalent(ex.targetMax, ex.targetType);
    return sum + perSet * ex.rounds * (stepCountByQuestId.get(ex.questId) ?? 0);
  }, 0);

  // Minimum HP of 50, scaled by the expected crit rate (30 % chance of double damage).
  return Math.max(50, Math.round(totalHp * EXPECTED_CRIT_MULTIPLIER));
}

// ------------------------------------------------------------
// Damage System
// ------------------------------------------------------------

/**
 * Deal damage to a boss after completing an exercise.
 */
/** @legacy Primitive un-coup. La production passe par computeDamage + persistSessionDamage
 *  depuis 2026-07-31 ; garde la couverture d'intégration du chemin d'écriture. Sortie : replier
 *  ses tests sur ces deux-là, puis supprimer. */
export function dealDamage(
  bossFightId: number,
  params: {
    exerciseId: number;
    completedSessionId?: number;
    resultValue: number;
    targetValue: number;
    muscle?: MuscleCode;
    /** Omitted means reps. Time results are normalised before they become damage. */
    targetType?: QuestTargetType;
  },
): Promise<DamageResult> {
  // Read-modify-write on currentHp, so the whole thing runs in one transaction: two
  // concurrent hits reading the same HP before either writes would otherwise silently
  // drop one of the two damage updates.
  return transactionOrFallback(async (tx) => {
    // Get current boss fight state
    const fightRows = await tx
      .select()
      .from(bossFights)
      .where(eq(bossFights.id, bossFightId))
      .limit(1);

    if (fightRows.length === 0) {
      throw new Error(`Boss fight ${bossFightId} not found`);
    }

    const result = computeDamage(fightRows[0], params);

    // Already defeated: computeDamage reports zero damage and there is nothing to write.
    if (result.damage === 0) return result;

    await tx
      .update(bossFights)
      .set({
        currentHp: result.newHp,
        defeatedAt: result.defeated ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(bossFights.id, bossFightId));

    await tx.insert(bossDamageLog).values({
      bossFightId,
      completedSessionId: params.completedSessionId ?? null,
      exerciseId: params.exerciseId,
      damageDealt: result.damage,
      isCritical: result.isCritical ? 1 : 0,
      muscle: params.muscle ?? null,
    });

    return result;
  });
}

/**
 * Commit a session's worth of hits in one transaction, tagged with the session that earned them.
 *
 * HP is recomputed from the stored row rather than trusted from the caller: the fight the session
 * has been holding in memory can be minutes old, and the dev screen can reset a boss underneath it.
 * The hits are the durable fact; the resulting HP is derived here.
 */
export async function persistSessionDamage(
  bossFightId: number,
  hits: PendingHit[],
  completedSessionId: number,
): Promise<void> {
  if (hits.length === 0) return;

  await transactionOrFallback(async (tx) => {
    const fightRows = await tx
      .select()
      .from(bossFights)
      .where(eq(bossFights.id, bossFightId))
      .limit(1);

    if (fightRows.length === 0) return;

    const fight = fightRows[0];
    if (fight.defeatedAt || fight.currentHp <= 0) return;

    const total = hits.reduce((sum, hit) => sum + hit.damage, 0);
    const newHp = Math.max(0, fight.currentHp - total);

    await tx
      .update(bossFights)
      .set({
        currentHp: newHp,
        defeatedAt: newHp === 0 ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(bossFights.id, bossFightId));

    await tx.insert(bossDamageLog).values(
      hits.map((hit) => ({
        bossFightId,
        completedSessionId,
        exerciseId: hit.exerciseId,
        damageDealt: hit.damage,
        isCritical: hit.isCritical ? 1 : 0,
        muscle: hit.muscle,
      })),
    );
  });
}

/**
 * Reset a boss fight (for replaying).
 */
/** @legacy Rejouer un boss ; prévu pour l'écran dev, jamais branché. */
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
/** @legacy L'historique des coups, maintenant qu'il porte enfin l'id de séance. Attend un
 *  écran qui l'affiche. */
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
