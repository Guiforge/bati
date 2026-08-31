import { type BuildingStage, buildingStage } from "@/constants/buildingLevels";
import type { VillagerId, VillagerPose } from "@/constants/villagers";

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
  lunge: require("@/assets/images/exercises/lunge.webp"),
  burpee: require("@/assets/images/exercises/burpee.webp"),
  mountain_climber: require("@/assets/images/exercises/mountain_climber.webp"),
  dip: require("@/assets/images/exercises/dip.webp"),
  pike_pushup: require("@/assets/images/exercises/pike_pushup.webp"),
  jumping_jack: require("@/assets/images/exercises/jumping_jack.webp"),
  high_knees: require("@/assets/images/exercises/high_knees.webp"),
  bicycle_crunch: require("@/assets/images/exercises/bicycle_crunch.webp"),
  diamond_pushup: require("@/assets/images/exercises/diamond_pushup.webp"),
  single_leg_deadlift: require("@/assets/images/exercises/single_leg_deadlift.webp"),
  cobra_stretch: require("@/assets/images/exercises/cobra_stretch.webp"),
  warrior_pose: require("@/assets/images/exercises/warrior_pose.webp"),
  skater_hop: require("@/assets/images/exercises/skater_hop.webp"),
  hollow_body_hold: require("@/assets/images/exercises/hollow_body_hold.webp"),
  // Dedicated art for the generic exercises (0001) — see docs/content/missing-covers.md
  squat: require("@/assets/images/exercises/squat.webp"),
  pushups: require("@/assets/images/exercises/pushups.webp"),
  pullups: require("@/assets/images/exercises/pullups.webp"),
  wall_sit: require("@/assets/images/exercises/wall_sit.webp"),
  plank: require("@/assets/images/exercises/plank.webp"),
  crunch: require("@/assets/images/exercises/crunch.webp"),
  // Bodyweight exercises (0010, art assigned in 0011) — see docs/content/missing-image.md §4
  chin_up: require("@/assets/images/exercises/chin_up.webp"),
  superman: require("@/assets/images/exercises/superman.webp"),
  bear_crawl: require("@/assets/images/exercises/bear_crawl.webp"),
  russian_twist: require("@/assets/images/exercises/russian_twist.webp"),
  side_plank: require("@/assets/images/exercises/side_plank.webp"),
  glute_bridge: require("@/assets/images/exercises/glute_bridge.webp"),
  standing_calf_raise: require("@/assets/images/exercises/standing_calf_raise.webp"),
  handstand_pushup: require("@/assets/images/exercises/handstand_pushup.webp"),
  wall_pushup: require("@/assets/images/exercises/wall_pushup.webp"),
  flutter_kicks: require("@/assets/images/exercises/flutter_kicks.webp"),
  inverted_row: require("@/assets/images/exercises/inverted_row.webp"),
  dead_bug: require("@/assets/images/exercises/dead_bug.webp"),
  hanging_leg_raise: require("@/assets/images/exercises/hanging_leg_raise.webp"),
  jump_squat: require("@/assets/images/exercises/jump_squat.webp"),
  reverse_crunch: require("@/assets/images/exercises/reverse_crunch.webp"),
  curtsy_squat: require("@/assets/images/exercises/curtsy_squat.webp"),
  scapular_pullup: require("@/assets/images/exercises/scapular_pullup.webp"),
  l_sit: require("@/assets/images/exercises/l_sit.webp"),
  star_jump: require("@/assets/images/exercises/star_jump.webp"),
  windshield_wipers: require("@/assets/images/exercises/windshield_wipers.webp"),
  // The equipment-free pulls from 0015
  table_row: require("@/assets/images/exercises/table_row.webp"),
  towel_door_row: require("@/assets/images/exercises/towel_door_row.webp"),
  // The mobility branch from 0024 — see docs/content/missing-image.md §7
  wrist_circles: require("@/assets/images/exercises/wrist_circles.webp"),
  cat_cow: require("@/assets/images/exercises/cat_cow.webp"),
  thread_the_needle: require("@/assets/images/exercises/thread_the_needle.webp"),
  standing_forward_fold: require("@/assets/images/exercises/standing_forward_fold.webp"),
  downward_dog: require("@/assets/images/exercises/downward_dog.webp"),
  pigeon_pose: require("@/assets/images/exercises/pigeon_pose.webp"),
  worlds_greatest_stretch: require("@/assets/images/exercises/worlds_greatest_stretch.webp"),
  // The calisthenics rungs and summits from 0032/0033. bulgarian_split_squat is still absent
  // on purpose — no usable art yet, and a wrong illustration in a training app is worse than
  // the placeholder it falls back to — the model either sits the athlete on the bench or leaves
  // them standing, five attempts.
  muscle_up: require("@/assets/images/exercises/muscle_up.webp"),
  knee_pushup: require("@/assets/images/exercises/knee_pushup.webp"),
  wall_handstand: require("@/assets/images/exercises/wall_handstand.webp"),
  dead_hang: require("@/assets/images/exercises/dead_hang.webp"),
  negative_pullup: require("@/assets/images/exercises/negative_pullup.webp"),
  tuck_l_sit: require("@/assets/images/exercises/tuck_l_sit.webp"),
  single_leg_glute_bridge: require("@/assets/images/exercises/single_leg_glute_bridge.webp"),
  toes_to_bar: require("@/assets/images/exercises/toes_to_bar.webp"),
  archer_pushup: require("@/assets/images/exercises/archer_pushup.webp"),
  pistol_squat: require("@/assets/images/exercises/pistol_squat.webp"),
  dragon_flag: require("@/assets/images/exercises/dragon_flag.webp"),
  tuck_planche: require("@/assets/images/exercises/tuck_planche.webp"),
  // The expeditions from 0041. Scenes rather than poses — a wall, a road, a horizon — because
  // nobody needs teaching to walk, and what these three have to say is *where*. The migration
  // writes `.jpg`; `keyFromPath` strips the extension, so this is the same asset.
  wardens_walk: require("@/assets/images/exercises/wardens_walk.webp"),
  messengers_run: require("@/assets/images/exercises/messengers_run.webp"),
  outriders_ride: require("@/assets/images/exercises/outriders_ride.webp"),
} as const;

