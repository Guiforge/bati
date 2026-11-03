// The map's one ambient clock (MODE_VIE = continu, Guillaume 01/11, see performance.md). A single
// shared value `c`, in ms, driven by one bounded timing: it only ever grows, towards the next
// multiple of CYCLE_MS that leaves VIE_MS (60 s) of life. Every animated element reads its phase
// from `c` and loops nothing itself, so they all reach the end of their gesture at the same moment
// (a multiple of CYCLE_MS is every element's rest pose) and, once the timing ends, nothing writes
// a shared value any more. It starts at focus and each touch of the map pushes the end 60 s on.
// It runs only with focus, without reduced motion (which includes the frozen/E2E mode, fige.ts)
// and without a screen reader. The walkers plan in windows of VAGUE_MIN_MS, so while the clock
// runs a new `depart` is published every VAGUE_MIN_MS of it.

import { useIsFocused } from "expo-router";
import { createContext, useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { DUREE_VIE_MS, MODE_VIE } from "@/constants/isoPoc";
import { useMouvementReduit } from "./fige";

/** One gust of the sails; a wave is a whole number of them. */
export const CYCLE_MS = 5000;
/** A planning window (walkers, animals): between 15 and 20 s with a 5 s cycle. */
export const VAGUE_MIN_MS = 15000;
/** How long the clock keeps running after the last touch (or the focus): at least this. */
export const VIE_MS = DUREE_VIE_MS;
/** T27: one turn a gust (it was two, a peak near 250 degrees a second). */
const TOURS_PAR_RAFALE = 1;
/** Share of a gust the sails stand still before it picks up. */
const REPOS = 0.15;

/** The end of the planning window that starts at `c`: the first rest pose at least VAGUE_MIN_MS later. */
export function cibleVague(c: number): number {
  "worklet";
  return Math.ceil((c + VAGUE_MIN_MS) / CYCLE_MS) * CYCLE_MS;
}

/** Where the clock stops if nothing touches the map from `c`: the first rest pose VIE_MS later. */
export function cibleVie(c: number): number {
  "worklet";
  return Math.ceil((c + VIE_MS) / CYCLE_MS) * CYCLE_MS;
}

/** The sails' angle in radians at clock `c`: still, accelerate, two turns, slow down, still. */
export function angleAiles(c: number): number {
  "worklet";
  const u = (c % CYCLE_MS) / CYCLE_MS;
  const v = Math.min(1, Math.max(0, (u - REPOS) / (1 - REPOS)));
  const lisse = v * v * (3 - 2 * v);
  return 2 * Math.PI * TOURS_PAR_RAFALE * lisse;
}

/** Latest start of a glint inside a cycle (share of it), so it ends before the next boundary. */
const DELAI_MAX = 0.4;
/** Share of a cycle one glint takes. */
const DUREE_REFLET = 0.6;

/**
 * A water glint at clock `c`: `avance` runs 0 to 1 along its stretch of canal, `opacite` fades
 * in and out (0 at both ends). `delai` (0 to 1) staggers cells. At a cycle boundary: 0 and 0.
 */
export function reflet(c: number, delai: number): { avance: number; opacite: number } {
  "worklet";
  const u = (c % CYCLE_MS) / CYCLE_MS;
  const v = Math.min(1, Math.max(0, (u - delai * DELAI_MAX) / DUREE_REFLET));
  return { avance: v, opacite: Math.sin(Math.PI * v) };
}

/** The clock, or null when the map has none (it then stands still). */
export const HorlogeContext = createContext<SharedValue<number> | null>(null);

/** A wave start: `n` counts them, `c0` is the clock value one began at. */
export type Depart = { n: number; c0: number };
/** The one source of a wave start, with the clock: the walkers plan only on a change of `n`. */
export const DepartContext = createContext<SharedValue<Depart> | null>(null);

/**
 * A touch of the map with a place: `n` counts them, `c0` is the clock value it landed at, `x` and
 * `y` where, in the map's dp. What a touch near startles (the roof crows, corbeaux.ts) reads it.
 */
export type Effroi = { n: number; c0: number; x: number; y: number };
export const EffroiContext = createContext<SharedValue<Effroi> | null>(null);

export function useHorloge(): {
  c: SharedValue<number>;
  depart: SharedValue<Depart>;
  effroi: SharedValue<Effroi>;
  touche: (x?: number, y?: number) => void;
} {
  const c = useSharedValue(0);
  const depart = useSharedValue<Depart>({ n: 0, c0: 0 });
  const effroi = useSharedValue<Effroi>({ n: 0, c0: 0, x: 0, y: 0 });
  const focus = useIsFocused();
  const reducedMotion = useMouvementReduit();
  // null until the reader state is known: no wave starts on the first render under TalkBack.
  const [lecteur, setLecteur] = useState<boolean | null>(null);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setLecteur, () => setLecteur(false));
    const abo = AccessibilityInfo.addEventListener("screenReaderChanged", setLecteur);
    return () => abo.remove();
  }, []);
  const actif = MODE_VIE === "continu" && focus && !reducedMotion && lecteur === false;
  // The gesture worklet that captured an older `touche` reads this, not the value of its render.
  const actifSv = useSharedValue(actif);
  // Where the running timing ends: no planning window is published at the rest pose itself.
  const finSv = useSharedValue(0);

  // Callable from a gesture worklet: extends the wave from where the clock stands, no jump.
  const lance = (x?: number, y?: number) => {
    "worklet";
    const de = c.get();
    if (x !== undefined && y !== undefined) effroi.set({ n: effroi.get().n + 1, c0: de, x, y });
    const cible = cibleVie(de);
    finSv.set(cible);
    // Only from a rest pose (a multiple of the cycle) does a wave start; mid-wave it is extended.
    if (de % CYCLE_MS === 0) depart.set({ n: depart.get().n + 1, c0: de });
    c.set(withTiming(cible, { duration: cible - de, easing: Easing.linear }));
  };
  const touche = (x?: number, y?: number) => {
    "worklet";
    if (actifSv.get()) lance(x, y);
  };

  // A new planning window every VAGUE_MIN_MS of clock, so the walkers go on walking for 60 s.
  useAnimatedReaction(
    () => Math.floor(c.get() / VAGUE_MIN_MS),
    (n, avant) => {
      if (avant === null || n <= avant || n * VAGUE_MIN_MS >= finSv.get()) return;
      depart.set({ n: depart.get().n + 1, c0: n * VAGUE_MIN_MS });
    },
  );

  const pret = lecteur !== null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `actif` stands for focus and motion
  useEffect(() => {
    // Until the reader state is known the clock neither starts nor is touched.
    if (!pret) return;
    actifSv.set(actif);
    // Not `touche()`: it reads `actifSv`, which on the JS thread may still hold the value from
    // before the `set` just above, so the clock never started and the film had one frame.
    if (actif) lance();
    else {
      // Leave the sails in a rest pose, not frozen mid-turn. `get()` on the JS thread may be a
      // frame stale; whatever it returns, its next cycle multiple is a rest pose. Up, never down:
      // a clock that stepped back put a crow already flown away (t < 0) on its perch again.
      c.set(Math.ceil(c.get() / CYCLE_MS) * CYCLE_MS);
    }
    // Also on unmount and before each restart: no timing outlives the map or the focus.
    return () => cancelAnimation(c);
  }, [actif, pret]);
  return { c, depart, effroi, touche };
}
