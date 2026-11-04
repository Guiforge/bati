// What surrounds the growth moment (moment.ts has the moment itself): the story line's timing, the
// haptic and the hammer, the camera's slide, the quiet of the village while it plays and the pulse
// of light that crosses the improved buildings after it. Pure. Neither the pulse nor the quiet
// runs with reduced motion.

import { createContext } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { BuildingCode } from "@/db/schema";
import { centreBatiment, ecranXY } from "./carteDemo";
import { emplacements } from "./isoLayout";
import type { Stade } from "./isoSpec";

/** The story line shows from here after the moment ends, for LEGENDE_MS. */
export const LEGENDE_DEBUT_MS = 900;
export const LEGENDE_MS = 1500;
/** The line fades in over this long (and rises LEGENDE_MONTEE_DP), and out over LEGENDE_SORTIE_MS (inside LEGENDE_MS). */
export const LEGENDE_ENTREE_MS = 200;
export const LEGENDE_SORTIE_MS = 300;
export const LEGENDE_MONTEE_DP = 6;

/**
 * What the moment sets off: a light vibration when vibrations are on, the
 * hammer blow when sounds are on. `marteau` is `playHit` (src/sounds.ts), the forge-hit cut of T32.
 */
export function revelation(
  reglages: { hapticsEnabled: boolean; soundEnabled: boolean },
  actions: { vibrer: () => void; marteau?: () => void },
): void {
  if (reglages.hapticsEnabled) actions.vibrer();
  if (reglages.soundEnabled) actions.marteau?.();
}

/** The pulse of light and the village's quiet last this long after the moment, ms. */
export const ONDE_MS = 1000;
/** The pulse starts here, ms from the moment's end, and takes FRONT_MS to cross the island. */
export const IMPACT_MS = 240;
export const FRONT_MS = 480;
/** The front reaches PORTEE_DP (the far end of the island) at this time, ms. */
export const ARRIVEE_MAX_MS = IMPACT_MS + FRONT_MS;
/** A fire's flare lasts this long once the front passed, ms (ARRIVEE_MAX_MS + LUIT_MS < ONDE_MS). */
export const LUIT_MS = 240;
export const PORTEE_DP = 700;
/** What the village is given: the pulse's timing (ms from the moment's end) and plan. */
export type RevelationVillage = {
  t: SharedValue<number>;
  /** The building that grew first: the wave starts at its foot. */
  source: BuildingCode;
  /** When the front reaches each improved building, ms; its fire flares then. */
  retards: ReadonlyMap<BuildingCode, number>;
};
/** Null at rest, in reduced motion and in the frozen mode; set from the tap until the pulse is over (the village is quiet then). */
export const RevelationContext = createContext<RevelationVillage | null>(null);

/** When the front reaches a building `d` dp (a diamond's distance, |dx| + 2|dy|) from the source, ms. */
export function retardOnde(d: number): number {
  return Math.round(IMPACT_MS + Math.min(1, Math.max(0, d / PORTEE_DP)) * FRONT_MS);
}

/**
 * The pulse's plan: every improved building (not one that grows now) gets the time the front
 * reaches it, and its fire flares then (no node of its own: the fire's own).
 */
export function planOnde(
  source: readonly [number, number],
  batiments: readonly {
    code: BuildingCode;
    centre: readonly [number, number];
    ameliore: boolean;
  }[],
): Pick<RevelationVillage, "retards"> {
  const touches = batiments
    .filter((b) => b.ameliore)
    .map((b) => ({
      ...b,
      d: Math.abs(b.centre[0] - source[0]) + 2 * Math.abs(b.centre[1] - source[1]),
    }));
  return { retards: new Map(touches.map((b) => [b.code, retardOnde(b.d)])) };
}

/** A fire's extra height while the front passes: 0 to 0.5 and back to 0 within LUIT_MS. */
export function flareOnde(t: number, retard: number): number {
  "worklet";
  const v = (t - retard) / LUIT_MS;
  return v <= 0 || v >= 1 ? 0 : 0.5 * Math.sin(Math.PI * v);
}

// The camera (bible §10.7): a shake at the impact, then a slow slide toward the building (ease-out,
// 500 ms), both only once the impact has happened (anim-39). useCameraIso plays them.
// anim-39: 4 px over 240 ms, so a capture at 8 frames a second still catches it.
export const SECOUSSE_PX = 4;
export const SECOUSSE_MS = 240;
export const GLISSE_MS = 500;
/** The slide's extra zoom over the framing, a small push-in toward the building. */
export const GLISSE_ZOOM = 1.06;

type Pt = readonly [number, number];

/** The footprint's four corners (back, right, front, left) on the screen, dp, from its centre (an iso parallelogram, 2:1 for a square). */
export function coinsEmprise(code: BuildingCode): readonly Pt[] {
  const { coin, emprise } = emplacements[code];
  const [gx, gy] = coin;
  const [cx, cy] = ecranXY(centreBatiment(code));
  return (
    [
      [gx, gy],
      [gx + emprise[0], gy],
      [gx + emprise[0], gy + emprise[1]],
      [gx, gy + emprise[1]],
    ] as const
  ).map((p) => {
    const [x, y] = ecranXY(p);
    return [x - cx, y - cy] as const;
  });
}

/** The wave's timing for one building's fire, when the front reaches it. */
export function ondeDe(r: RevelationVillage | null, code: BuildingCode) {
  const retard = r?.retards.get(code);
  return r && retard !== undefined ? { t: r.t, retard } : undefined;
}

/** A building counts as improved once past its plain first stage. */
export const ameliore = (stade: Stade): boolean => stade !== "rough";

/** The caption's widest, dp, and the height it is given room for above a roof. */
const LEGENDE_L = 300;
const LEGENDE_H_ESTIMEE = 64;
export const LEGENDE_ECART = 8;

/** The caption's box from the building's top (`p`, frame dp): above it, or at the bottom when it would leave the frame (anim-33). */
export function placeLegende(
  p: readonly [number, number] | null,
  aire: { w: number; h: number; bas?: number },
  haut: number,
): { left: number; width: number; bottom: number } {
  const width = Math.min(LEGENDE_L, aire.w - 32);
  const x = p ? p[0] : aire.w / 2;
  const left = Math.min(Math.max(16, x - width / 2), aire.w - 16 - width);
  const dessus = p !== null && p[1] - LEGENDE_ECART - LEGENDE_H_ESTIMEE > haut + LEGENDE_ECART;
  return {
    left,
    width,
    bottom: dessus && p ? aire.h - (p[1] - LEGENDE_ECART) : (aire.bas ?? 0) + 16,
  };
}
