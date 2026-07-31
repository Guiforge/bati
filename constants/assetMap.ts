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
// EXERCISE ASSETS (42 items)
// ============================================================

export const EXERCISE_ASSETS = {
  // The 0006 batch, renamed to the movements' official names by 0023 — the five that duplicated
  // a 0001 exercise were merged into it and their art dropped.
  lunge: require("@/assets/images/exercises/lunge.jpg"),
  burpee: require("@/assets/images/exercises/burpee.jpg"),
  mountain_climber: require("@/assets/images/exercises/mountain_climber.jpg"),
  dip: require("@/assets/images/exercises/dip.jpg"),
  pike_pushup: require("@/assets/images/exercises/pike_pushup.jpg"),
  jumping_jack: require("@/assets/images/exercises/jumping_jack.jpg"),
  high_knees: require("@/assets/images/exercises/high_knees.jpg"),
  bicycle_crunch: require("@/assets/images/exercises/bicycle_crunch.jpg"),
  diamond_pushup: require("@/assets/images/exercises/diamond_pushup.jpg"),
  single_leg_deadlift: require("@/assets/images/exercises/single_leg_deadlift.jpg"),
  cobra_stretch: require("@/assets/images/exercises/cobra_stretch.jpg"),
  warrior_pose: require("@/assets/images/exercises/warrior_pose.jpg"),
  skater_hop: require("@/assets/images/exercises/skater_hop.jpg"),
  hollow_body_hold: require("@/assets/images/exercises/hollow_body_hold.jpg"),
  // Dedicated art for the generic exercises (0001) — see docs/content/missing-covers.md
  squat: require("@/assets/images/exercises/squat.jpg"),
  pushups: require("@/assets/images/exercises/pushups.jpg"),
  pullups: require("@/assets/images/exercises/pullups.jpg"),
  wall_sit: require("@/assets/images/exercises/wall_sit.jpg"),
  plank: require("@/assets/images/exercises/plank.jpg"),
  crunch: require("@/assets/images/exercises/crunch.jpg"),
  // Bodyweight exercises (0010, art assigned in 0011) — see docs/content/missing-image.md §4
  chin_up: require("@/assets/images/exercises/chin_up.jpg"),
  superman: require("@/assets/images/exercises/superman.jpg"),
  bear_crawl: require("@/assets/images/exercises/bear_crawl.jpg"),
  russian_twist: require("@/assets/images/exercises/russian_twist.jpg"),
  side_plank: require("@/assets/images/exercises/side_plank.jpg"),
  glute_bridge: require("@/assets/images/exercises/glute_bridge.jpg"),
  standing_calf_raise: require("@/assets/images/exercises/standing_calf_raise.jpg"),
  handstand_pushup: require("@/assets/images/exercises/handstand_pushup.jpg"),
  wall_pushup: require("@/assets/images/exercises/wall_pushup.jpg"),
  flutter_kicks: require("@/assets/images/exercises/flutter_kicks.jpg"),
  inverted_row: require("@/assets/images/exercises/inverted_row.jpg"),
  dead_bug: require("@/assets/images/exercises/dead_bug.jpg"),
  hanging_leg_raise: require("@/assets/images/exercises/hanging_leg_raise.jpg"),
  jump_squat: require("@/assets/images/exercises/jump_squat.jpg"),
  reverse_crunch: require("@/assets/images/exercises/reverse_crunch.jpg"),
  curtsy_squat: require("@/assets/images/exercises/curtsy_squat.jpg"),
  scapular_pullup: require("@/assets/images/exercises/scapular_pullup.jpg"),
  l_sit: require("@/assets/images/exercises/l_sit.jpg"),
  star_jump: require("@/assets/images/exercises/star_jump.jpg"),
  windshield_wipers: require("@/assets/images/exercises/windshield_wipers.jpg"),
  // The equipment-free pulls from 0015
  table_row: require("@/assets/images/exercises/table_row.jpg"),
  towel_door_row: require("@/assets/images/exercises/towel_door_row.jpg"),
  // The mobility branch from 0024 — see docs/content/missing-image.md §7
  wrist_circles: require("@/assets/images/exercises/wrist_circles.jpg"),
  cat_cow: require("@/assets/images/exercises/cat_cow.jpg"),
  thread_the_needle: require("@/assets/images/exercises/thread_the_needle.jpg"),
  standing_forward_fold: require("@/assets/images/exercises/standing_forward_fold.jpg"),
  downward_dog: require("@/assets/images/exercises/downward_dog.jpg"),
  pigeon_pose: require("@/assets/images/exercises/pigeon_pose.jpg"),
  worlds_greatest_stretch: require("@/assets/images/exercises/worlds_greatest_stretch.jpg"),
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
  // Covers for the hand-authored quests (0002) — see docs/content/missing-covers.md
  chop_wood: require("@/assets/images/quests/chop_wood.jpg"),
  gather_stones: require("@/assets/images/quests/gather_stones.jpg"),
  raise_the_shelter: require("@/assets/images/quests/raise_the_shelter.jpg"),
  golem_strike: require("@/assets/images/quests/golem_strike.jpg"),
  golem_core: require("@/assets/images/quests/golem_core.jpg"),
  tower_climb: require("@/assets/images/quests/tower_climb.jpg"),
  knight_push: require("@/assets/images/quests/knight_push.jpg"),
  shield_wall: require("@/assets/images/quests/shield_wall.jpg"),
  core_forge: require("@/assets/images/quests/core_forge.jpg"),
  // Phase C/D/E batch — see docs/content/missing-image.md §5
  squire_awakening: require("@/assets/images/quests/squire_awakening.jpg"),
  bears_road: require("@/assets/images/quests/bears_road.jpg"),
  cellar_hauler: require("@/assets/images/quests/cellar_hauler.jpg"),
  ploughmans_vow: require("@/assets/images/quests/ploughmans_vow.jpg"),
  crows_ascent: require("@/assets/images/quests/crows_ascent.jpg"),
  colossus_trial: require("@/assets/images/quests/colossus_trial.jpg"),
  storm_of_blades: require("@/assets/images/quests/storm_of_blades.jpg"),
  serpents_coil: require("@/assets/images/quests/serpents_coil.jpg"),
  // Mobility branch (0024) — see docs/content/missing-image.md §7. Calm and unpeopled by
  // design: these are rest-day sessions, and a cover that shouts undercuts what they are for.
  dawn_ritual: require("@/assets/images/quests/dawn_ritual.jpg"),
  hearthside_unbinding: require("@/assets/images/quests/hearthside_unbinding.jpg"),
  handlers_vigil: require("@/assets/images/quests/handlers_vigil.jpg"),
} as const;