// ============================================================
// QUEST COVER ASSETS (10 items)
// ============================================================

export const QUEST_ASSETS = {
  escape_collapsing_mine: require("@/assets/images/quests/escape_collapsing_mine.webp"),
  guard_fortress_gate: require("@/assets/images/quests/guard_fortress_gate.webp"),
  forge_dragon_blade: require("@/assets/images/quests/forge_dragon_blade.webp"),
  climb_titan_tower: require("@/assets/images/quests/climb_titan_tower.webp"),
  arcane_gauntlet: require("@/assets/images/quests/arcane_gauntlet.webp"),
  druid_path: require("@/assets/images/quests/druid_path.webp"),
  sprint_shadowlands: require("@/assets/images/quests/sprint_shadowlands.webp"),
  build_stronghold: require("@/assets/images/quests/build_stronghold.webp"),
  iron_gauntlet_challenge: require("@/assets/images/quests/iron_gauntlet_challenge.webp"),
  morning_champion: require("@/assets/images/quests/morning_champion.webp"),
  // Covers for the hand-authored quests (0002) — see docs/content/missing-covers.md
  chop_wood: require("@/assets/images/quests/chop_wood.webp"),
  gather_stones: require("@/assets/images/quests/gather_stones.webp"),
  raise_the_shelter: require("@/assets/images/quests/raise_the_shelter.webp"),
  golem_strike: require("@/assets/images/quests/golem_strike.webp"),
  golem_core: require("@/assets/images/quests/golem_core.webp"),
  tower_climb: require("@/assets/images/quests/tower_climb.webp"),
  knight_push: require("@/assets/images/quests/knight_push.webp"),
  shield_wall: require("@/assets/images/quests/shield_wall.webp"),
  core_forge: require("@/assets/images/quests/core_forge.webp"),
  // Phase C/D/E batch — see docs/content/missing-image.md §5
  squire_awakening: require("@/assets/images/quests/squire_awakening.webp"),
  bears_road: require("@/assets/images/quests/bears_road.webp"),
  cellar_hauler: require("@/assets/images/quests/cellar_hauler.webp"),
  ploughmans_vow: require("@/assets/images/quests/ploughmans_vow.webp"),
  crows_ascent: require("@/assets/images/quests/crows_ascent.webp"),
  colossus_trial: require("@/assets/images/quests/colossus_trial.webp"),
  storm_of_blades: require("@/assets/images/quests/storm_of_blades.webp"),
  serpents_coil: require("@/assets/images/quests/serpents_coil.webp"),
  // Mobility branch (0024) — see docs/content/missing-image.md §7. Calm and unpeopled by
  // design: these are rest-day sessions, and a cover that shouts undercuts what they are for.
  dawn_ritual: require("@/assets/images/quests/dawn_ritual.webp"),
  hearthside_unbinding: require("@/assets/images/quests/hearthside_unbinding.webp"),
  handlers_vigil: require("@/assets/images/quests/handlers_vigil.webp"),
  // The four quests that hold the 0032/0033 calisthenics movements.
  patient_ascent: require("@/assets/images/quests/patient_ascent.webp"),
  masons_footing: require("@/assets/images/quests/masons_footing.webp"),
  summit_trial: require("@/assets/images/quests/summit_trial.webp"),
  straight_arm_vigil: require("@/assets/images/quests/straight_arm_vigil.webp"),
  // The three doors out of 0042. Each cover is a route leaving somewhere, not a place to stand.
  wardens_round: require("@/assets/images/quests/wardens_round.webp"),
  word_must_travel: require("@/assets/images/quests/word_must_travel.webp"),
  long_reach: require("@/assets/images/quests/long_reach.webp"),
} as const;

