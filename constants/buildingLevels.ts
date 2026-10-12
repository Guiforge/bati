/**
 * The building level ceiling and which painting each level shows.
 *
 * In `constants/` rather than `db/village.ts` on purpose: `constants/assetMap.ts` needs the stage
 * to pick a `require()`, and it is imported by screens that have no business opening the
 * database. Putting it next to the derivation pulled `db/client.ts` — and therefore SQLite — into
 * every module that wanted an image path, which broke two test suites before it broke anything
 * else. `db/` importing `constants/` is the direction that stays acyclic.
 */

/** The highest rank any building reaches. Who reaches it is `buildingCeiling()`, below. */
export const MAX_BUILDING_LEVEL = 10;

/** The rank the paintings top out at: ranks past it keep the "grand" art and count in the pips. */
export const BUILDING_STAGE_LEVEL = 5;

/** A tier-3 upgrade trails two rungs behind the building it extends and stops here. */
export const T3_MAX_LEVEL = 3;

/**
 * The rank a building can actually reach, and the only source of it: the pips, the sheet, the
 * milestone line and the tier-1 clamp all read this. The six upgrades stop at 3 (they used to
 * draw five pips: "3 of 5" for life). The Lair, the Hall and the Arena have finite content and
 * stop at 5; the road, the starters and the volume buildings go to 10. The deeds' ceilings must
 * equal the length of their floor tables in db/village.ts (db-village-buildings pins all four).
 */
export function buildingCeiling(building: { tier: number; code: string }): number {
  if (building.tier === 3) return T3_MAX_LEVEL;
  if (building.tier === 4)
    return building.code === "high_road" ? MAX_BUILDING_LEVEL : BUILDING_STAGE_LEVEL;
  return MAX_BUILDING_LEVEL;
}

/**
 * Ten ranks, three paintings (the art stops at rank 5). The art carries the big jumps and the opacity ramp in
 * BuiltBuildingCard fills the steps between them, which is why this is not five assets per
 * building — a decision docs/content/missing-image.md made, and this only half re-opens.
 *
 * Level 0 gets "rough" too: an unbuilt tile is a flat silhouette of what it will become, and
 * what it becomes first is the rough one.
 */
export type BuildingStage = "rough" | "solid" | "grand";

export function buildingStage(level: number): BuildingStage {
  if (level >= BUILDING_STAGE_LEVEL) return "grand";
  if (level >= 3) return "solid";
  return "rough";
}
