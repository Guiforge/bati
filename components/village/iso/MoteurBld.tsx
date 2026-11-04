// The engine on the map's normal path (Maquette in IsoCarteDemo), for a building that has engine
// data and a state (etatBld.ts: BatimentSeul's capture state, or the village tab's claimed rank):
// the building's sprite becomes the engine's body, at the same place in the tree, and the engine's
// layers go around it in Maquette's z-order. Any other building never mounts this, so the map is
// the one of today. The growth moment is not played here (IsoCroissance, moment.ts).

import type { ReactNode } from "react";
import type { BuildingData } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { BatimentMoteur } from "./BatimentMoteur";
import type { Rect } from "./carteDemo";
import type { EtatBld } from "./etatBld";
import type { SpriteIso } from "./isoSpec";

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
  sprite: (stade: VisualStage) => ReactNode;
  /** The map's own layers at the stage the body wears. */
  couches: (stade: VisualStage, rang: number, base: number) => ReactNode;
  reclame: ReactNode;
}) {
  return (
    <BatimentMoteur
      actif
      data={data}
      rank={etat.rang}
      baseRank={etat.base}
      nuit={nuit}
      rule="B"
      corps={corps}
      taille={s.size}
      ancre={s.anchor}
      masque={masque}
      sprite={sprite}
      couches={couches}
      reclame={reclame}
    />
  );
}
