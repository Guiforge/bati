import { and, count, eq, inArray } from "drizzle-orm";
import { db, schema, transactionOrFallback } from "./client";
import type { DifficultyCode, MuscleCode, QuestTargetType } from "./schema";
import { USER_LEVEL_MULTIPLIER } from "./targets";
import { toRepEquivalent } from "./workUnits";

const {
  bossFights,
  bossDamageLog,
  adventures,
  adventureRuns,
  adventureSteps,
  questExercises,
  quests,
} = schema;

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
  /**
   * How many times this boss has already been beaten — 0 on the first encounter. Derived from
   * finished runs of the adventure rather than stored: a finished boss campaign IS the victory
   * (getBossBanners counts it exactly this way), so the two cannot disagree. Tier ≥ 1 is the
   * legendary form — its own painting, its own name, a bigger pool at the rematch reset.
   */
  tier: number;
  /**
   * A rare cosmetic roll (SHINY_CHANCE), per encounter like the creatures it is stolen from:
   * rolled when the session loads the fight, carried in the session snapshot so recovery keeps
   * it, forgotten when the session ends. Never persisted, never gameplay.
   */
  shiny: boolean;
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

/**
 * How far into its campaign a boss dies for a hero who exactly meets every target: nine tenths.
 * Crits, weakness and resistance are what move it earlier, and they are headroom rather than part
 * of the promise — the floor has to kill on its own, or `easy` never sees a victory.
 *
 * This is the same rule `0026_boss_pacing.sql` applied to the six seeded pools; it lives here so
 * the fallback below and the seeds cannot mean different things, and
 * `__tests__/content-invariants.test.ts` re-checks both at all three difficulties.
 *
 * It replaced a `1.3` that meant "campaigns are 30 % longer than nominal because crit fires on
 * every set" — true of the old crit rule, and the reason every boss outlived its own campaign
 * once crit had to be earned.
 */
export const CAMPAIGN_HP_FRACTION = 0.9;

/** The ceiling on crit odds, so a heroic set is an edge and never the whole fight. */
export const MAX_CRIT_CHANCE = 0.5;

/** One boss in twenty gleams. Purely cosmetic, rolled per encounter — see BossFight.shiny. */
export const SHINY_CHANCE = 0.05;

/**
 * The Triumph: what HP are *for*.
 *
 * The final blow guarantees the kill, which raised the fair question of what the pool still
 * decides. This: empty it with your own damage — meet targets, push past them for crits, land the
 * weakness — and the kill is a Triumph, worth this bonus on the session that dealt the killing
 * hit. Fall short and the final blow still fells it, at no cost but the bonus. Reward for
 * pushing, never punishment for training under target.
 *
 * ponytail: this comment claimed "twice the oath's bonus" for months while `OATH_XP_BONUS` was
 *           250 — it is 0.4×, not 2×. Only the claim is corrected here; the number is a balance
 *           call, and it wants a decision rather than a quiet edit. Against the effort-based
 *           economy (`db/xp.ts`), where an honest session pays ~300, felling a campaign boss
 *           currently pays a third of one. Raise it if that reads wrong on a device.
 */
export const TRIUMPH_XP_BONUS = 100;

/**
 * How much bigger the pool gets at each rematch: +25 % per tier, capped at double.
 *
 * Safe to exceed the campaign's damage because the kill is structural — `finishBossFight` fells
 * whatever survives the last step — so a high-tier legendary only moves the fight closer to the
 * wire, it can never strand the hero. Capped because this is a fitness app: past double, "the
 * boss grows" stops being drama and starts being a treadmill.
 */
export function tierHpMultiplier(tier: number): number {
  return Math.min(2, 1 + 0.25 * Math.max(0, tier));
}

/**
 * How the pool the hero is actually facing reads as a threat, 1-4 skulls. The Golem's 278 and
 * the Ranger's 1115 are different fights, and a browsing screen should say so before the hero
 * commits — this is display, computed from whatever the fight's real pool is (level scaling and
 * tier included, deliberately: the number on the screen is the fight in front of you).
 */
export function threatRank(totalHp: number): 1 | 2 | 3 | 4 {
  if (totalHp < 350) return 1;
  if (totalHp < 650) return 2;
  if (totalHp < 950) return 3;
  return 4;
}

/**
 * The odds a set crits, 0-1, from how far past its target it goes.
 *
 * Exported because the session screen shows this number under the rep counter: the ± control is
 * the one decision a fight offers, and it was a data-entry widget until the rule was said out
 * loud. Two copies of this formula would drift the moment either side was tuned.
 */
