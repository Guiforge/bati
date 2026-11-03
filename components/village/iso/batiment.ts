// The buildings engine, pure (docs/designs/village-buildings/PROMPT.md §6, §9.4): what a building
// wears at a given rank, from its data file. Add-ons, site teasers, the gag slot, light points,
// the night-only sprite, the clan mark and the keeper. Nothing here is read by the map until
// `BATIMENT_MOTEUR` is on and a building's data has art: IsoVillage is not touched.

import {
  type AddOn,
  atteint,
  type BuildingData,
  type ChantierStade,
  type GagBeat,
  type GuardianSlot,
  gagBeatAt,
  type LightAnchor,
  type Marque,
  type NightSprite,
  type Point,
  type Teaser,
} from "@/constants/buildingData";
import { buildingStageFor, type StageRule, type VisualStage } from "@/constants/buildingStages";
import { BATIMENT_MOTEUR } from "@/constants/isoPoc";

export type { Marque };
// Local builds only (constants/isoPoc.ts). Off, BatimentMoteur renders its layers and nothing else,
// so the map is the one of today.
export { BATIMENT_MOTEUR };

const MARQUES: Partial<Record<VisualStage, Marque>> = {
  solid: "fanion",
  grand: "banniere",
  legendary: "blasonSculpte",
  mythic: "blasonLumineux",
};

export const marqueDe = (stage: VisualStage): Marque | null => MARQUES[stage] ?? null;

export type EtatBatiment = {
  stage: VisualStage;
  /** Never fewer than at the rank before: nothing disappears, bar a piece an `untilRank` hands over. */
  addOns: readonly AddOn[];
  /** At most one: the next stage's element, started on site. It leaves when the next stage paints it. */
  teaser: Teaser | null;
  /** The one beat the slot holds: each beat replaces the previous one. */
  gag: GagBeat | null;
  gagSlot: Point | null;
  /** Night only, bar the lights flagged `parJour`. Never tappable, never counted. */
  lights: readonly LightAnchor[];
  nightSprite: NightSprite | null;
  marque: Marque | null;
  marqueAt: Point | null;
  /** The mark's sprite for this form; null while it is not painted, and then nothing is drawn. */
  marqueSprite: string | null;
  gardien: (GuardianSlot & { pose: Point }) | null;
  /** The keeper's sprite at this stage (its own, else the single one). */
  gardienSprite: string | null;
  /** The scaffold and build gag of this stage, when the data gives them (else the defaults). */
  chantier: ChantierStade | null;
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
  const nightSprite = data.nightSprites?.filter((n) => atteint(n, rank, baseRank)).at(-1) ?? null;
  const gardien = data.guardian && atteint(data.guardian, rank, baseRank) ? data.guardian : null;
  return {
    stage,
    addOns: data.addOns.filter(
      (a) => atteint(a, rank, baseRank) && (a.untilRank === undefined || rank < a.untilRank),
    ),
    teaser:
      data.teasers?.find(
        (t) =>
          atteint(t, rank, baseRank) &&
          rank < t.untilRank &&
          (t.untilBase === undefined || baseRank < t.untilBase),
      ) ?? null,
    gag: gagBeatAt(data, rank, baseRank),
    gagSlot: data.gag.slot,
    lights: data.lights.filter((l) => (nuit || l.parJour) && atteint(l, rank, baseRank)),
    nightSprite: nuit ? nightSprite : null,
    marque,
    marqueAt: marque ? data.clanMark : null,
    marqueSprite: (marque && data.clanMarkSprites?.[marque]) || null,
    gardien: gardien ? { ...gardien, pose: gardien.poses?.[stage] ?? gardien.at } : null,
    gardienSprite: gardien ? (gardien.sprites?.[stage] ?? gardien.sprite) : null,
    chantier: data.chantier?.[stage] ?? null,
  };
}
