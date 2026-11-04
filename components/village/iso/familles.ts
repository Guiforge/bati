// T16: the animation families of the map. The spec allows 8 animated elements at once, read as 8
// families seen moving together (PLAN-SPEC-VI §4 point 1); the 64-node cap stays the technical
// limit (__tests__/iso-ciel.test.tsx). Each animated node is told apart by its testID, and
// __tests__/iso-familles.test.tsx fails on a node no rule below names.

import { createContext, useContext, useEffect } from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { CYCLE_MS, type Depart, DepartContext } from "./horloge";

export const PLAFOND_FAMILLES = 9;

export const FAMILLES = [
  "eau",
  "feux",
  "fumees",
  "villageois",
  "betes",
  "oiseaux",
  "lucioles",
  "lumieres",
  "signal",
  "moulin",
  "vent",
  "croissance",
] as const;
export type Famille = (typeof FAMILLES)[number];

/** Moved by the hero's own gesture (or the one opening fade, T38), not by the ambient clock: no family. */
const CAMERA = /^iso-(camera|monde-fond)$/;

const REGLES: readonly (readonly [RegExp, Famille])[] = [
  [/^iso-reflets-/, "eau"],
  [/^iso-flamme-/, "feux"],
  [/^iso-fumee-/, "fumees"],
  [/^iso-marcheur-/, "villageois"],
  [/^iso-(animal|creature-(souris|chat|dragon))/, "betes"],
  [/^iso-creature-oiseau-/, "oiseaux"],
  [/^iso-(lucioles|effet-lucioles-)/, "lucioles"],
  [/^iso-(fenetres|porte)-/, "lumieres"],
  [/^iso-(lueur|eclat-anime|effet-signal)-/, "signal"],
  [/^iso-ailes-/, "moulin"],
  // The wind moves the banners and the cloud shadows (OmbresNuages.tsx) alike.
  [/^iso-(banniere|nuage)-/, "vent"],
  [/^iso-(croissance|poussiere|revelation)-/, "croissance"],
  [/^iso-legende-revelation$/, "croissance"],
];

/** The family of an animated node, null for the camera, undefined for a node no rule names. */
export function familleDe(testID: string): Famille | null | undefined {
  if (CAMERA.test(testID)) return null;
  return REGLES.find(([r]) => r.test(testID))?.[1];
}

/**
 * DECISIONS 30/10: nothing is cut, the families take turns. Water, fires, smoke, villagers,
 * animals and the night lights play the whole wave (6), the birds keep a seat for the roof birds (7), and the eighth seat turns with the wave's cycles: the building signal first
 * (ready glows, legendary glints: what the hero should see at once), the fireflies, then a gust of
 * the sails. A growth takes that seat for as long as it plays.
 */
export const ROTATION = ["signal", "lucioles", "moulin"] as const satisfies readonly Famille[];
export type Tournante = (typeof ROTATION)[number];

/**
 * Whether a growth holds the turning seat: `avant` before clock `des`, `apres` from it. A change
 * of the growth lands on the next cycle boundary (`basculer`), so no turning family is cut mid-gesture.
 */
export type Bascule = { avant: boolean; apres: boolean; des: number };

/** IsoVillage's growth switch (`useBascule`); null where the map plays no growth. */
export const CroissanceContext = createContext<SharedValue<Bascule> | null>(null);

/** Whether the growth holds the seat at clock `c`. */
export function croitA(g: Bascule | null, c: number): boolean {
  "worklet";
  if (!g) return false;
  return c >= g.des ? g.apres : g.avant;
}

/** The switch once the growth becomes `croit` at clock `c`: at once on a rest pose, else at the next boundary. */
export function basculer(g: Bascule, croit: boolean, c: number): Bascule {
  return { avant: croitA(g, c), apres: croit, des: Math.ceil(c / CYCLE_MS) * CYCLE_MS };
}

/** The growth switch for the map's clock `c`, written once per change of `croit`. */
export function useBascule(croit: boolean, c: SharedValue<number>): SharedValue<Bascule> {
  const g = useSharedValue<Bascule>({ avant: croit, apres: croit, des: 0 });
  useEffect(() => {
    // `get()` on the JS thread may be a frame stale: the boundary it picks is still a rest pose.
    g.set(basculer(g.get(), croit, c.get()));
  }, [croit, c, g]);
  return g;
}

/**
 * The clock a turning family reads at `c`: the clock itself in its cycle, else the start of the
 * current cycle (every element's rest pose). Untouched without a wave (`d` null or none started).
 */
export function horlogeTour(f: Tournante, c: number, d: Depart | null, g: Bascule | null): number {
  "worklet";
  if (!d || d.n === 0) return c;
  const k = Math.floor((c - d.c0) / CYCLE_MS);
  return !croitA(g, c) && ROTATION[k % ROTATION.length] === f ? c : c - (c % CYCLE_MS);
}

/** `horlogeTour` bound to the map's wave and growth, callable from a worklet. */
export function useTour(f: Tournante): (c: number) => number {
  const depart = useContext(DepartContext);
  const bascule = useContext(CroissanceContext);
  return (c: number) => {
    "worklet";
    return horlogeTour(f, c, depart ? depart.get() : null, bascule ? bascule.get() : null);
  };
}
