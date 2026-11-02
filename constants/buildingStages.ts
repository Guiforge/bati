/**
 * The building stage table of the buildings track (docs/designs/village-buildings/PROMPT.md §6):
 * visual data only. Ranks, thresholds, XP and unlock rules never move.
 *
 * Nothing in the app reads this yet. `buildingStageFor()` answers with the old mapping
 * (`buildingStage()` in constants/buildingLevels.ts, an upgrade clamped to `solid`) while
 * `BUILDING_STAGES_RULE` is "old", so wiring it in later is a change of one constant per rule.
 */
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import { type BuildingStage, buildingCeiling, buildingStage } from "./buildingLevels";

/** Internal ids only. "Mythic" is already a rank label in the locales: never show these. */
export type VisualStage = BuildingStage | "legendary" | "mythic";

/** "old" is today's rank to rough/solid/grand; A and B are the two upgrade rules of §6. */
export type StageRule = "old" | "A" | "B";

// Read in release too and off by default, like INTEGRATION in constants/isoPoc.ts.
// shortcut: a source constant, no setting; Guillaume picks A or B at the step 0 checkpoint, then
// the winning value goes here and the loser's branch is deleted.
export const BUILDING_STAGES_RULE: StageRule = "old";

/** Each stage with the first rank that shows it. Below the first entry: rough (rank 0 included). */
type Ladder = readonly (readonly [VisualStage, number])[];

/** Muscles, styles, High Road, foundations: the twelve ten-rank buildings. */
export const TEN_RANK_LADDER: Ladder = [
  ["rough", 1],
  ["solid", 3],
  ["grand", 5],
  ["legendary", 7],
  ["mythic", 10],
];

/** The three deeds, ranks 1 to 5, no legendary. */
export const DEED_LADDER: Ladder = [
  ["rough", 1],
  ["solid", 3],
  ["grand", 4],
  ["mythic", 5],
];

/** The six upgrades by their own rank, 1 to 3. Rule A stops here. */
export const UPGRADE_LADDER: Ladder = [
  ["rough", 1],
  ["solid", 2],
  ["grand", 3],
];

/** Rule B, once the upgrade's own rank is 3: the rank of the building it extends decides. */
export const UPGRADE_BASE_LADDER: Ladder = [
  ["legendary", 7],
  ["mythic", 10],
];

export const DEEDS = [
  "dragon_lair",
  "heroes_hall",
  "champion_arena",
] as const satisfies readonly BuildingCode[];

function lookup(ladder: Ladder, rank: number, fallback: VisualStage): VisualStage {
  let stage = fallback;
  for (const [s, from] of ladder) if (rank >= from) stage = s;
  return stage;
}

/** The building an upgrade extends, read from the unlock rule so the pairing has one source. */
export function baseOf(code: BuildingCode): BuildingCode | null {
  const def = buildingDefinitions[code];
  return def.tier === 3 ? def.prerequisiteBuilding : null;
}

export function isDeed(code: BuildingCode): boolean {
  return (DEEDS as readonly string[]).includes(code);
}

/** The old look: the rank mapping, an upgrade (two paintings) never past `solid`. */
function oldStage(code: BuildingCode, rank: number): VisualStage {
  const stage = buildingStage(rank);
  return baseOf(code) !== null && stage === "grand" ? "solid" : stage;
}

/**
 * The stage a building shows at `rank`. `baseRank` is the rank of the building an upgrade extends
 * (rule B only; left out it counts as 0, so the upgrade stays at its own stage).
 * A rank past the ceiling counts as the ceiling: today's data never goes past it.
 */
export function buildingStageFor(
  code: BuildingCode,
  rank: number,
  baseRank = 0,
  rule: StageRule = BUILDING_STAGES_RULE,
): VisualStage {
  if (rule === "old") return oldStage(code, rank);
  const r = Math.min(rank, buildingCeiling({ tier: buildingDefinitions[code].tier, code }));
  if (baseOf(code) !== null) {
    const own = lookup(UPGRADE_LADDER, r, "rough");
    return rule === "B" && own === "grand" ? lookup(UPGRADE_BASE_LADDER, baseRank, "grand") : own;
  }
  return lookup(isDeed(code) ? DEED_LADDER : TEN_RANK_LADDER, r, "rough");
}
