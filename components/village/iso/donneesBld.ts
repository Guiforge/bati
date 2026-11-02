import type { BuildingData } from "@/constants/buildingData";
import { batimentEssai } from "@/constants/buildings/essai";
import type { BuildingCode } from "@/db/schema";

/** The data file each building has for the engine; the test building stands in for the windmill. */
export const DONNEES_BLD: Partial<Record<BuildingCode, BuildingData>> = { windmill: batimentEssai };
