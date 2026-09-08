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
