// The engine on the map's normal path (Maquette in IsoCarteDemo), for a building that has engine
// data and a capture state (etatBld.ts, served by BatimentSeul only): the building's sprite becomes
// the engine's body, at the same place in the tree, and the engine's layers go around it in
// Maquette's z-order. Any other building never mounts this, so the map is the one of today. The
// show of `show=stade|rang` plays `delai` seconds in, from the plan of its own kind.
// shortcut: the rank comes from the capture state, because Maquette knows a stage and not a rank;
// the app's own path needs the building's rank passed down before BATIMENT_MOTEUR can drive it.

import { type ReactNode, useEffect, useState } from "react";
import type { BuildingData } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { BatimentMoteur } from "./BatimentMoteur";
import type { Rect } from "./carteDemo";
import type { EtatBld } from "./etatBld";
import type { SpriteIso } from "./isoSpec";
import { useSpectacleBatiment } from "./useSpectacleBatiment";

export function MoteurBld({
  data,
  etat,
  corps,
  s,
  nuit,
  masque,
  sprite,
  couches,
  reclame,
}: {
  data: BuildingData;
  etat: EtatBld;
  /** The sprite's rectangle on the map, dp. */
  corps: Rect;
  /** The sprite: its canvas and its ground anchor, px. */
  s: SpriteIso;
  nuit: boolean;
  masque: boolean;
  sprite: (stade: VisualStage, suivant: boolean) => ReactNode;
  couches: ReactNode;
  reclame: ReactNode;
}) {
  const { spectacle, jouer, fini } = useSpectacleBatiment();
  const { show, avant, rang, base, avantBase, delai } = etat;
  // Before the tap-less capture timer fires, the building stands at the rank it rises from.
  const [lance, setLance] = useState(false);
  const baseAvant = avantBase ?? base;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `jouer` is new at each render; the link is the only trigger
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setLance(true);
      jouer(data.code, avant, rang, { genre: show, deBase: baseAvant, versBase: base, rule: "B" });
    }, delai * 1000);
    return () => clearTimeout(t);
  }, [show, avant, rang, base, baseAvant, data.code, delai]);
  const avantLeShow = !!show && !lance;
  return (
    <BatimentMoteur
      actif
      data={data}
      rank={avantLeShow ? avant : rang}
      baseRank={avantLeShow ? baseAvant : base}
      nuit={nuit}
      rule="B"
      corps={corps}
      taille={s.size}
      ancre={s.anchor}
      masque={masque}
      spectacle={spectacle}
      onFini={fini}
      sprite={sprite}
      couches={couches}
      reclame={reclame}
    />
  );
}
