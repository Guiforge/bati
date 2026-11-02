// The buildings engine, pure (docs/designs/village-buildings/PROMPT.md §6, §9.4): what a building
// wears at a given rank, from its data file. Add-ons, site teasers, the gag slot, light points,
// the night-only sprite, the clan mark and the keeper. Nothing here is read by the map until
// `BATIMENT_MOTEUR` is on and a building's data has art: IsoVillage is not touched.

import {
  type AddOn,
  type BuildingData,
  type GagBeat,
  type GuardianSlot,
  gagBeatAt,
  type LightAnchor,
  type NightSprite,
  type Point,
  type Teaser,
} from "@/constants/buildingData";
import { buildingStageFor, type StageRule, type VisualStage } from "@/constants/buildingStages";

// Read in release too and off by default, like BUILDING_STAGES_RULE. Off, BatimentMoteur renders
// its children and nothing else, so the map is the one of today.
export const BATIMENT_MOTEUR = false;

/** The clan mark's form by stage: pennant, banner, carved crest, glowing crest. Decor houses have none. */
export type Marque = "fanion" | "banniere" | "blasonSculpte" | "blasonLumineux";

const MARQUES: Partial<Record<VisualStage, Marque>> = {
  solid: "fanion",
  grand: "banniere",
  legendary: "blasonSculpte",
  mythic: "blasonLumineux",
};

export const marqueDe = (stage: VisualStage): Marque | null => MARQUES[stage] ?? null;

export type EtatBatiment = {
  stage: VisualStage;
  /** Never fewer than at the rank before: nothing disappears. */
  addOns: readonly AddOn[];
  /** At most one: the next stage's element, started on site. It leaves when the next stage paints it. */
  teaser: Teaser | null;
  /** The one beat the slot holds: each beat replaces the previous one. */
  gag: GagBeat | null;
  gagSlot: Point | null;
  /** Night only: by day the map puts its lights out. Never tappable, never counted. */
  lights: readonly LightAnchor[];
  nightSprite: NightSprite | null;
  marque: Marque | null;
  marqueAt: Point | null;
  gardien: GuardianSlot | null;
};

export type OptionsEtat = {
  /** The rank of the building an upgrade extends (rule B). */
  baseRank?: number;
  nuit?: boolean;
  rule?: StageRule;
};

/** What the building wears at `rank`, day or night. */
export function etatBatiment(
  data: BuildingData,
  rank: number,
  { baseRank = 0, nuit = false, rule }: OptionsEtat = {},
): EtatBatiment {
  const stage = buildingStageFor(data.code, rank, baseRank, rule);
  const marque = marqueDe(stage);
  const nightSprite = data.nightSprite;
  return {
    stage,
    addOns: data.addOns.filter((a) => a.rank <= rank),
    teaser: data.teasers?.find((t) => t.fromRank <= rank && rank < t.untilRank) ?? null,
    gag: gagBeatAt(data, rank),
    gagSlot: data.gag.slot,
    lights: nuit ? data.lights.filter((l) => l.fromRank <= rank) : [],
    nightSprite: nuit && nightSprite && rank >= nightSprite.fromRank ? nightSprite : null,
    marque,
    marqueAt: marque ? data.clanMark : null,
    gardien: data.guardian && rank >= data.guardian.fromRank ? data.guardian : null,
  };
}
