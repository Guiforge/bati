// The painted buildings of the buildings track: the sprites of every stage (legendary and mythic
// included), the elements (teasers, gag beats) and the engine's data, one entry per building, wired
// by scripts/bld/integrate.py. A building whose flag (constants/isoPoc.ts BLD_PEINTS) is off is not
// listed here, so every reader sees the map of today.

import type { BuildingData } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { campfire as campfireData } from "@/constants/buildings/campfire";
import { BLD_PEINTS } from "@/constants/isoPoc";
import type { BuildingCode } from "@/db/schema";
import type { Ambiance, SpriteIso } from "./isoSpec";
import { campfire as campfireSprites } from "./peints/campfire";
// integrate:imports

export type PeintBld = {
  stades: Readonly<Partial<Record<VisualStage, Record<Ambiance, SpriteIso>>>>;
  /** By the data's sprite path (`elements/teaser_r2`): the image by light and its size, canvas px. */
  elements: Readonly<
    Record<string, { jour: number; nuit: number; size: readonly [w: number, h: number] }>
  >;
  donnees: BuildingData;
};

const TOUS: Partial<Record<BuildingCode, PeintBld>> = {
  campfire: { ...campfireSprites, donnees: campfireData },
  // integrate:entries
};

/** The painted buildings that are switched on. */
export const PEINTS: Partial<Record<BuildingCode, PeintBld>> = Object.fromEntries(
  Object.entries(TOUS).filter(([code]) => BLD_PEINTS[code]),
);

/** The painted sprite of a stage in a light, when the building is painted and on. */
export const peintDe = (code: BuildingCode, stade: VisualStage, vie: Ambiance) =>
  PEINTS[code]?.stades[stade]?.[vie];
