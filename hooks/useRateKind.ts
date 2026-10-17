import { type RateKind, rateKind } from "@/constants/outingDisplay";
import type { Locomotion } from "@/db/schema";
import { useSettingsStore } from "@/stores/settings";

/**
 * Pace or speed for an activity, as the hero set it in "Affichage des sorties". The hook every
 * screen that prints a rate outside a live outing reads, so the victory, the recap, the journal
 * and the shared card cannot disagree with the panel.
 */
export function useRateKind(locomotion: Locomotion | null): RateKind {
  return rateKind(
    locomotion,
    useSettingsStore((s) => s.outingDisplay),
  );
}
