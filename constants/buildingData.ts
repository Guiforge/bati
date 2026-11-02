/**
 * The per-building data file of the buildings track (PROMPT.md §6): rank add-ons, the gag slot,
 * light anchors and the clan mark position. One file per building in constants/buildings/, so two
 * buildings can be worked on in parallel. Nothing in the app reads these yet.
 *
 * Coordinates are px in the building's own canvas (constants/isoSpec.json), origin top left.
 */
import type { BuildingCode } from "@/db/schema";

export type Point = readonly [x: number, y: number];

export interface AddOn {
  /** First rank that shows it. Add-ons add up within a stage and are never removed. */
  rank: number;
  /** Sprite path under assets/images/village/iso/, or null while it is not painted. */
  sprite: string | null;
  /** Offset from the building's anchor, px. */
  anchorOffset: Point;
  layer: "behind" | "front";
  /** Name of a drawn animation, or null for a static piece. */
  animation: string | null;
}

/** One beat of the running gag. */
export interface GagBeat {
  rank: number;
  /** One sentence, as the card words it. */
  beat: string;
  sprite: string | null;
}

export interface LightAnchor {
  /** Only lights that move (fire, crystal pulse, beam): static windows come from the emissive pass. */
  kind: "fire" | "crystal" | "beam";
  at: Point;
  fromRank: number;
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
}

/** The one beat showing at `rank`: the latest beat not past it, or null before the first. */
export function gagBeatAt(data: BuildingData, rank: number): GagBeat | null {
  let shown: GagBeat | null = null;
  for (const b of data.gag.beats) if (b.rank <= rank) shown = b;
  return shown;
}

/** True when the beats are strictly ascending by rank, so the slot holds one beat at a time. */
export function gagIsOneAtATime(data: BuildingData): boolean {
  return data.gag.beats.every((b, i) => i === 0 || b.rank > (data.gag.beats[i - 1]?.rank ?? 0));
}
