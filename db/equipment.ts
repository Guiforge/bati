import type { Localized } from "@/src/i18n/deviceLanguage";
import { type EquipmentCode, equipmentCodes } from "./schema";

export const EQUIPMENT_LABELS: Record<EquipmentCode, Localized> = {
  none: { en: "No equipment", fr: "Sans matériel", de: "Ohne Geräte", es: "Sin material" },
  pullup_bar: {
    en: "Pull-up bar",
    fr: "Barre de traction",
    de: "Klimmzugstange",
    es: "Barra de dominadas",
  },
  dip_bar: { en: "Dip bar", fr: "Barre à dips", de: "Dip-Barren", es: "Paralelas" },
  dumbbell: { en: "Dumbbells", fr: "Haltères", de: "Kurzhanteln", es: "Mancuernas" },
  barbell: { en: "Barbell", fr: "Barre", de: "Langhantel", es: "Barra" },
  kettlebell: { en: "Kettlebell", fr: "Kettlebell", de: "Kettlebell", es: "Pesa rusa" },
  band: { en: "Band", fr: "Élastique", de: "Widerstandsband", es: "Banda elástica" },
  bench: { en: "Bench", fr: "Banc", de: "Bank", es: "Banco" },
};

export function isEquipmentCode(value: unknown): value is EquipmentCode {
  return typeof value === "string" && (equipmentCodes as readonly string[]).includes(value);
}

/**
 * Can the hero do a movement that needs this piece of kit?
 *
 * `owned` is `null` when the question has never been answered, and that means "show me
 * everything": the default must not silently hide content from someone who has not been asked.
 * An empty set is a real answer, bodyweight only, and `none` passes whatever the answer was.
 *
 * One function because the rule was written three times, and the third copy was the bug: quest
 * eligibility filtered on it, the oath presets filtered on it, and the warm-up did not, so a
 * hero with no bar was told to do scapular pull-ups for two days before the first session they
 * could actually train.
 */
export function canDo(equipment: EquipmentCode, owned: ReadonlySet<EquipmentCode> | null): boolean {
  return equipment === "none" || owned === null || owned.has(equipment);
}