// ============================================================
// BOSS ASSETS (5 bosses)
// ============================================================

export const BOSS_ASSETS = {
  wind_wraith: require("@/assets/images/bosses/wind_wraith.webp"),
  stone_golem: require("@/assets/images/bosses/stone_golem.webp"),
  shadow_serpent: require("@/assets/images/bosses/shadow_serpent.webp"),
  forest_titan: require("@/assets/images/bosses/forest_titan.webp"),
  fire_dragon: require("@/assets/images/bosses/fire_dragon.webp"),
  iron_golem: require("@/assets/images/bosses/iron_golem.webp"),
} as const;

/**
 * The legendary forms — the same monster, returned stronger for the rematch (BossFight.tier ≥ 1).
 * Keyed by the *base* key on purpose: `getBossKey` and the voices in constants/bosses.ts stay on
 * one identity per monster, and the legendary is a form of it, not a seventh boss.
 */
export const BOSS_LEGENDARY_ASSETS: Record<keyof typeof BOSS_ASSETS, number> = {
  wind_wraith: require("@/assets/images/bosses/wind_wraith_legendary.webp"),
  stone_golem: require("@/assets/images/bosses/stone_golem_legendary.webp"),
  shadow_serpent: require("@/assets/images/bosses/shadow_serpent_legendary.webp"),
  forest_titan: require("@/assets/images/bosses/forest_titan_legendary.webp"),
  fire_dragon: require("@/assets/images/bosses/fire_dragon_legendary.webp"),
  iron_golem: require("@/assets/images/bosses/iron_golem_legendary.webp"),
};

/**
 * The same monster late in the fight — cracked, leaking light, angrier. Served below 50 % HP so
 * the fight visibly costs the boss something. Base forms only: a wounded legendary would double
 * the matrix again (see the ponytail note in scripts/generate-bosses.py).
 */
export const BOSS_WOUNDED_ASSETS: Record<keyof typeof BOSS_ASSETS, number> = {
  wind_wraith: require("@/assets/images/bosses/wind_wraith_wounded.webp"),
  stone_golem: require("@/assets/images/bosses/stone_golem_wounded.webp"),
  shadow_serpent: require("@/assets/images/bosses/shadow_serpent_wounded.webp"),
  forest_titan: require("@/assets/images/bosses/forest_titan_wounded.webp"),
  fire_dragon: require("@/assets/images/bosses/fire_dragon_wounded.webp"),
  iron_golem: require("@/assets/images/bosses/iron_golem_wounded.webp"),
};

/**
 * The monster fallen — lights out, dust settling, a beaten colossus at rest. What the arena shows
 * when the killing set lands, and what every trophy of the kill shows after: a trophy is proof of
 * the defeat, not a poster of the threat.
 */
export const BOSS_DEFEATED_ASSETS: Record<keyof typeof BOSS_ASSETS, number> = {
  wind_wraith: require("@/assets/images/bosses/wind_wraith_defeated.webp"),
  stone_golem: require("@/assets/images/bosses/stone_golem_defeated.webp"),
  shadow_serpent: require("@/assets/images/bosses/shadow_serpent_defeated.webp"),
  forest_titan: require("@/assets/images/bosses/forest_titan_defeated.webp"),
  fire_dragon: require("@/assets/images/bosses/fire_dragon_defeated.webp"),
  iron_golem: require("@/assets/images/bosses/iron_golem_defeated.webp"),
};

// ============================================================
// ADVENTURE COVER ASSETS (5 campaigns)
// ============================================================

