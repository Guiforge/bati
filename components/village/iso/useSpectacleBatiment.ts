import { useRef, useState } from "react";
import type { BuildingData } from "@/constants/buildingData";
import type { StageRule } from "@/constants/buildingStages";
import type { SpectacleEnCours } from "./BatimentMoteur";
import { useMouvementReduit } from "./fige";
import { type Genre, genreDe, planSpectacle } from "./spectacleBatiment";

/**
 * The parent's handle: `jouer` is the only way a moment starts, and it is meant for a tap handler.
 * It does nothing when nothing rose or a moment is already playing. With reduced motion the plan has
 * no steps and the trace stays until `effacer` or the next `jouer`.
 */
export function useSpectacleBatiment() {
  const reduit = useMouvementReduit();
  const [spectacle, setSpectacle] = useState<SpectacleEnCours | undefined>(undefined);
  const n = useRef(0);
  const jouer = (
    code: BuildingData["code"],
    deRang: number,
    versRang: number,
    options?: {
      deBase?: number;
      versBase?: number;
      rule?: StageRule;
      genre?: Genre;
      ailes?: boolean;
    },
  ) => {
    if (spectacle && !spectacle.plan.reduit) return null;
    const genre = options?.genre ?? genreDe(code, deRang, versRang, options);
    if (!genre) return null;
    n.current += 1;
    const next = {
      cle: `${genre}:${versRang}:${n.current}`,
      plan: planSpectacle(genre, deRang, versRang, reduit, options),
    };
    setSpectacle(next);
    return next;
  };
  const fini = (cle: string) => {
    setSpectacle((s) => (s?.cle === cle && !s.plan.reduit ? undefined : s));
  };
  const effacer = () => setSpectacle(undefined);
  return { spectacle, jouer, fini, effacer };
}
