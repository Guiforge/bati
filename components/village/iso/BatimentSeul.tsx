// A building at a given rank, alone on the island, for the buildings track's captures (dev only,
// app/dev-iso.tsx). The real IsoVillage with the props the tab gives it, so rank -> stage is the
// app's own mapping; the camera is IsoVillage's own, the same for every building at one tier.
// A 96 dp bar at the foot of the screen is the scale of the picture.
// A lone building (not `semaine=1`) stands on its own plot and two cells round it, no inhabitants,
// the camera opened on it at the game's close zoom (IsoVillage `seul`). The clock of the map's life
// is IsoVillage's own (useHorloge), so wings and glows run unless the frame is frozen or the device
// asks for reduced motion. The show is PretDemo's claim, played untouched after 1.5 s through the croissance prop, unless the
// building has engine data (donneesBld.ts, the engine flag on): then the map's Maquette plays the
// engine's own show, from EtatBldContext, and the claim stays out of the way.

import { useEffect, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { etatCarte } from "@/components/village/iso/carteDemo";
import { donneesSeul } from "@/components/village/iso/donneesBld";
import { type EtatBld, EtatBldContext } from "@/components/village/iso/etatBld";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import type { Ambiance } from "@/components/village/iso/isoSpec";
import { rawColors } from "@/constants/rawColors";

const BARRE_DP = 96;

/** The first week keeps the island; every other state shows its building alone. */
const seulDe = (e: EtatBld) => (e.semaine ? undefined : e.code);

export function BatimentSeul({ etat, lumiere }: { etat: EtatBld; lumiere: Ambiance }) {
  const [aire, setAire] = useState({ w: 0, h: 0 });
  const [jouee, setJouee] = useState(false);
  const [fini, setFini] = useState(false);
  const { show, code, rang, avant, delai } = etat;
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setJouee(true), delai * 1000);
    return () => clearTimeout(t);
  }, [show, delai]);
  // The engine plays its own show (MoteurBld); IsoVillage's claim would play over it.
  const donnees = donneesSeul(code);
  const attend = show !== undefined && !fini && !donnees;
  const batiments = etat.semaine
    ? etatCarte(etat.palier, false).montres.map((c) => ({ code: c, level: rang }))
    : [{ code, level: rang }];
  return (
    <EtatBldContext.Provider value={donnees ? { ...etat, donnees } : etat}>
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
            seul={seulDe(etat)}
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