export const ADVENTURE_ASSETS = {
  scout_trial: require("@/assets/images/adventures/scout_trial.webp"),
  guardian_oath: require("@/assets/images/adventures/guardian_oath.webp"),
  monk_enlightenment: require("@/assets/images/adventures/monk_enlightenment.webp"),
  ranger_journey: require("@/assets/images/adventures/ranger_journey.webp"),
  iron_lord_conquest: require("@/assets/images/adventures/iron_lord_conquest.webp"),
  // Covers for the hand-authored adventures (0003) — see docs/content/missing-covers.md
  lumber_route: require("@/assets/images/adventures/lumber_route.webp"),
  the_golem: require("@/assets/images/adventures/the_golem.webp"),
  // The beginner on-ramp route the 8 covers above belong to
  squire_path: require("@/assets/images/adventures/squire_path.webp"),
} as const;

// ============================================================
// VILLAGE TIER ASSETS (5 tiers) — §3 layer 1, see docs/content/missing-image.md
// ============================================================

export const VILLAGE_TIER_ASSETS = {
  1: require("@/assets/images/village/tier_1.webp"),
  2: require("@/assets/images/village/tier_2.webp"),
  3: require("@/assets/images/village/tier_3.webp"),
  4: require("@/assets/images/village/tier_4.webp"),
  5: require("@/assets/images/village/tier_5.webp"),
  6: require("@/assets/images/village/tier_6.webp"),
  7: require("@/assets/images/village/tier_7.webp"),
  8: require("@/assets/images/village/tier_8.webp"),
  9: require("@/assets/images/village/tier_9.webp"),
  10: require("@/assets/images/village/tier_10.webp"),
  11: require("@/assets/images/village/tier_11.webp"),
  12: require("@/assets/images/village/tier_12.webp"),
} as const;

// ============================================================
// SPORT-FOCUS SPRITES (one per muscle group) — §3 layer 2
// ============================================================

export const SPORT_SPRITE_ASSETS = {
  arms: {
    rough: require("@/assets/images/village/sport_arms_rough.webp"),
    solid: require("@/assets/images/village/sport_arms.webp"),
    grand: require("@/assets/images/village/sport_arms_grand.webp"),
  },
  back: {
    rough: require("@/assets/images/village/sport_back_rough.webp"),
    solid: require("@/assets/images/village/sport_back.webp"),
    grand: require("@/assets/images/village/sport_back_grand.webp"),
  },
  chest: {
    rough: require("@/assets/images/village/sport_chest_rough.webp"),
    solid: require("@/assets/images/village/sport_chest.webp"),
    grand: require("@/assets/images/village/sport_chest_grand.webp"),
  },
  abs: {
    rough: require("@/assets/images/village/sport_abs_rough.webp"),
    solid: require("@/assets/images/village/sport_abs.webp"),
    grand: require("@/assets/images/village/sport_abs_grand.webp"),
  },
  shoulder: {
    rough: require("@/assets/images/village/sport_shoulder_rough.webp"),
    solid: require("@/assets/images/village/sport_shoulder.webp"),
    grand: require("@/assets/images/village/sport_shoulder_grand.webp"),
  },
  legs: {
    rough: require("@/assets/images/village/sport_legs_rough.webp"),
    solid: require("@/assets/images/village/sport_legs.webp"),
    grand: require("@/assets/images/village/sport_legs_grand.webp"),
  },
} as const;

// ============================================================
// BUILDING ICONS (14) — §0, see docs/content/missing-image.md
// The 6 tier-2 muscle buildings (archery_range/quarry/forge/well/windmill/farm) have no entry
// here — they reuse SPORT_SPRITE_ASSETS via getSportSpriteAsset(relatedMuscle), zero new assets.
// ============================================================

