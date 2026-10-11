import { localizedTable } from "@/src/i18n/copy";
import type { Localized } from "@/src/i18n/deviceLanguage";
import type { EquipmentCode, MuscleCode } from "./schema";

/**
 * The muscle and equipment labels, read out of `locales/*.json`.
 *
 * Their own module, apart from the guards in `db/muscles.ts` and `db/equipment.ts`: the home
 * screen widget's headless task reaches both of those, and a module that reads the locale files
 * loads all of them.
 */
export const MUSCLE_LABELS: Record<MuscleCode, Localized> = localizedTable((l) => l.muscles);

export const EQUIPMENT_LABELS: Record<EquipmentCode, Localized> = localizedTable(
  (l) => l.equipment,
);
