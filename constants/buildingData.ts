/**
 * The per-building data file of the buildings track (PROMPT.md §6): rank add-ons, the gag slot,
 * light anchors and the clan mark position. One file per building in constants/buildings/, so two
 * buildings can be worked on in parallel. Nothing in the app reads these yet.
 *
 * Coordinates are px in the building's own canvas (constants/isoSpec.json), origin top left.
 */
import type { BuildingCode } from "@/db/schema";
import type { VisualStage } from "./buildingStages";

export type Point = readonly [x: number, y: number];

/** The clan mark's form by stage: pennant, banner, carved crest, glowing crest. Decor houses have none. */
export type Marque = "fanion" | "banniere" | "blasonSculpte" | "blasonLumineux";

/**
 * Rule B (an upgrade's look follows its base): any element can wait for the base building's rank
 * too. Left out, only the building's own rank counts.
 */
export interface DepuisBase {
  fromBase?: number;
}

/** True when `item` shows at `rang` for a base of rank `base`: the one test every data element goes through. */
export function atteint(
  item: DepuisBase & ({ rank: number } | { fromRank: number }),
  rang: number,
  base: number,
): boolean {
  const depuis = "rank" in item ? item.rank : item.fromRank;
  return rang >= depuis && base >= (item.fromBase ?? 0);
}

export interface AddOn extends DepuisBase {
  /** First rank that shows it. Add-ons add up within a stage and are never removed, except by `untilRank`. */
  rank: number;
  /**
   * The rank where a bigger piece replaces it (excluded). The three-overlay rule: at most three
   * overlays stand on a building, so an old piece leaves when the next one is painted over its place.
   */
  untilRank?: number;
  /** Sprite path under assets/images/village/iso/, or null while it is not painted. */
  sprite: string | null;
  /** Offset from the building's anchor, px. */
  anchorOffset: Point;
  layer: "behind" | "front";
  /** Name of a drawn animation, or null for a static piece. */
  animation: string | null;
}

/** One beat of the running gag. */
export interface GagBeat extends DepuisBase {
  rank: number;
  /** One sentence, as the card words it. */
  beat: string;
  sprite: string | null;
}

export interface LightAnchor extends DepuisBase {
  /**
   * `fire`, `crystal`, `beam` and `glyphe` breathe on the map's clock; `fenetre` is a window the
   * emissive pass cannot light (a fixed point, it never moves).
   */
  kind: "fire" | "crystal" | "beam" | "fenetre" | "glyphe";
  at: Point;
  fromRank: number;
  /** Also lit by day: the mythic stage's magic layer. Left out, the light is the night's. */
  parJour?: boolean;
}

/** A site teaser (PROMPT.md §6): the start of the next stage's element, on site from `fromRank` until `untilRank` (excluded), when the next painting paints it finished. */
export interface Teaser extends DepuisBase {
  fromRank: number;
  untilRank: number;
  sprite: string | null;
  /** Offset from the building's anchor, px. */
  anchorOffset: Point;
}

/** The one object that only exists at night (a low moon, an aurora), keyed. */
export interface NightSprite extends DepuisBase {
  fromRank: number;
  sprite: string | null;
  anchorOffset: Point;
}

/** Where the keeper stands. It reacts to a show; it has no name and no lines. */
export interface GuardianSlot extends DepuisBase {
  fromRank: number;
  at: Point;
  sprite: string | null;
  /** Where it stands, by stage, when it moves house with the building (otherwise `at`). */
  poses?: Partial<Record<VisualStage, Point>>;
}

/** The site's scaffold of a stage being built, and where the build gag stands, by stage. */
export interface ChantierStade {
  /** The scaffold's anchor, offset from the building's anchor, px. Left out: the anchor itself. */
  echafaudage?: { anchorOffset: Point; sprite: string | null };
  /** The build gag's own slot while the scaffold stands. Left out: the gag slot. */
  gag?: { at: Point; sprite: string | null };
}

export interface BuildingData {
  code: BuildingCode;
  /** True while the entries are empty or invented for the shape: no art exists yet. */
  placeholder: boolean;
  addOns: readonly AddOn[];
  gag: {
    /** Where the slot sits, null until the maquette fixes it. */
    slot: Point | null;
    /** One beat per rank at most, ascending: each beat replaces the previous one in the slot. */
    beats: readonly GagBeat[];
  };
  lights: readonly LightAnchor[];
  /** Pennant (solid) to glowing crest (mythic) share one position. Null until fixed. */
  clanMark: Point | null;
  /** The buildings engine's extra layers (components/village/iso/batiment.ts); absent means none. */
  teasers?: readonly Teaser[];
  /** The night-only object, as a list: the last entry whose rank is reached stands. */
  nightSprites?: readonly NightSprite[];
  guardian?: GuardianSlot;
  /** The clan mark's sprite by form; a form with no entry draws nothing (never a vector stand-in). */
  clanMarkSprites?: Partial<Record<Marque, string>>;
  /** By the stage being built (the one the tap raises the building to). */
  chantier?: Partial<Record<VisualStage, ChantierStade>>;
}

/** The one beat showing at `rank`: the latest beat not past it, or null before the first. */
export function gagBeatAt(
  data: BuildingData,
  rank: number,
  base: number = Number.POSITIVE_INFINITY,
): GagBeat | null {
  let shown: GagBeat | null = null;
  for (const b of data.gag.beats) if (atteint(b, rank, base)) shown = b;
  return shown;
}

/** True when the beats are strictly ascending by rank, so the slot holds one beat at a time. */
export function gagIsOneAtATime(data: BuildingData): boolean {
  return data.gag.beats.every((b, i) => i === 0 || b.rank > (data.gag.beats[i - 1]?.rank ?? 0));
}
