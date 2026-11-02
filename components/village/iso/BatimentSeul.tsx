// A building at a given rank, alone on the island, for the buildings track's captures (dev only,
// app/dev-iso.tsx). The real IsoVillage with the props the tab gives it, so rank -> stage is the
// app's own mapping; the camera is IsoVillage's own, the same for every building at one tier.
// A 96 dp bar at the foot of the screen is the scale of the picture.
// shortcut: the ground is the island's, not a flat neutral; the engine (bld-engine) or a later
// `neutre=1` can blank it. The show is PretDemo's claim, played untouched after 1.5 s through the
// croissance prop; the engine plugs its show and beat in through EtatBldContext.

import { useEffect, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { etatCarte } from "@/components/village/iso/carteDemo";
import { type EtatBld, EtatBldContext } from "@/components/village/iso/etatBld";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import type { Ambiance } from "@/components/village/iso/isoSpec";
import { rawColors } from "@/constants/rawColors";

const DELAI_SHOW_MS = 1500;
const BARRE_DP = 96;

export function BatimentSeul({ etat, lumiere }: { etat: EtatBld; lumiere: Ambiance }) {
  const [aire, setAire] = useState({ w: 0, h: 0 });
  const [jouee, setJouee] = useState(false);
  const [fini, setFini] = useState(false);
  const { show, code, rang, avant } = etat;
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setJouee(true), DELAI_SHOW_MS);
    return () => clearTimeout(t);
  }, [show]);
  const attend = show !== undefined && !fini;
  const batiments = etat.semaine
    ? etatCarte(etat.palier, false).montres.map((c) => ({ code: c, level: rang }))
    : [{ code, level: rang }];
  return (
    <EtatBldContext.Provider value={etat}>
      <View
        testID="iso-bld-aire"
        style={{ flex: 1, overflow: "hidden" }}
        onLayout={(e: LayoutChangeEvent) =>
          setAire({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {aire.w > 0 ? (
          <IsoVillage
            tier={etat.palier}
            buildings={batiments}
            width={aire.w}
            height={aire.h}
            lumiere={lumiere}
            reclamables={attend && !jouee ? [code] : []}
            niveauxReclames={attend ? { [code]: jouee ? rang : avant } : undefined}
            croissance={
              jouee && attend ? { cle: "bld", items: [{ code, oldLevel: avant }] } : undefined
            }
            onCroissanceFinie={() => {
              setFini(true);
              setJouee(false);
            }}
          />
        ) : null}
        <View
          testID="iso-bld-echelle"
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            width: BARRE_DP,
            height: 4,
            backgroundColor: rawColors.text,
          }}
        />
      </View>
    </EtatBldContext.Provider>
  );
}
