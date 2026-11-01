// T15: the light of the map. F2: the buildings are painted by day and their night is graded from
// that painting (scripts/iso/famille_jour.py); the day also lays a warm wash under everything that stands.
// Which light the map has is a pure choice of the channel (src/distribution.ts `JOUR_SEUL`, never
// the environment read here), the subscription and the hour.

import { rawColors } from "@/constants/rawColors";
import type { Ambiance } from "./isoSpec";

export type Lumiere = {
  /** A flat warm veil over the whole map (AmbianceCarte.tsx), and the vignette that darkens its edges. */
  voile: string;
  vignette: string;
  vignetteNul: string;
  /** The wash over the land, the water and the forest: lighter, less saturated, warm. */
  lavis: string;
  opaciteLavis: number;
};

/** The night has no entry: AmbianceCarte.tsx grades it from the biome's veil and the night tokens. */
export const LUMIERES: Partial<Record<Ambiance, Lumiere>> = {
  jour: {
    voile: rawColors.isoJourVoile,
    vignette: rawColors.isoJourVignette,
    vignetteNul: rawColors.isoJourVignetteNul,
    lavis: rawColors.isoJourLavis,
    opaciteLavis: 0.14, // T39: was 0.34, a pale wash that lifted the lawn well above the inked sprites (T39 measure)
  },
};

/** Day from 7:00 to 19:59, local time. */
export function estJour(heure: number): boolean {
  return heure >= 7 && heure < 20;
}

export function choisirLumiere({
  jourSeul,
  plus,
  heure,
  force,
}: {
  jourSeul: boolean;
  /** Bati+ unlocks the cycle on Play. */
  plus: boolean;
  heure: number;
  /** A test or QA override (dev-iso `?ambiance=`); it wins over everything. */
  force?: Ambiance;
}): Ambiance {
  if (force) return force;
  if (jourSeul && !plus) return "jour";
  return estJour(heure) ? "jour" : "nuit";
}

/** dev-iso `?ambiance=`: anything but `jour` or `nuit` is no override. */
export function ambianceForcee(valeur: string | undefined): Ambiance | undefined {
  return valeur === "jour" || valeur === "nuit" ? valeur : undefined;
}