export function critChance(resultValue: number, targetValue: number): number {
  const overshoot = (resultValue - targetValue) / Math.max(1, targetValue);
  if (overshoot <= 0) return 0;
  return Math.min(MAX_CRIT_CHANCE, overshoot * 1.5);
}

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
  /**
   * Skip the crit roll and use this outcome. For re-landing an already-shown hit (the hero
   * corrected the rep count afterwards): the crit the screen celebrated must not be re-rolled,
   * only the magnitude recomputed.
   */
  forcedCritical?: boolean;
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

  // A crit is what the hero *decides*, and it is the only decision the session screen offers.
  //
  // The old rule asked that the target be met — but `adjustedReps` initialises to the target and a
  // time result is the elapsed timer, which reaches it. The condition held on essentially every
  // set, so crit was a flat 30 % coin flip that rewarded nothing and that nothing on screen
  // explained. Now it has to be *exceeded*, and the odds scale with how far: one extra rep on a
  // set of twelve is a real edge, capped so pushing hard never dominates the fight.
  const isCritical =
    params.forcedCritical ?? Math.random() < critChance(params.resultValue, params.targetValue);
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
 *
 * `userLevel` scales the HP pool by the same multiplier that scales every exercise target, because
 * damage is the work you did: the seeded `bossTotalHp` was tuned once at `medium`, so at `easy` the
 * campaign used to run out of steps before the boss ran out of HP — no `defeatedAt`, no victory, no
 * village banner, ever — and at `hard` the boss died two thirds of the way through.
 *
 * ponytail: HP is fixed at fight creation, so switching difficulty mid-campaign keeps the pool the
 *           first session bought. Re-scale on level change only if players actually do this.
 */
export async function getOrCreateBossFight(
  adventureId: number,
  userLevel: DifficultyCode,
): Promise<BossFight | null> {
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

  const adventure = adventureRows[0];
  if (!adventure) return null;
  if (adventure.kind !== "boss") return null;

  // The rematch tier, and the encounter's one cosmetic roll. Rolled here — the session is the
  // encounter — and nowhere else: the adventure screen's read path keeps shiny false so browsing
  // a campaign cannot flicker the gleam on and off.
  const tier = await finishedRunCount(adventureId);
  const shiny = Math.random() < SHINY_CHANCE;

  // Check if fight already exists
  const existingRows = await db
    .select()
    .from(bossFights)
    .where(eq(bossFights.adventureId, adventureId))
    .limit(1);

  const existing = existingRows[0];
  if (existing) {
    const row = existing;
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
      tier,
      shiny,
    };
  }

  // Both paths take the same multiplier, so the seeded pool and the computed fallback cannot
  // disagree about what a difficulty level costs.
  const totalHp =
    adventure.bossTotalHp != null
      ? scaleBossHp(adventure.bossTotalHp, userLevel)
      : await calculateBossHp(adventureId, userLevel);

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

  const row = result[0];
  if (!row) return null;
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
    tier,
    shiny,
  };
}

/**
 * Get boss fight by adventure ID — read without creating.
 *
 * The adventure screen's boss panel is the caller: browsing a campaign must not bring a fight into
 * existence, and it must not have to guess a difficulty to scale a pool it is only reading. Null
 * until the campaign's first session swings at it.
 */
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

  const row = rows[0];
  if (!row) return null;
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
    tier: await finishedRunCount(adventureId),
    // Browsing must not roll the dice: the gleam belongs to the encounter, not the gallery.
    shiny: false,
  };
}

/**
 * A boss's HP pool at a given difficulty. The seeded `bossTotalHp` values are expressed at
 * `medium`; this is the one place they are read as anything else.
 */
export function scaleBossHp(baseHp: number, userLevel: DifficultyCode): number {
  return Math.max(1, Math.round(baseHp * USER_LEVEL_MULTIPLIER[userLevel]));
}

/**
 * How many times the hero has finished this adventure — which for a boss campaign is how many
 * times the boss has fallen, now that `finishBossFight` guarantees the two coincide. This is the
 * fight's tier.
 */
async function finishedRunCount(adventureId: number): Promise<number> {
  const rows = await db
    .select({ finished: count() })
    .from(adventureRuns)
    .where(and(eq(adventureRuns.adventureId, adventureId), eq(adventureRuns.status, "finished")));
  return Number(rows[0]?.finished ?? 0);
}

/**
 * Fallback HP for a boss adventure that ships without an explicit `bossTotalHp`. Every seeded
 * boss sets one, so this only catches new content.
 *
 * It mirrors how the seeded values are tuned: a step deals `rounds × Σ target`, seconds count as
 * rep-equivalents like `dealDamage` treats them, and the campaign total is taken at
 * `CAMPAIGN_HP_FRACTION` then scaled by the hero's difficulty. Weakness and resistance are ignored
 * — they roughly cancel across a campaign, and this is a fallback, not a balance pass.
 *
 * It reads `targetMax` rather than the target the hero is actually given, so it runs a little hot;
 * that is the right direction for a fallback, and the invariant test only guards the seeded pools.
 */