// ============================================================
// BOSS ASSETS (5 bosses)
// ============================================================

export const BOSS_ASSETS = {
  wind_wraith: require("@/assets/images/bosses/wind_wraith.jpg"),
  stone_golem: require("@/assets/images/bosses/stone_golem.jpg"),
  shadow_serpent: require("@/assets/images/bosses/shadow_serpent.jpg"),
  forest_titan: require("@/assets/images/bosses/forest_titan.jpg"),
  fire_dragon: require("@/assets/images/bosses/fire_dragon.jpg"),
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
  // Covers for the hand-authored adventures (0003) — see docs/content/missing-covers.md
  lumber_route: require("@/assets/images/adventures/lumber_route.jpg"),
  the_golem: require("@/assets/images/adventures/the_golem.jpg"),
  // The beginner on-ramp route the 8 covers above belong to
  squire_path: require("@/assets/images/adventures/squire_path.jpg"),
} as const;

// ============================================================
// VILLAGE TIER ASSETS (5 tiers) — §3 layer 1, see docs/content/missing-image.md
// ============================================================

export const VILLAGE_TIER_ASSETS = {
  1: require("@/assets/images/village/tier_1.png"),
  2: require("@/assets/images/village/tier_2.png"),
  3: require("@/assets/images/village/tier_3.png"),
  4: require("@/assets/images/village/tier_4.png"),
  5: require("@/assets/images/village/tier_5.png"),
} as const;

