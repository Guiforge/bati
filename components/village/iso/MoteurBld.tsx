// The engine on the map's normal path (Maquette in IsoCarteDemo), for a capture link with
// `moteur=1` only (etatBld.ts): the building's sprite becomes the engine's body, at the same place,
// and the engine's layers go over it. Without that link `Maquette` never mounts this, so the map is
// the one of today. The show of `show=stade|rang` plays 1.5 s in, from the plan of its own kind.
// shortcut: the rank comes from the capture state, because Maquette knows a stage and not a rank;
// the app's own path needs the building's rank passed down before BATIMENT_MOTEUR can drive it.

import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import type { BuildingData } from "@/constants/buildingData";
import { BatimentMoteur } from "./BatimentMoteur";
import type { EtatBld } from "./etatBld";
import { useSpectacleBatiment } from "./useSpectacleBatiment";

const DELAI_SHOW_MS = 1500;

export function MoteurBld({
  data,
  etat,
  corps,
  taille,
  ancre,
  nuit,
  children,
}: {
  data: BuildingData;
  etat: EtatBld;
  /** The sprite's rectangle on the map, dp. */
  corps: { x: number; y: number; w: number; h: number };
  /** The sprite's canvas, px, and its ground anchor in it. */
  taille: readonly [number, number];
  ancre: readonly [number, number];
  nuit: boolean;
  children: ReactNode;
}) {
  const { spectacle, jouer, fini } = useSpectacleBatiment();
  const { show, avant, rang, base, avantBase } = etat;
  // Before the tap-less capture timer fires, the building stands at the rank it rises from.
  const [lance, setLance] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `jouer` is new at each render; the link is the only trigger
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setLance(true);
      jouer(data.code, avant, rang, { genre: show, deBase: avantBase, versBase: base, rule: "B" });
    }, DELAI_SHOW_MS);
    return () => clearTimeout(t);
  }, [show, avant, rang, base, avantBase, data.code]);
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: corps.x, top: corps.y, width: corps.w, height: corps.h }}
    >
      <BatimentMoteur
        actif
        data={data}
        rank={show && !lance ? avant : rang}
        baseRank={base}
        nuit={nuit}
        rule="B"
        corps={{ w: taille[0], h: taille[1] }}
        ancre={[ancre[0], ancre[1]]}
        echelle={corps.w / taille[0]}
        spectacle={spectacle}
        onFini={fini}
      >
        {children}
      </BatimentMoteur>
    </View>
  );
}
