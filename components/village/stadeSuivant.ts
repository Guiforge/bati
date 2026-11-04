// The next stage of a building, for the silhouette on the iso card (G5): pure, no clock. The
// stage is the engine's own (`buildingStageFor`); the sprite is the painted one (`peintDe`).

import { buildingStageFor, type VisualStage } from "@/constants/buildingStages";
import type { BuildingCode } from "@/db/schema";
import { PEINTS } from "./iso/peints";

const ORDRE: readonly VisualStage[] = ["rough", "solid", "grand", "legendary", "mythic"];

/**
 * The painted stage after the one `level` shows, or null: unbuilt, last painted stage, or a
 * building with no painted stages. `baseRank` is an upgrade's base rank (rule B); left out the
 * upgrade is read at its own stage.
 * `peints` is injected for the tests: by default the painted buildings that are switched on.
 */
export function stadeSuivant(
  code: BuildingCode,
  level: number,
  baseRank = 0,
  peints: Readonly<Partial<Record<VisualStage, unknown>>> | undefined = PEINTS[code]?.stades,
): VisualStage | null {
  if (level <= 0 || !peints) return null;
  const actuel = ORDRE.indexOf(buildingStageFor(code, level, baseRank));
  return ORDRE.slice(actuel + 1).find((s) => peints[s] !== undefined) ?? null;
}