export const BUILDING_ICON_ASSETS = {
  campfire: {
    rough: require("@/assets/images/village/buildings/campfire_rough.webp"),
    solid: require("@/assets/images/village/buildings/campfire.webp"),
    grand: require("@/assets/images/village/buildings/campfire_grand.webp"),
  },
  tent: {
    rough: require("@/assets/images/village/buildings/tent_rough.webp"),
    solid: require("@/assets/images/village/buildings/tent.webp"),
    grand: require("@/assets/images/village/buildings/tent_grand.webp"),
  },
  training_dummy: {
    rough: require("@/assets/images/village/buildings/training_dummy_rough.webp"),
    solid: require("@/assets/images/village/buildings/training_dummy.webp"),
    grand: require("@/assets/images/village/buildings/training_dummy_grand.webp"),
  },
  wizard_tower: {
    rough: require("@/assets/images/village/buildings/wizard_tower_rough.webp"),
    solid: require("@/assets/images/village/buildings/wizard_tower.webp"),
    grand: require("@/assets/images/village/buildings/wizard_tower_grand.webp"),
  },
  druid_grove: {
    rough: require("@/assets/images/village/buildings/druid_grove_rough.webp"),
    solid: require("@/assets/images/village/buildings/druid_grove.webp"),
    grand: require("@/assets/images/village/buildings/druid_grove_grand.webp"),
  },
  watchtower: {
    rough: require("@/assets/images/village/buildings/watchtower_rough.webp"),
    solid: require("@/assets/images/village/buildings/watchtower.webp"),
    grand: require("@/assets/images/village/buildings/watchtower_grand.webp"),
  },
  castle_wall: {
    rough: require("@/assets/images/village/buildings/castle_wall_rough.webp"),
    solid: require("@/assets/images/village/buildings/castle_wall.webp"),
    grand: require("@/assets/images/village/buildings/castle_wall_grand.webp"),
  },
  armory: {
    rough: require("@/assets/images/village/buildings/armory_rough.webp"),
    solid: require("@/assets/images/village/buildings/armory.webp"),
    grand: require("@/assets/images/village/buildings/armory_grand.webp"),
  },
  fountain: {
    rough: require("@/assets/images/village/buildings/fountain_rough.webp"),
    solid: require("@/assets/images/village/buildings/fountain.webp"),
    grand: require("@/assets/images/village/buildings/fountain_grand.webp"),
  },
  observatory: {
    rough: require("@/assets/images/village/buildings/observatory_rough.webp"),
    solid: require("@/assets/images/village/buildings/observatory.webp"),
    grand: require("@/assets/images/village/buildings/observatory_grand.webp"),
  },
  barn: {
    rough: require("@/assets/images/village/buildings/barn_rough.webp"),
    solid: require("@/assets/images/village/buildings/barn.webp"),
    grand: require("@/assets/images/village/buildings/barn_grand.webp"),
  },
  dragon_lair: {
    rough: require("@/assets/images/village/buildings/dragon_lair_rough.webp"),
    solid: require("@/assets/images/village/buildings/dragon_lair.webp"),
    grand: require("@/assets/images/village/buildings/dragon_lair_grand.webp"),
  },
  heroes_hall: {
    rough: require("@/assets/images/village/buildings/heroes_hall_rough.webp"),
    solid: require("@/assets/images/village/buildings/heroes_hall.webp"),
    grand: require("@/assets/images/village/buildings/heroes_hall_grand.webp"),
  },
  champion_arena: {
    rough: require("@/assets/images/village/buildings/champion_arena_rough.webp"),
    solid: require("@/assets/images/village/buildings/champion_arena.webp"),
    grand: require("@/assets/images/village/buildings/champion_arena_grand.webp"),
  },
  high_road: {
    rough: require("@/assets/images/village/buildings/high_road_rough.webp"),
    solid: require("@/assets/images/village/buildings/high_road.webp"),
    grand: require("@/assets/images/village/buildings/high_road_grand.webp"),
  },
} as const;

// ============================================================
// VILLAGER CAMEOS (7 named x 5 poses) — see constants/villagers.ts
// ============================================================

/**
 * Typed rather than `as const` so a villager added to `VILLAGER_IDS` without art is a compile
 * error. The art is the expensive half of adding one: forgetting it is exactly the mistake worth
 * catching at build time rather than as a placeholder square on a victory screen.
 *
 * These carry an alpha channel, cut by scripts/cutout.py — a cameo is drawn over `$surface`, over
 * the boss arena and over full-bleed exercise art, and an opaque void would show on all three.
 */
