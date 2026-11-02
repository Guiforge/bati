// Which buildings wait for a tap to rise (PROMPT.md §6, "every rank is a gift"), pure.
// Today the app marks a rise by STAGE: db/village.ts `claimable` compares `stageRank` (rough, solid,
// grand) of the derived level and of the claimed one. The claimed key already stores a RANK per
// building (`ClaimedStages`, written by `claimStage` at the building's level), so marking every
// rank needs no new data: only this predicate changes. It stays behind `MONTEE_PAR_RANG`, off, and
// nothing calls it yet; the callers it would replace are listed in the track's report.

import type { BuildingCode } from "@/db/schema";
import { type ClaimedStages, claimable, drawnLevel, type VillageBuilding } from "@/db/village";

export const MONTEE_PAR_RANG = false;

/** Built buildings whose rank is above the claimed one: a rank inside a stage waits for a tap too. */
export function claimableParRang(
  buildings: readonly Pick<VillageBuilding, "code" | "level">[],
  claimed: ClaimedStages,
): BuildingCode[] {
  return buildings
    .filter((b) => b.level > 0 && b.level > drawnLevel(b, claimed))
    .map((b) => b.code);
}

/** The pending list the map would use: today's by stage, or by rank once the flag is on. */
export function enAttente(
  buildings: readonly Pick<VillageBuilding, "code" | "level">[],
  claimed: ClaimedStages,
  parRang: boolean = MONTEE_PAR_RANG,
): BuildingCode[] {
  return parRang ? claimableParRang(buildings, claimed) : claimable(buildings, claimed);
}
