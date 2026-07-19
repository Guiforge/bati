/**
 * BATI Asset Map
 *
 * Centralized mapping of all exercise, quest, and boss image assets.
 * Auto-generated from content specification.
 *
 * Usage:
 * import { EXERCISE_ASSETS, BOSS_ASSETS } from '@/constants/assetMap';
 * <Image source={EXERCISE_ASSETS.goblin_squat} />
 */

// ============================================================
// EXERCISE ASSETS (20 items)
// ============================================================

export const EXERCISE_ASSETS = {
  goblin_squat: require("@/assets/images/exercises/goblin_squat.png"),
  dragon_pushup: require("@/assets/images/exercises/dragon_pushup.png"),
  iron_grip_pullup: require("@/assets/images/exercises/iron_grip_pullup.png"),
  stone_guardian_plank: require("@/assets/images/exercises/stone_guardian_plank.png"),
  shadow_step_lunge: require("@/assets/images/exercises/shadow_step_lunge.png"),
  berserker_burpee: require("@/assets/images/exercises/berserker_burpee.png"),
  monk_mountain_climber: require("@/assets/images/exercises/monk_mountain_climber.png"),
  titan_dip: require("@/assets/images/exercises/titan_dip.png"),
  archer_pike_pushup: require("@/assets/images/exercises/archer_pike_pushup.png"),
  wall_sentinel_hold: require("@/assets/images/exercises/wall_sentinel_hold.png"),
  thunder_jumping_jack: require("@/assets/images/exercises/thunder_jumping_jack.png"),
  paladin_high_knee: require("@/assets/images/exercises/paladin_high_knee.png"),
  wizard_bicycle_crunch: require("@/assets/images/exercises/wizard_bicycle_crunch.png"),
  knight_diamond_pushup: require("@/assets/images/exercises/knight_diamond_pushup.png"),
  ranger_single_leg_deadlift: require("@/assets/images/exercises/ranger_single_leg_deadlift.png"),
  druid_cobra_stretch: require("@/assets/images/exercises/druid_cobra_stretch.png"),
  samurai_warrior_pose: require("@/assets/images/exercises/samurai_warrior_pose.png"),
  rogue_skater_hop: require("@/assets/images/exercises/rogue_skater_hop.png"),
  barbarian_overhead_press: require("@/assets/images/exercises/barbarian_overhead_press.png"),
  alchemist_hollow_body_hold: require("@/assets/images/exercises/alchemist_hollow_body.png"),
} as const;

// ============================================================
// QUEST COVER ASSETS (10 items)
// ============================================================

export const QUEST_ASSETS = {
  escape_collapsing_mine: require("@/assets/images/quests/escape_collapsing_mine.jpg"),
  guard_fortress_gate: require("@/assets/images/quests/guard_fortress_gate.jpg"),
  forge_dragon_blade: require("@/assets/images/quests/forge_dragon_blade.jpg"),
  climb_titan_tower: require("@/assets/images/quests/climb_titan_tower.jpg"),
  arcane_gauntlet: require("@/assets/images/quests/arcane_gauntlet.jpg"),
  druid_path: require("@/assets/images/quests/druid_path.jpg"),
  sprint_shadowlands: require("@/assets/images/quests/sprint_shadowlands.jpg"),
  build_stronghold: require("@/assets/images/quests/build_stronghold.jpg"),
  iron_gauntlet_challenge: require("@/assets/images/quests/iron_gauntlet_challenge.jpg"),
  morning_champion: require("@/assets/images/quests/morning_champion.jpg"),
} as const;

// ============================================================
// BOSS ASSETS (5 bosses)
// ============================================================

export const BOSS_ASSETS = {
  wind_wraith: require("@/assets/images/bosses/wind_wraith.png"),
  stone_golem: require("@/assets/images/bosses/stone_golem.png"),
  shadow_serpent: require("@/assets/images/bosses/shadow_serpent.png"),
  forest_titan: require("@/assets/images/bosses/forest_titan.png"),
  fire_dragon: require("@/assets/images/bosses/fire_dragon.png"),
} as const;

// ============================================================
// ADVENTURE COVER ASSETS (5 campaigns)
// ============================================================

export const ADVENTURE_ASSETS = {
  scout_trial: require("@/assets/images/adventures/scout_trial.jpg"),
  guardian_oath: require("@/assets/images/adventures/guardian_oath.jpg"),
  monk_enlightenment: require("@/assets/images/adventures/monk_enlightenment.jpg"),
  ranger_journey: require("@/assets/images/adventures/ranger_journey.jpg"),
  iron_lord_conquest: require("@/assets/images/adventures/iron_lord_conquest.jpg"),
} as const;

// ============================================================
// TYPE EXPORTS
// ============================================================

export type ExerciseAssetKey = keyof typeof EXERCISE_ASSETS;
export type QuestAssetKey = keyof typeof QUEST_ASSETS;
export type BossAssetKey = keyof typeof BOSS_ASSETS;
export type AdventureAssetKey = keyof typeof ADVENTURE_ASSETS;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Content keys are bare names (e.g. "goblin_squat"); DB imagePath columns store the full
 * bundled path (e.g. "assets/images/exercises/goblin_squat.png"). Strip directory + extension
 * so either form resolves to the same map key.
 */
function keyFromPath(id: string): string {
  return (
    id
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") ?? id
  );
}

/**
 * Get exercise asset by ID (with fallback to placeholder)
 */
export function getExerciseAsset(id: string) {
  return (
    EXERCISE_ASSETS[keyFromPath(id) as ExerciseAssetKey] ?? require("@/assets/placeholder.jpg")
  );
}

/**
 * Get quest cover asset by ID (with fallback to placeholder)
 */
export function getQuestAsset(id: string) {
  return QUEST_ASSETS[keyFromPath(id) as QuestAssetKey] ?? require("@/assets/placeholder.jpg");
}

/**
 * Get boss asset by ID (with fallback to placeholder)
 */
export function getBossAsset(id: string) {
  return BOSS_ASSETS[keyFromPath(id) as BossAssetKey] ?? require("@/assets/placeholder.jpg");
}

/**
 * Get adventure cover asset by ID (with fallback to placeholder)
 */
export function getAdventureAsset(id: string) {
  return (
    ADVENTURE_ASSETS[keyFromPath(id) as AdventureAssetKey] ?? require("@/assets/placeholder.jpg")
  );
}
