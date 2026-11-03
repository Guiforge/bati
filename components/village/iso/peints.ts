// The painted buildings of the buildings track: the sprites of every stage (legendary and mythic
// included), the elements (teasers, gag beats) and the engine's data, one entry per building, wired
// by scripts/bld/integrate.py. A building whose flag (constants/isoPoc.ts BLD_PEINTS) is off is not
// listed here, so every reader sees the map of today.

import type { BuildingData } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { archery_range as archery_rangeData } from "@/constants/buildings/archery_range";
import { armory as armoryData } from "@/constants/buildings/armory";
import { barn as barnData } from "@/constants/buildings/barn";
import { campfire as campfireData } from "@/constants/buildings/campfire";
import { castle_wall as castle_wallData } from "@/constants/buildings/castle_wall";
import { champion_arena as champion_arenaData } from "@/constants/buildings/champion_arena";
import { dragon_lair as dragon_lairData } from "@/constants/buildings/dragon_lair";
import { druid_grove as druid_groveData } from "@/constants/buildings/druid_grove";
import { farm as farmData } from "@/constants/buildings/farm";
import { forge as forgeData } from "@/constants/buildings/forge";
import { fountain as fountainData } from "@/constants/buildings/fountain";
import { heroes_hall as heroes_hallData } from "@/constants/buildings/heroes_hall";
import { high_road as high_roadData } from "@/constants/buildings/high_road";
import { observatory as observatoryData } from "@/constants/buildings/observatory";
import { quarry as quarryData } from "@/constants/buildings/quarry";
import { tent as tentData } from "@/constants/buildings/tent";
import { training_dummy as training_dummyData } from "@/constants/buildings/training_dummy";
import { watchtower as watchtowerData } from "@/constants/buildings/watchtower";
import { well as wellData } from "@/constants/buildings/well";
import { windmill as windmillData } from "@/constants/buildings/windmill";
import { wizard_tower as wizard_towerData } from "@/constants/buildings/wizard_tower";
import { BLD_PEINTS } from "@/constants/isoPoc";
import type { BuildingCode } from "@/db/schema";
import type { Ambiance, SpriteIso } from "./isoSpec";
import { archery_range as archery_rangeSprites } from "./peints/archery_range";
import { armory as armorySprites } from "./peints/armory";
import { barn as barnSprites } from "./peints/barn";
import { campfire as campfireSprites } from "./peints/campfire";
import { castle_wall as castle_wallSprites } from "./peints/castle_wall";
import { champion_arena as champion_arenaSprites } from "./peints/champion_arena";
import { dragon_lair as dragon_lairSprites } from "./peints/dragon_lair";
import { druid_grove as druid_groveSprites } from "./peints/druid_grove";
import { farm as farmSprites } from "./peints/farm";
import { forge as forgeSprites } from "./peints/forge";
import { fountain as fountainSprites } from "./peints/fountain";
import { heroes_hall as heroes_hallSprites } from "./peints/heroes_hall";
import { high_road as high_roadSprites } from "./peints/high_road";
import { observatory as observatorySprites } from "./peints/observatory";
import { quarry as quarrySprites } from "./peints/quarry";
import { tent as tentSprites } from "./peints/tent";
import { training_dummy as training_dummySprites } from "./peints/training_dummy";
import { watchtower as watchtowerSprites } from "./peints/watchtower";
import { well as wellSprites } from "./peints/well";
import { windmill as windmillSprites } from "./peints/windmill";
import { wizard_tower as wizard_towerSprites } from "./peints/wizard_tower";
// integrate:imports

export type PeintBld = {
  stades: Readonly<Partial<Record<VisualStage, Record<Ambiance, SpriteIso>>>>;
  /** By the data's sprite path (`elements/teaser_r2`): the image by light and its size, canvas px. */
  elements: Readonly<
    Record<string, { jour: number; nuit: number; size: readonly [w: number, h: number] }>
  >;
  /** A windmill's sail sheet by stage (anchor on the hub): the sprite's `ailes` pivot says where it turns. */
  ailes?: Readonly<Partial<Record<VisualStage, Record<Ambiance, SpriteIso>>>>;
  donnees: BuildingData;
};

const TOUS: Partial<Record<BuildingCode, PeintBld>> = {
  campfire: { ...campfireSprites, donnees: campfireData },
  observatory: { ...observatorySprites, donnees: observatoryData },
  training_dummy: { ...training_dummySprites, donnees: training_dummyData },
  wizard_tower: { ...wizard_towerSprites, donnees: wizard_towerData },
  high_road: { ...high_roadSprites, donnees: high_roadData },
  archery_range: { ...archery_rangeSprites, donnees: archery_rangeData },
  watchtower: { ...watchtowerSprites, donnees: watchtowerData },
  forge: { ...forgeSprites, donnees: forgeData },
  armory: { ...armorySprites, donnees: armoryData },
  barn: { ...barnSprites, donnees: barnData },
  quarry: { ...quarrySprites, donnees: quarryData },
  castle_wall: { ...castle_wallSprites, donnees: castle_wallData },
  dragon_lair: { ...dragon_lairSprites, donnees: dragon_lairData },
  heroes_hall: { ...heroes_hallSprites, donnees: heroes_hallData },
  champion_arena: { ...champion_arenaSprites, donnees: champion_arenaData },
  windmill: { ...windmillSprites, donnees: windmillData },
  tent: { ...tentSprites, donnees: tentData },
  druid_grove: { ...druid_groveSprites, donnees: druid_groveData },
  farm: { ...farmSprites, donnees: farmData },
  well: { ...wellSprites, donnees: wellData },
  fountain: { ...fountainSprites, donnees: fountainData },
  // integrate:entries
};

/** The painted buildings that are switched on. */
export const PEINTS: Partial<Record<BuildingCode, PeintBld>> = Object.fromEntries(
  Object.entries(TOUS).filter(([code]) => BLD_PEINTS[code]),
);

/** The painted sprite of a stage in a light, when the building is painted and on. */
export const peintDe = (code: BuildingCode, stade: VisualStage, vie: Ambiance) =>
  PEINTS[code]?.stades[stade]?.[vie];

/** The painted sail sheet of a stage in a light (a windmill), when the building is painted and on. */
export const ailesPeintes = (code: BuildingCode, stade: VisualStage, vie: Ambiance) =>
  PEINTS[code]?.ailes?.[stade]?.[vie];