export const VILLAGER_ASSETS: Record<VillagerId, Record<VillagerPose, number>> = {
  smith: {
    talk: require("@/assets/images/villagers/smith_talk.webp"),
    cheer: require("@/assets/images/villagers/smith_cheer.webp"),
    urge: require("@/assets/images/villagers/smith_urge.webp"),
    concern: require("@/assets/images/villagers/smith_concern.webp"),
    salute: require("@/assets/images/villagers/smith_salute.webp"),
  },
  watcher: {
    talk: require("@/assets/images/villagers/watcher_talk.webp"),
    cheer: require("@/assets/images/villagers/watcher_cheer.webp"),
    urge: require("@/assets/images/villagers/watcher_urge.webp"),
    concern: require("@/assets/images/villagers/watcher_concern.webp"),
    salute: require("@/assets/images/villagers/watcher_salute.webp"),
  },
  sage: {
    talk: require("@/assets/images/villagers/sage_talk.webp"),
    cheer: require("@/assets/images/villagers/sage_cheer.webp"),
    urge: require("@/assets/images/villagers/sage_urge.webp"),
    concern: require("@/assets/images/villagers/sage_concern.webp"),
    salute: require("@/assets/images/villagers/sage_salute.webp"),
  },
  champion: {
    talk: require("@/assets/images/villagers/champion_talk.webp"),
    cheer: require("@/assets/images/villagers/champion_cheer.webp"),
    urge: require("@/assets/images/villagers/champion_urge.webp"),
    concern: require("@/assets/images/villagers/champion_concern.webp"),
    salute: require("@/assets/images/villagers/champion_salute.webp"),
  },
  herbalist: {
    talk: require("@/assets/images/villagers/herbalist_talk.webp"),
    cheer: require("@/assets/images/villagers/herbalist_cheer.webp"),
    urge: require("@/assets/images/villagers/herbalist_urge.webp"),
    concern: require("@/assets/images/villagers/herbalist_concern.webp"),
    salute: require("@/assets/images/villagers/herbalist_salute.webp"),
  },
  minstrel: {
    talk: require("@/assets/images/villagers/minstrel_talk.webp"),
    cheer: require("@/assets/images/villagers/minstrel_cheer.webp"),
    urge: require("@/assets/images/villagers/minstrel_urge.webp"),
    concern: require("@/assets/images/villagers/minstrel_concern.webp"),
    salute: require("@/assets/images/villagers/minstrel_salute.webp"),
  },
  farmer: {
    talk: require("@/assets/images/villagers/farmer_talk.webp"),
    cheer: require("@/assets/images/villagers/farmer_cheer.webp"),
    urge: require("@/assets/images/villagers/farmer_urge.webp"),
    concern: require("@/assets/images/villagers/farmer_concern.webp"),
    salute: require("@/assets/images/villagers/farmer_salute.webp"),
  },
};

/**
 * No `keyFromPath` and no placeholder fallback, unlike every getter above: a villager is picked
 * from a closed union in code, never from a database `imagePath`, so both arguments are already
 * proven by the type system and there is no missing-key case left to fall back from.
 */
export function getVillagerAsset(id: VillagerId, pose: VillagerPose): number {
  return VILLAGER_ASSETS[id][pose];
}

// ============================================================
// TYPE EXPORTS
// ============================================================

/**
 * List-sized copies of EXERCISE_ASSETS, derived by scripts/thumb-exercises.py.
 *
 * The full art stays 1280px because the session hero renders it full-bleed. Everywhere else
 * shows it at 36-56px, where decoding 1280x1280 costs ~6.5 MB of bitmap per row — the picker
 * sheet showed ten at once and janked every frame on it.
 */
