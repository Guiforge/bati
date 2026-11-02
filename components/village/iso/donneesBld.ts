import type { BuildingData } from "@/constants/buildingData";
import { batimentEssai } from "@/constants/buildings/essai";
import { BATIMENT_MOTEUR } from "@/constants/isoPoc";
import type { BuildingCode } from "@/db/schema";

/**
 * The buildings that go through the engine, one data file each. Empty until a building's art lands:
 * a building not listed here is drawn exactly as before, with or without the flag.
 */
export const DONNEES_BLD: Partial<Record<BuildingCode, BuildingData>> = {};

/**
 * What BatimentSeul (the capture screen, never the village) serves for `code`: the listed data,
 * else the test building standing in for the windmill. Nothing at all while the engine flag is off.
 */
export function donneesSeul(code: BuildingCode): BuildingData | undefined {
  if (!BATIMENT_MOTEUR) return undefined;
  return DONNEES_BLD[code] ?? (code === batimentEssai.code ? batimentEssai : undefined);
}
