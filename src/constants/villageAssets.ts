import type { BuildingCode } from "@/src/db/schema";

export type VillageBuildingVariant = "locked" | "lvl_1" | "lvl_2" | "lvl_3" | "lvl_4" | "lvl_5";

export const VILLAGE_BUILDING_ASSETS: Record<BuildingCode, Record<VillageBuildingVariant, any>> = {
  campfire: {
    locked: require("@/assets/images/village/buildings/campfire/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/campfire/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/campfire/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/campfire/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/campfire/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/campfire/lvl_5.png"),
  },
  tent: {
    locked: require("@/assets/images/village/buildings/tent/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/tent/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/tent/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/tent/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/tent/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/tent/lvl_5.png"),
  },
  training_dummy: {
    locked: require("@/assets/images/village/buildings/training_dummy/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/training_dummy/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/training_dummy/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/training_dummy/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/training_dummy/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/training_dummy/lvl_5.png"),
  },
  archery_range: {
    locked: require("@/assets/images/village/buildings/archery_range/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/archery_range/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/archery_range/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/archery_range/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/archery_range/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/archery_range/lvl_5.png"),
  },
  quarry: {
    locked: require("@/assets/images/village/buildings/quarry/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/quarry/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/quarry/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/quarry/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/quarry/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/quarry/lvl_5.png"),
  },
  forge: {
    locked: require("@/assets/images/village/buildings/forge/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/forge/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/forge/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/forge/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/forge/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/forge/lvl_5.png"),
  },
  well: {
    locked: require("@/assets/images/village/buildings/well/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/well/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/well/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/well/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/well/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/well/lvl_5.png"),
  },
  windmill: {
    locked: require("@/assets/images/village/buildings/windmill/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/windmill/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/windmill/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/windmill/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/windmill/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/windmill/lvl_5.png"),
  },
  farm: {
    locked: require("@/assets/images/village/buildings/farm/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/farm/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/farm/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/farm/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/farm/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/farm/lvl_5.png"),
  },
  wizard_tower: {
    locked: require("@/assets/images/village/buildings/wizard_tower/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/wizard_tower/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/wizard_tower/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/wizard_tower/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/wizard_tower/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/wizard_tower/lvl_5.png"),
  },
  druid_grove: {
    locked: require("@/assets/images/village/buildings/druid_grove/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/druid_grove/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/druid_grove/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/druid_grove/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/druid_grove/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/druid_grove/lvl_5.png"),
  },
  watchtower: {
    locked: require("@/assets/images/village/buildings/watchtower/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/watchtower/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/watchtower/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/watchtower/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/watchtower/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/watchtower/lvl_5.png"),
  },
  castle_wall: {
    locked: require("@/assets/images/village/buildings/castle_wall/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/castle_wall/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/castle_wall/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/castle_wall/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/castle_wall/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/castle_wall/lvl_5.png"),
  },
  armory: {
    locked: require("@/assets/images/village/buildings/armory/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/armory/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/armory/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/armory/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/armory/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/armory/lvl_5.png"),
  },
  fountain: {
    locked: require("@/assets/images/village/buildings/fountain/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/fountain/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/fountain/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/fountain/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/fountain/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/fountain/lvl_5.png"),
  },
  observatory: {
    locked: require("@/assets/images/village/buildings/observatory/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/observatory/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/observatory/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/observatory/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/observatory/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/observatory/lvl_5.png"),
  },
  barn: {
    locked: require("@/assets/images/village/buildings/barn/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/barn/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/barn/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/barn/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/barn/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/barn/lvl_5.png"),
  },
  dragon_lair: {
    locked: require("@/assets/images/village/buildings/dragon_lair/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/dragon_lair/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/dragon_lair/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/dragon_lair/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/dragon_lair/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/dragon_lair/lvl_5.png"),
  },
  heroes_hall: {
    locked: require("@/assets/images/village/buildings/heroes_hall/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/heroes_hall/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/heroes_hall/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/heroes_hall/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/heroes_hall/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/heroes_hall/lvl_5.png"),
  },
  champion_arena: {
    locked: require("@/assets/images/village/buildings/champion_arena/locked.png"),
    lvl_1: require("@/assets/images/village/buildings/champion_arena/lvl_1.png"),
    lvl_2: require("@/assets/images/village/buildings/champion_arena/lvl_2.png"),
    lvl_3: require("@/assets/images/village/buildings/champion_arena/lvl_3.png"),
    lvl_4: require("@/assets/images/village/buildings/champion_arena/lvl_4.png"),
    lvl_5: require("@/assets/images/village/buildings/champion_arena/lvl_5.png"),
  },
} as const;

export function getVillageBuildingAsset(building: BuildingCode, variant: VillageBuildingVariant) {
  return VILLAGE_BUILDING_ASSETS[building][variant];
}

export type VillageBackgroundTier = 1 | 2 | 3 | 4;
export const VILLAGE_BACKGROUND_ASSETS: Record<VillageBackgroundTier, any> = {
  1: require("@/assets/images/village/backgrounds/tier_1.jpg"),
  2: require("@/assets/images/village/backgrounds/tier_2.jpg"),
  3: require("@/assets/images/village/backgrounds/tier_3.jpg"),
  4: require("@/assets/images/village/backgrounds/tier_4.jpg"),
} as const;

export function getVillageBackgroundAsset(tier: VillageBackgroundTier) {
  return VILLAGE_BACKGROUND_ASSETS[tier];
}
