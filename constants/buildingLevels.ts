/**
 * The building level ceiling and which painting each level shows.
 *
 * In `constants/` rather than `db/village.ts` on purpose: `constants/assetMap.ts` needs the stage
 * to pick a `require()`, and it is imported by screens that have no business opening the
 * database. Putting it next to the derivation pulled `db/client.ts` — and therefore SQLite — into
 * every module that wanted an image path, which broke two test suites before it broke anything
 * else. `db/` importing `constants/` is the direction that stays acyclic.
 */

/** Every building tops out here, and LevelPips draws exactly this many dots. */
export const MAX_BUILDING_LEVEL = 5;

/**
 * Five levels, three paintings. The art carries the big jumps and the opacity ramp in
 * BuiltBuildingCard fills the steps between them, which is why this is not five assets per
 * building — a decision docs/content/missing-image.md made, and this only half re-opens.
 *
 * Level 0 gets "rough" too: an unbuilt tile is a flat silhouette of what it will become, and
 * what it becomes first is the rough one.
 */
export type BuildingStage = "rough" | "solid" | "grand";

export function buildingStage(level: number): BuildingStage {
  if (level >= MAX_BUILDING_LEVEL) return "grand";
  if (level >= 3) return "solid";
  return "rough";
}