export const EXERCISE_THUMB_ASSETS = {
  lunge: require("@/assets/images/exercises/thumbs/lunge.webp"),
  burpee: require("@/assets/images/exercises/thumbs/burpee.webp"),
  mountain_climber: require("@/assets/images/exercises/thumbs/mountain_climber.webp"),
  dip: require("@/assets/images/exercises/thumbs/dip.webp"),
  pike_pushup: require("@/assets/images/exercises/thumbs/pike_pushup.webp"),
  jumping_jack: require("@/assets/images/exercises/thumbs/jumping_jack.webp"),
  high_knees: require("@/assets/images/exercises/thumbs/high_knees.webp"),
  bicycle_crunch: require("@/assets/images/exercises/thumbs/bicycle_crunch.webp"),
  diamond_pushup: require("@/assets/images/exercises/thumbs/diamond_pushup.webp"),
  single_leg_deadlift: require("@/assets/images/exercises/thumbs/single_leg_deadlift.webp"),
  cobra_stretch: require("@/assets/images/exercises/thumbs/cobra_stretch.webp"),
  warrior_pose: require("@/assets/images/exercises/thumbs/warrior_pose.webp"),
  skater_hop: require("@/assets/images/exercises/thumbs/skater_hop.webp"),
  hollow_body_hold: require("@/assets/images/exercises/thumbs/hollow_body_hold.webp"),
  squat: require("@/assets/images/exercises/thumbs/squat.webp"),
  pushups: require("@/assets/images/exercises/thumbs/pushups.webp"),
  pullups: require("@/assets/images/exercises/thumbs/pullups.webp"),
  wall_sit: require("@/assets/images/exercises/thumbs/wall_sit.webp"),
  plank: require("@/assets/images/exercises/thumbs/plank.webp"),
  crunch: require("@/assets/images/exercises/thumbs/crunch.webp"),
  chin_up: require("@/assets/images/exercises/thumbs/chin_up.webp"),
  superman: require("@/assets/images/exercises/thumbs/superman.webp"),
  bear_crawl: require("@/assets/images/exercises/thumbs/bear_crawl.webp"),
  russian_twist: require("@/assets/images/exercises/thumbs/russian_twist.webp"),
  side_plank: require("@/assets/images/exercises/thumbs/side_plank.webp"),
  glute_bridge: require("@/assets/images/exercises/thumbs/glute_bridge.webp"),
  standing_calf_raise: require("@/assets/images/exercises/thumbs/standing_calf_raise.webp"),
  handstand_pushup: require("@/assets/images/exercises/thumbs/handstand_pushup.webp"),
  wall_pushup: require("@/assets/images/exercises/thumbs/wall_pushup.webp"),
  flutter_kicks: require("@/assets/images/exercises/thumbs/flutter_kicks.webp"),
  inverted_row: require("@/assets/images/exercises/thumbs/inverted_row.webp"),
  dead_bug: require("@/assets/images/exercises/thumbs/dead_bug.webp"),
  hanging_leg_raise: require("@/assets/images/exercises/thumbs/hanging_leg_raise.webp"),
  jump_squat: require("@/assets/images/exercises/thumbs/jump_squat.webp"),
  reverse_crunch: require("@/assets/images/exercises/thumbs/reverse_crunch.webp"),
  curtsy_squat: require("@/assets/images/exercises/thumbs/curtsy_squat.webp"),
  scapular_pullup: require("@/assets/images/exercises/thumbs/scapular_pullup.webp"),
  l_sit: require("@/assets/images/exercises/thumbs/l_sit.webp"),
  star_jump: require("@/assets/images/exercises/thumbs/star_jump.webp"),
  windshield_wipers: require("@/assets/images/exercises/thumbs/windshield_wipers.webp"),
  table_row: require("@/assets/images/exercises/thumbs/table_row.webp"),
  towel_door_row: require("@/assets/images/exercises/thumbs/towel_door_row.webp"),
  wrist_circles: require("@/assets/images/exercises/thumbs/wrist_circles.webp"),
  cat_cow: require("@/assets/images/exercises/thumbs/cat_cow.webp"),
  thread_the_needle: require("@/assets/images/exercises/thumbs/thread_the_needle.webp"),
  standing_forward_fold: require("@/assets/images/exercises/thumbs/standing_forward_fold.webp"),
  downward_dog: require("@/assets/images/exercises/thumbs/downward_dog.webp"),
  pigeon_pose: require("@/assets/images/exercises/thumbs/pigeon_pose.webp"),
  worlds_greatest_stretch: require("@/assets/images/exercises/thumbs/worlds_greatest_stretch.webp"),
  knee_pushup: require("@/assets/images/exercises/thumbs/knee_pushup.webp"),
  wall_handstand: require("@/assets/images/exercises/thumbs/wall_handstand.webp"),
  dead_hang: require("@/assets/images/exercises/thumbs/dead_hang.webp"),
  muscle_up: require("@/assets/images/exercises/thumbs/muscle_up.webp"),
  negative_pullup: require("@/assets/images/exercises/thumbs/negative_pullup.webp"),
  tuck_l_sit: require("@/assets/images/exercises/thumbs/tuck_l_sit.webp"),
  single_leg_glute_bridge: require("@/assets/images/exercises/thumbs/single_leg_glute_bridge.webp"),
  toes_to_bar: require("@/assets/images/exercises/thumbs/toes_to_bar.webp"),
  archer_pushup: require("@/assets/images/exercises/thumbs/archer_pushup.webp"),
  pistol_squat: require("@/assets/images/exercises/thumbs/pistol_squat.webp"),
  dragon_flag: require("@/assets/images/exercises/thumbs/dragon_flag.webp"),
  tuck_planche: require("@/assets/images/exercises/thumbs/tuck_planche.webp"),
  wardens_walk: require("@/assets/images/exercises/thumbs/wardens_walk.webp"),
  messengers_run: require("@/assets/images/exercises/thumbs/messengers_run.webp"),
  outriders_ride: require("@/assets/images/exercises/thumbs/outriders_ride.webp"),
} as const;

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
 * A hero-authored movement carries its picture in the row itself: either a bundled illustration
 * it picked from the app's own art, or a `data:` URI of a photo (see `0035` and the exercise
 * editor). Both getters below take all three forms, so the five screens that render an exercise
 * do not each need to know — only the detail screen did, and everything else showed the
 * placeholder.
 */
