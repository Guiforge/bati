/**
 * Where each building stands on a village tier painting.
 *
 * An anchor is a fixed spot (x, y in percent of the square painting, from its top-left)
 * on a visible structure: a roof, a door, a tower top, a fire. Nothing is drawn there any
 * more (the gold dots were taken off the painting): the anchor is only where the painting
 * leans in when that building has just risen. Every position was placed by eye on the
 * painting it belongs to, so re-painting a tier means re-placing its anchors. Tiers 1 and 3
 * are wider than tall: their anchors assume the square `cover` crop, sides trimmed evenly.
 * y stays above 72, below that the screen's title covers the art.
 */
import type { BuildingCode } from "@/db/schema";
import type { VillageTier } from "@/db/village";

export type SceneAnchor = { code: BuildingCode; x: number; y: number };

export const VILLAGE_ANCHORS: Record<VillageTier, readonly SceneAnchor[]> = {
  // Hamlet: one thatched hut, its smoking chimney, door, lit window, roof, ladder and woodpile
  1: [
    { code: "forge", x: 36, y: 36 },
    { code: "barn", x: 58, y: 46 },
    { code: "tent", x: 35, y: 64 },
    { code: "campfire", x: 46, y: 63 },
    { code: "watchtower", x: 79, y: 60 },
    { code: "training_dummy", x: 70, y: 71 },
  ],
  // Clearing: fire in the stone ring, hide rack above it, two cabins, the stump, the boulders
  2: [
    { code: "campfire", x: 50, y: 64 },
    { code: "archery_range", x: 50, y: 48 },
    { code: "tent", x: 18, y: 52 },
    { code: "barn", x: 80, y: 52 },
    { code: "training_dummy", x: 36, y: 57 },
    { code: "quarry", x: 86, y: 65 },
  ],
  // Village: four cottages round the well, two smoking chimneys, the fence and its gate post
  3: [
    { code: "well", x: 50, y: 61 },
    { code: "tent", x: 13, y: 52 },
    { code: "campfire", x: 32, y: 27 },
    { code: "heroes_hall", x: 36, y: 45 },
    { code: "farm", x: 62, y: 47 },
    { code: "barn", x: 87, y: 48 },
    { code: "forge", x: 90, y: 29 },
    { code: "training_dummy", x: 64, y: 68 },
    { code: "castle_wall", x: 10, y: 68 },
  ],
  // Crossroads: water mill, signpost, palisade, carts on the road, the houses and tower behind
  4: [
    { code: "windmill", x: 22, y: 46 },
    { code: "high_road", x: 43, y: 37 },
    { code: "tent", x: 37, y: 25 },
    { code: "watchtower", x: 64, y: 17 },
    { code: "heroes_hall", x: 72, y: 25 },
    { code: "campfire", x: 79, y: 36 },
    { code: "farm", x: 62, y: 43 },
    { code: "castle_wall", x: 82, y: 52 },
    { code: "training_dummy", x: 36, y: 58 },
    { code: "quarry", x: 68, y: 59 },
  ],
  // Town: gate and its towers, bell tower, well in the square, market stalls, lamps, houses
  5: [
    { code: "well", x: 50, y: 64 },
    { code: "castle_wall", x: 50, y: 40 },
    { code: "watchtower", x: 61, y: 24 },
    { code: "observatory", x: 32, y: 16 },
    { code: "heroes_hall", x: 28, y: 38 },
    { code: "forge", x: 15, y: 45 },
    { code: "campfire", x: 28, y: 53 },
    { code: "tent", x: 68, y: 47 },
    { code: "armory", x: 88, y: 42 },
    { code: "training_dummy", x: 73, y: 65 },
  ],
  // Free Town: gatehouse, left tower, houses on both sides, lamps, the bridge over the canal
  6: [
    { code: "castle_wall", x: 51, y: 38 },
    { code: "watchtower", x: 30, y: 16 },
    { code: "tent", x: 32, y: 42 },
    { code: "barn", x: 13, y: 44 },
    { code: "campfire", x: 22, y: 56 },
    { code: "training_dummy", x: 32, y: 62 },
    { code: "heroes_hall", x: 70, y: 33 },
    { code: "armory", x: 87, y: 40 },
    { code: "high_road", x: 50, y: 60 },
  ],
  // City: bannered keep, scaffolded tower, round towers, lit gate, houses, shed, left bridge
  7: [
    { code: "heroes_hall", x: 40, y: 20 },
    { code: "observatory", x: 68, y: 20 },
    { code: "watchtower", x: 15, y: 28 },
    { code: "wizard_tower", x: 85, y: 28 },
    { code: "tent", x: 28, y: 45 },
    { code: "forge", x: 52, y: 44 },
    { code: "training_dummy", x: 8, y: 45 },
    { code: "armory", x: 84, y: 50 },
    { code: "castle_wall", x: 36, y: 60 },
    { code: "campfire", x: 25, y: 62 },
    { code: "barn", x: 64, y: 67 },
    { code: "high_road", x: 14, y: 70 },
  ],
  // Merchant City: canal houses, a moored ship's sail, winches, lamp, crates on both quays
  8: [
    { code: "forge", x: 16, y: 22 },
    { code: "heroes_hall", x: 90, y: 20 },
    { code: "castle_wall", x: 50, y: 38 },
    { code: "tent", x: 38, y: 44 },
    { code: "armory", x: 83, y: 42 },
    { code: "training_dummy", x: 12, y: 56 },
    { code: "campfire", x: 90, y: 52 },
    { code: "quarry", x: 77, y: 56 },
    { code: "farm", x: 24, y: 65 },
    { code: "high_road", x: 88, y: 64 },
  ],
  // Flourishing City: the cathedral and its lit spire, flanking towers, arch gate, bridge
  9: [
    { code: "observatory", x: 51, y: 23 },
    { code: "heroes_hall", x: 52, y: 50 },
    { code: "wizard_tower", x: 24, y: 35 },
    { code: "watchtower", x: 82, y: 35 },
    { code: "champion_arena", x: 66, y: 40 },
    { code: "armory", x: 75, y: 48 },
    { code: "tent", x: 9, y: 42 },
    { code: "castle_wall", x: 14, y: 55 },
    { code: "forge", x: 28, y: 50 },
    { code: "campfire", x: 28, y: 61 },
    { code: "high_road", x: 50, y: 63 },
    { code: "training_dummy", x: 90, y: 48 },
  ],
  // Citadel: stained glass hall, side towers, lit windows, the rock face, the torch-lit road
  10: [
    { code: "observatory", x: 48, y: 19 },
    { code: "heroes_hall", x: 54, y: 28 },
    { code: "armory", x: 44, y: 34 },
    { code: "wizard_tower", x: 25, y: 43 },
    { code: "watchtower", x: 78, y: 43 },
    { code: "castle_wall", x: 40, y: 48 },
    { code: "campfire", x: 36, y: 57 },
    { code: "training_dummy", x: 84, y: 55 },
    { code: "dragon_lair", x: 55, y: 62 },
    { code: "tent", x: 30, y: 68 },
    { code: "high_road", x: 47, y: 70 },
  ],
  // Metropolis: braziers either side of the chasm, domed and spired towers, the lower bridge
  11: [
    { code: "heroes_hall", x: 8, y: 22 },
    { code: "wizard_tower", x: 28, y: 22 },
    { code: "watchtower", x: 66, y: 22 },
    { code: "observatory", x: 78, y: 18 },
    { code: "armory", x: 89, y: 30 },
    { code: "tent", x: 12, y: 40 },
    { code: "training_dummy", x: 82, y: 50 },
    { code: "castle_wall", x: 27, y: 54 },
    { code: "campfire", x: 20, y: 63 },
    { code: "forge", x: 82, y: 63 },
    { code: "high_road", x: 50, y: 62 },
  ],
  // Eternal Capital: central spire, floating islands, the citadel, its spires and ring wall
  12: [
    { code: "observatory", x: 50, y: 30 },
    { code: "dragon_lair", x: 28, y: 35 },
    { code: "champion_arena", x: 72, y: 36 },
    { code: "druid_grove", x: 38, y: 41 },
    { code: "heroes_hall", x: 50, y: 55 },
    { code: "tent", x: 38, y: 52 },
    { code: "campfire", x: 62, y: 52 },
    { code: "wizard_tower", x: 24, y: 56 },
    { code: "watchtower", x: 77, y: 56 },
    { code: "castle_wall", x: 33, y: 64 },
    { code: "training_dummy", x: 66, y: 64 },
    { code: "high_road", x: 88, y: 67 },
  ],
};
