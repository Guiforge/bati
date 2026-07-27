import { type EquipmentCode, equipmentCodes } from "./schema";

export const EQUIPMENT_LABELS: Record<EquipmentCode, { en: string; fr: string }> = {
  none: { en: "No equipment", fr: "Sans matériel" },
  pullup_bar: { en: "Pull-up bar", fr: "Barre de traction" },
  dip_bar: { en: "Dip bar", fr: "Barre à dips" },
  dumbbell: { en: "Dumbbells", fr: "Haltères" },
  barbell: { en: "Barbell", fr: "Barre" },
  kettlebell: { en: "Kettlebell", fr: "Kettlebell" },
  band: { en: "Band", fr: "Élastique" },
  bench: { en: "Bench", fr: "Banc" },
};

export function isEquipmentCode(value: unknown): value is EquipmentCode {
  return typeof value === "string" && (equipmentCodes as readonly string[]).includes(value);
}