function asUriSource(id: string): { uri: string } | null {
  return /^(data:|file:|content:|https?:)/.test(id) ? { uri: id } : null;
}

/**
 * Get exercise asset by ID (with fallback to placeholder)
 */
export function getExerciseAsset(id: string) {
  return (
    asUriSource(id) ??
    EXERCISE_ASSETS[keyFromPath(id) as ExerciseAssetKey] ??
    require("@/assets/placeholder.webp")
  );
}

/**
 * Get the list-sized exercise thumbnail by ID (with fallback to placeholder).
 *
 * Use this anywhere the art renders small — lists, rows, headers. `getExerciseAsset` is for the
 * session hero, the one slot that actually fills the screen width.
 */
export function getExerciseThumb(id: string) {
  return (
    asUriSource(id) ??
    EXERCISE_THUMB_ASSETS[keyFromPath(id) as ExerciseAssetKey] ??
    require("@/assets/placeholder.webp")
  );
}

/**
 * Get quest cover asset by ID (with fallback to placeholder)
 */
export function getQuestAsset(id: string) {
  // A hero-chosen cover is a bundled key or a `data:` photo, exactly like a movement's art.
  return (
    asUriSource(id) ??
    QUEST_ASSETS[keyFromPath(id) as QuestAssetKey] ??
    require("@/assets/placeholder.webp")
  );
}

/**
 * Get boss asset by ID (with fallback to placeholder). `state` picks the form the moment calls
 * for: "defeated" wins over everything — a dead monster is dead whatever its tier — then the
 * legendary form at tier ≥ 1, then "wounded" (base fights below 50 % HP), then the base painting.
 * Wounded and defeated exist for base monsters only (see scripts/generate-bosses.py); every
 * chain ends base → placeholder.
 */
export function getBossAsset(id: string, tier = 0, state?: "wounded" | "defeated") {
  const key = keyFromPath(id) as BossAssetKey;
  if (state === "defeated" && key in BOSS_DEFEATED_ASSETS) return BOSS_DEFEATED_ASSETS[key];
  if (tier >= 1 && key in BOSS_LEGENDARY_ASSETS) return BOSS_LEGENDARY_ASSETS[key];
  if (state === "wounded" && key in BOSS_WOUNDED_ASSETS) return BOSS_WOUNDED_ASSETS[key];
  return BOSS_ASSETS[key] ?? require("@/assets/placeholder.webp");
}

/**
 * Which monster a `bossImagePath` points at, or null when it points at nothing this app ships.
 *
 * The painting is the only place a boss's identity is written down — there is no name column, and
 * `BossFight.enName` is the *campaign's* title, so without this you fight a fire dragon called
 * "The Iron Lord's Conquest". Callers resolve `bosses.<key>.name` and its taunt pool from it, and
 * fall back to the campaign title when it is null.
 */
export function getBossKey(id: string | null | undefined): BossAssetKey | null {
  if (!id) return null;
  const key = keyFromPath(id);
  return key in BOSS_ASSETS ? (key as BossAssetKey) : null;
}

/**
 * Get adventure cover asset by ID (with fallback to placeholder)
 */
export function getAdventureAsset(id: string) {
  return (
    ADVENTURE_ASSETS[keyFromPath(id) as AdventureAssetKey] ?? require("@/assets/placeholder.webp")
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
export function getSportSpriteAsset(muscle: SportSpriteKey, stage: BuildingStage = "solid") {
  return SPORT_SPRITE_ASSETS[muscle][stage];
}

/**
 * Get the icon for a village building (see db/schema.ts BuildingCode). The 6 tier-2 muscle
 * buildings have no dedicated icon — they reuse the matching sport sprite instead ("layer,
 * don't paint", docs/content/missing-image.md §0), so callers pass the building's
 * `relatedMuscle` as fallback.
 */
/**
 * `level` is required, and deliberately has no default. It used to default to 0, which quietly
 * means "rough" — and the victory screen's growth card forgot to pass it, so the one screen that
 * exists to celebrate a building rising drew its crudest painting. A default that is also a
 * meaningful value cannot be distinguished from an omission; making it required turns the same
 * mistake into a compile error.
 */
export function getBuildingIconAsset(
  code: string,
  relatedMuscle: SportSpriteKey | null | undefined,
  level: number,
) {
  const stage = buildingStage(level);
  const icon = BUILDING_ICON_ASSETS[code as BuildingIconKey];
  if (icon) return icon[stage];
  if (relatedMuscle) return SPORT_SPRITE_ASSETS[relatedMuscle][stage];
  return require("@/assets/placeholder.webp");
}