export async function calculateBossHp(
  adventureId: number,
  userLevel: DifficultyCode,
): Promise<number> {
  // Get all quests in adventure steps
  const steps = await db
    .select({ questId: adventureSteps.questId })
    .from(adventureSteps)
    .where(eq(adventureSteps.adventureId, adventureId));

  if (steps.length === 0) return scaleBossHp(100, userLevel); // Default HP

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

  // Minimum HP of 50, taken at the campaign fraction, then scaled by the hero's difficulty.
  return scaleBossHp(Math.max(50, Math.round(totalHp * CAMPAIGN_HP_FRACTION)), userLevel);
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

    const currentFight = fightRows[0];
    if (!currentFight) {
      throw new Error(`Boss fight ${bossFightId} not found`);
    }

    const result = computeDamage(currentFight, params);

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
 *
 * @returns whether the hits were written. Two guards below drop them on purpose — a missing fight
 *   row and an already-dead boss — and the caller has to know, or it clears its pending hits and
 *   the work vanishes with no log row and no error. Empty input is `true`: nothing to write is not
 *   a failure to write.
 */
export async function persistSessionDamage(
  bossFightId: number,
  hits: PendingHit[],
  completedSessionId: number,
): Promise<boolean> {
  if (hits.length === 0) return true;

  return await transactionOrFallback(async (tx) => {
    const fightRows = await tx
      .select()
      .from(bossFights)
      .where(eq(bossFights.id, bossFightId))
      .limit(1);

    const fight = fightRows[0];
    if (!fight || fight.defeatedAt || fight.currentHp <= 0) return false;

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

    return true;
  });
}

/**
 * The final blow: the campaign's last step just completed, so the boss falls — whatever was left
 * of its pool.
 *
 * This is what makes "guaranteed kill, no failure state" *structural* instead of statistical. The
 * HP pacing is tuned so a hero who meets every target fells the boss ~90 % through the last step,
 * but tuning cannot cover a hero who trains under target, a run resumed across a rebalance, or a
 * dev jump into the last step at full HP — and in all of those the campaign used to end with a
 * victory screen and a live boss that no remaining step could ever kill. Finishing the campaign IS
 * the kill; the pool only decides whether you managed it early.
 *
 * The remainder is written to the damage log as one attributed hit, so the log's sum still equals
 * the pool and the journal shows the blow that ended it.
 *
 * @returns whether a final blow was actually dealt — `false` when the boss was already down
 *   (the common case: the pacing worked) or the fight is missing.
 */
export async function finishBossFight(
  bossFightId: number,
  completedSessionId: number,
): Promise<boolean> {
  return await transactionOrFallback(async (tx) => {
    const fightRows = await tx
      .select()
      .from(bossFights)
      .where(eq(bossFights.id, bossFightId))
      .limit(1);

    const fight = fightRows[0];
    if (!fight || fight.defeatedAt || fight.currentHp <= 0) return false;

    await tx
      .update(bossFights)
      .set({ currentHp: 0, defeatedAt: new Date(), updatedAt: new Date() })
      .where(eq(bossFights.id, bossFightId));

    await tx.insert(bossDamageLog).values({
      bossFightId,
      completedSessionId,
      exerciseId: null,
      damageDealt: fight.currentHp,
      isCritical: 0,
      muscle: null,
    });

    return true;
  });
}

/**
 * Resurrect a defeated boss for a rematch, at the tier the rematch has earned.
 *
 * This is what `startAdventureRun` calls when a new run of a beaten boss campaign begins —
 * `getBossBanners` has documented that wiring since before it existed ("resetBossFight() nulls it
 * the moment a replay starts") and counts the victory from the finished run precisely so the
 * banner survives this reset. The pool is re-derived from the adventure rather than the stale row,
 * so a rematch also picks up any rebalance and the new run's difficulty, then grows by
 * `tierHpMultiplier`: the legendary form is a bigger fight, and `finishBossFight` is why bigger
 * can never mean unwinnable.
 */
export async function resetBossFight(
  bossFightId: number,
  options: { userLevel: DifficultyCode; tier: number },
): Promise<void> {
  const fightRows = await db
    .select({ adventureId: bossFights.adventureId })
    .from(bossFights)
    .where(eq(bossFights.id, bossFightId))
    .limit(1);

  const fightRow = fightRows[0];
  if (!fightRow) return;
  const { adventureId } = fightRow;

  const adventureRows = await db
    .select({ bossTotalHp: adventures.bossTotalHp })
    .from(adventures)
    .where(eq(adventures.id, adventureId))
    .limit(1);

  const base =
    adventureRows[0]?.bossTotalHp != null
      ? scaleBossHp(adventureRows[0].bossTotalHp, options.userLevel)
      : await calculateBossHp(adventureId, options.userLevel);
  const totalHp = Math.max(1, Math.round(base * tierHpMultiplier(options.tier)));

  await db
    .update(bossFights)
    .set({
      totalHp,
      currentHp: totalHp,
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