// ============================================================
// SPORT-FOCUS SPRITES (one per muscle group) — §3 layer 2
// ============================================================

export const SPORT_SPRITE_ASSETS = {
  arms: require("@/assets/images/village/sport_arms.png"),
  back: require("@/assets/images/village/sport_back.png"),
  chest: require("@/assets/images/village/sport_chest.png"),
  abs: require("@/assets/images/village/sport_abs.png"),
  shoulder: require("@/assets/images/village/sport_shoulder.png"),
  legs: require("@/assets/images/village/sport_legs.png"),
} as const;

// ============================================================
// BUILDING ICONS (14) — §0, see docs/content/missing-image.md
// The 6 tier-2 muscle buildings (archery_range/quarry/forge/well/windmill/farm) have no entry
// here — they reuse SPORT_SPRITE_ASSETS via getSportSpriteAsset(relatedMuscle), zero new assets.
// ============================================================

export const BUILDING_ICON_ASSETS = {
  campfire: require("@/assets/images/village/buildings/campfire.png"),
  tent: require("@/assets/images/village/buildings/tent.png"),
  training_dummy: require("@/assets/images/village/buildings/training_dummy.png"),
  wizard_tower: require("@/assets/images/village/buildings/wizard_tower.png"),
  druid_grove: require("@/assets/images/village/buildings/druid_grove.png"),
  watchtower: require("@/assets/images/village/buildings/watchtower.png"),
  castle_wall: require("@/assets/images/village/buildings/castle_wall.png"),
  armory: require("@/assets/images/village/buildings/armory.png"),
  fountain: require("@/assets/images/village/buildings/fountain.png"),
  observatory: require("@/assets/images/village/buildings/observatory.png"),
  barn: require("@/assets/images/village/buildings/barn.png"),
  dragon_lair: require("@/assets/images/village/buildings/dragon_lair.png"),
  heroes_hall: require("@/assets/images/village/buildings/heroes_hall.png"),
  champion_arena: require("@/assets/images/village/buildings/champion_arena.png"),
} as const;

// ============================================================
// TYPE EXPORTS
// ============================================================

export type ExerciseAssetKey = keyof typeof EXERCISE_ASSETS;
export type QuestAssetKey = keyof typeof QUEST_ASSETS;
export type BossAssetKey = keyof typeof BOSS_ASSETS;
export type AdventureAssetKey = keyof typeof ADVENTURE_ASSETS;
export type VillageTierKey = keyof typeof VILLAGE_TIER_ASSETS;
export type SportSpriteKey = keyof typeof SPORT_SPRITE_ASSETS;
export type BuildingIconKey = keyof typeof BUILDING_ICON_ASSETS;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Content keys are bare names (e.g. "goblin_squat"); DB imagePath columns store the full
 * bundled path (e.g. "assets/images/exercises/goblin_squat.jpg"). Strip directory + extension
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

/**
 * Get the village base-scene illustration for a tier (1-5, see db/village.ts VillageTier)
 */
export function getVillageTierAsset(tier: VillageTierKey) {
  return VILLAGE_TIER_ASSETS[tier];
}

/**
 * Get the sport-focus overlay sprite for a muscle group (see db/schema.ts MuscleCode)
 */
export function getSportSpriteAsset(muscle: SportSpriteKey) {
  return SPORT_SPRITE_ASSETS[muscle];
}

/**
 * Get the icon for a village building (see db/schema.ts BuildingCode). The 6 tier-2 muscle
 * buildings have no dedicated icon — they reuse the matching sport sprite instead ("layer,
 * don't paint", docs/content/missing-image.md §0), so callers pass the building's
 * `relatedMuscle` as fallback.
 */
export function getBuildingIconAsset(code: string, relatedMuscle?: SportSpriteKey | null) {
  const icon = BUILDING_ICON_ASSETS[code as BuildingIconKey];
  if (icon) return icon;
  if (relatedMuscle) return SPORT_SPRITE_ASSETS[relatedMuscle];
  return require("@/assets/placeholder.jpg");
}
