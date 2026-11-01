// T32: the village's sound, wired. A reaction on a coarse key of the camera (cleSon) tells JS when
// the sound must be read again; nothing runs at rest. The hero's sound setting comes in as a prop
// (the map does not import the store, and with it the database).

import { useIsFocused } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { type SharedValue, useAnimatedReaction } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { BuildingCode } from "@/db/schema";
import { setVillage } from "@/src/sounds";
import { centreBatiment, ecranXY, HAUTEUR, LARGEUR } from "./carteDemo";
import { FigeContext } from "./fige";
import type { Ambiance } from "./isoSpec";
import { cleSon, niveauxVillage, SILENCE, volumeBatiment } from "./sonVillage";

export function useSonVillage({
  suivi,
  sonActif,
  zmin,
  zmax,
  aire,
  ambiance,
  construits,
}: {
  suivi: { zoom: SharedValue<number>; x: SharedValue<number>; y: SharedValue<number> };
  sonActif: boolean;
  zmin: number;
  zmax: number;
  aire: { w: number; h: number };
  ambiance: Ambiance;
  construits: readonly BuildingCode[];
}): void {
  const focus = useIsFocused();
  const fige = useContext(FigeContext);
  const [premierPlan, setPremierPlan] = useState(AppState.currentState === "active");
  useEffect(() => {
    const abo = AppState.addEventListener("change", (s) => setPremierPlan(s === "active"));
    return () => abo.remove();
  }, []);
  // The map leaving the tree silences the village, whatever the other effect last said.
  useEffect(() => () => setVillage(SILENCE), []);

  const forge = construits.includes("forge");
  const moulin = construits.includes("windmill");
  const lire = () => {
    const vue = { zoom: suivi.zoom.get(), x: suivi.x.get(), y: suivi.y.get() };
    const carte = { largeur: LARGEUR, hauteur: HAUTEUR };
    const batiment = (code: BuildingCode) =>
      volumeBatiment({ vue, zmin, zmax, centre: ecranXY(centreBatiment(code)), aire, carte });
    setVillage(
      niveauxVillage({
        soundEnabled: sonActif,
        focus,
        premierPlan,
        fige,
        ambiance,
        forge: forge ? batiment("forge") : null,
        moulin: moulin ? batiment("windmill") : null,
      }),
    );
  };
  // The reaction's callback is created once; it always calls the render's `lire`.
  const dernier = useRef(lire);
  useEffect(() => {
    dernier.current = lire;
  });
  const relire = () => dernier.current();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `lire` is read through `dernier`
  useEffect(relire, [
    sonActif,
    focus,
    premierPlan,
    fige,
    ambiance,
    forge,
    moulin,
    zmin,
    zmax,
    aire.w,
    aire.h,
  ]);
  useAnimatedReaction(
    () => cleSon(suivi.zoom.get(), suivi.x.get(), suivi.y.get()),
    (cle, avant) => {
      if (avant !== null && cle !== avant) scheduleOnRN(relire);
    },
  );
}
