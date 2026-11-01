// The map's opening fade (audit DA 19): it comes in from the empty frame instead of appearing in
// one step, with one duration for every entry. Reduced motion has no fade. One timing, on opacity,
// that ends by itself.
// H4-03: over the painted ground the fade waits for the 12 terrain tiles to have loaded (each
// reports through `solCharge`, TerrainPeint's onLoad), at most ATTENTE_SOL_MS, so the hero never sees
// the vector skeleton or the ground in pieces. Until then the map is clear (opacity 0) over a dark
// curtain (Monde.tsx); reduced motion waits the same and then shows it all at once.

import { useContext, useEffect, useSyncExternalStore } from "react";
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { AlentoursContext, TUILES_TERRAIN } from "./alentours";
import { useMouvementReduit } from "./fige";

/** How long the map takes to appear, ms. */
export const FONDU_OUVERTURE_MS = 450;
/** The longest the opening waits for the painted ground, ms. */
export const ATTENTE_SOL_MS = 1500;
/** The terrain tiles that must have loaded. */
export const TUILES_SOL = TUILES_TERRAIN.colonnes * TUILES_TERRAIN.rangees;

/** The fade's length: none with reduced motion. */
export function dureeFondu(reduit: boolean): number {
  return reduit ? 0 : FONDU_OUVERTURE_MS;
}

// shortcut: one module-level state, so one map at a time; the fade hook clears it when its map unmounts.
let chargees = 0;
let pret = false;
const abonnes = new Set<() => void>();

function declarerPret() {
  if (pret) return;
  pret = true;
  for (const a of abonnes) a();
}

/** One terrain tile has loaded: the ground is ready at the twelfth. */
export function solCharge() {
  chargees += 1;
  if (chargees >= TUILES_SOL) declarerPret();
}

const abonner = (a: () => void) => {
  abonnes.add(a);
  return () => {
    abonnes.delete(a);
  };
};

/** Whether the painted ground is ready (loaded, or the wait is over). */
export function useSolPret(): boolean {
  return useSyncExternalStore(abonner, () => pret);
}

/** An animated style that takes the node from clear to opaque once, when its ground is ready. */
export function useFonduOuverture() {
  const reduit = useMouvementReduit();
  const attend = useContext(AlentoursContext).sol;
  const sol = useSolPret();
  const opacite = useSharedValue(reduit && !attend ? 1 : 0);
  useEffect(() => {
    if (!attend) return;
    const t = setTimeout(declarerPret, ATTENTE_SOL_MS);
    return () => {
      clearTimeout(t);
      chargees = 0;
      pret = false;
    };
  }, [attend]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, when the ground is ready
  useEffect(() => {
    if (attend && !sol) return;
    opacite.set(
      reduit ? 1 : withTiming(1, { duration: dureeFondu(false), easing: Easing.out(Easing.quad) }),
    );
  }, [attend, sol]);
  return useAnimatedStyle(() => ({ opacity: opacite.get() }));
}
