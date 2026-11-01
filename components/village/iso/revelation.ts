// The reveal of a grown building (T37, FIN-MAG): the old stage gathers itself, the new one lands
// past its size and settles. Pure: the timings and what the moment sets off.
// T41: the same moment throws a burst of the trade's magic and a golden wave across the island,
// lighting the windows and fires of the buildings already improved. Both play on the
// `RevelationContext` timing (0 to ONDE_MS), end by themselves, and never run with reduced motion.

import { createContext } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { BuildingCode } from "@/db/schema";
import { centreBatiment, ecranXY } from "./carteDemo";
import type { GenreEffet } from "./effets";
import { emplacements } from "./isoLayout";
import type { Stade, TokenCouleur } from "./isoSpec";

// FIN-MAG tour 1, the sequence (ms from the new stage's layer): the old stage gathers itself
// (squashes 4 % and lifts 6 px), goes flat and warm, the world holds its breath (80 ms), the gold
// ring and the dust leave from the footprint, the new stage lands 6 % too big and settles in 250 ms
// while the burst climbs; a last stage lights its banner and windows; a one-line story follows.

/** The old stage squashes and lifts, ms. */
export const ANTICIPATION_MS = 120;
/** The old stage as a flat warm silhouette, ms. */
export const SILHOUETTE_MS = 120;
/** The hit-stop: nothing moves while the ring and the dust leave, ms. */
export const ARRET_MS = 80;
/** The ring and the dust start here, ms. */
export const IMPACT_MS = ANTICIPATION_MS + SILHOUETTE_MS;
/** The new stage replaces the old one here, ms. */
export const NOUVEAU_MS = IMPACT_MS + ARRET_MS;
/** The new stage settles from its overshoot, ms. */
export const POSE_MS = 250;
export const TASSEMENT = 0.96;
export const LEVEE_PX = 6;
export const DEPASSEMENT = 1.06;
/** The new stage is down and still: the last stage's banner and windows light now. */
export const REVELATION_MS = NOUVEAU_MS + POSE_MS;
/** The story line shows from here, for LEGENDE_MS: the whole moment lasts 2.4 s. */
export const LEGENDE_DEBUT_MS = 900;
export const LEGENDE_MS = 1500;
/** The line fades in over this long (and rises LEGENDE_MONTEE_DP), and out over LEGENDE_SORTIE_MS (inside LEGENDE_MS). */
export const LEGENDE_ENTREE_MS = 200;
export const LEGENDE_SORTIE_MS = 300;
export const LEGENDE_MONTEE_DP = 6;

const borne = (v: number): number => {
  "worklet";
  return Math.min(1, Math.max(0, v));
};
const sortie = (v: number): number => {
  "worklet";
  return 1 - (1 - v) ** 3;
};

/** The old stage at `t`: gathers itself during ANTICIPATION_MS, stays so, and is gone at NOUVEAU_MS. */
export function poseAncien(t: number): { echelle: number; y: number } {
  "worklet";
  if (t >= NOUVEAU_MS) return { echelle: 0, y: 0 };
  const e = sortie(borne(t / ANTICIPATION_MS));
  return { echelle: 1 - (1 - TASSEMENT) * e, y: -LEVEE_PX * e };
}

/**
 * anim-30, anim-31: the silhouette, a flat warm shape of the stage that comes, standing where the old
 * one gathered itself (squashed and lifted as it ended): from ANTICIPATION_MS (from 0 for a building
 * that was not there) to the hit-stop's end, when the new stage itself lands. Nothing of the new
 * stage shows before that: the silhouette is its outline only.
 */
export function poseSilhouette(t: number, neuf: boolean): { echelle: number; y: number } {
  "worklet";
  if (t >= NOUVEAU_MS || (!neuf && t < ANTICIPATION_MS)) return { echelle: 0, y: 0 };
  return { echelle: TASSEMENT, y: -LEVEE_PX };
}

/** The old stage, gone once its silhouette takes over (the silhouette has the new stage's shape). */
export function poseAncienVisible(t: number): { echelle: number; y: number } {
  "worklet";
  return t >= ANTICIPATION_MS ? { echelle: 0, y: 0 } : poseAncien(t);
}

/** The new stage at `t`: absent before NOUVEAU_MS, then 6 % too big and lifted, settling in POSE_MS. */
export function poseNouveau(t: number): { echelle: number; y: number } {
  "worklet";
  if (t < NOUVEAU_MS) return { echelle: 0, y: 0 };
  const e = sortie(borne((t - NOUVEAU_MS) / POSE_MS));
  return { echelle: DEPASSEMENT - (DEPASSEMENT - 1) * e, y: -LEVEE_PX * (1 - e) };
}

/**
 * What the moment the new stage shows sets off: a light vibration when vibrations are on, the
 * hammer blow when sounds are on. `marteau` is `playHit` (src/sounds.ts), the forge-hit cut of T32.
 */
export function revelation(
  reglages: { hapticsEnabled: boolean; soundEnabled: boolean },
  actions: { vibrer: () => void; marteau?: () => void },
): void {
  if (reglages.hapticsEnabled) actions.vibrer();
  if (reglages.soundEnabled) actions.marteau?.();
}

/** The layer (ring, burst, silence of the village) never lasts longer than this, ms: the old reveal's second. */
export const ONDE_MS = 1000;
/** The ring takes this long to cross the island, from IMPACT_MS. */
export const ANNEAU_MS = 480;
/** The front reaches PORTEE_DP (the far end of the island) at this time, ms. */
export const ARRIVEE_MAX_MS = IMPACT_MS + ANNEAU_MS;
/** A window stays lit this long once the front passed, ms (ARRIVEE_MAX_MS + LUIT_MS < ONDE_MS). */
export const LUIT_MS = 240;
export const PORTEE_DP = 700;
/** Lit windows during the wave: the nodes it takes, in the places the silenced night lights leave. */
export const NOEUDS_ONDE = 4;
/**
 * react-native-svg draws a Svg into a software bitmap of its pixel size and redraws all of it on
 * every animated prop: at 1400 x 700 dp the ring was a 27 MB bitmap per frame for 0.56 s (the late
 * frames of qa-audit2). It is drawn at this share of its size and the GPU enlarges it: a soft gold
 * ring loses nothing, and the bitmap is 6 times smaller.
 */
export const ECHELLE_BITMAP = 0.4;
/** The dust of the four corners drifts out in this long, ms, from the impact. */
export const POUSSIERE_MS = 480;
const DERIVE_DP = 26;

/** What the moment gives the village: the timing (ms from the new stage), the wave's plan. */
export type RevelationVillage = {
  t: SharedValue<number>;
  /** The building that grew first: the wave starts at its foot. */
  source: BuildingCode;
  /** When the front reaches each improved building, ms; its fire flares then. */
  retards: ReadonlyMap<BuildingCode, number>;
  /** The few improved buildings whose windows light as it passes. */
  allume: ReadonlySet<BuildingCode>;
  /** By day the ring is warmer and stronger and the dust darker than the sunlit ground (H4-05). */
  jour?: boolean;
};
/** Null at rest, in reduced motion and in the frozen mode; set while the reveal plays (the village is quiet then). */
export const RevelationContext = createContext<RevelationVillage | null>(null);

/** The burst of a trade (no violet: runes are pale gold). */
export type EclatMetier = { genre: GenreEffet; tons: readonly [TokenCouleur, TokenCouleur] };
const OR: EclatMetier = { genre: "etincelles", tons: ["resourceGold", "isoEclat"] };
const ECLATS: Readonly<Partial<Record<BuildingCode, EclatMetier>>> = {
  wizard_tower: { genre: "runes", tons: ["isoEclat", "resourceGold"] },
  forge: { genre: "braise", tons: ["isoFlamme", "isoFlammeCoeur"] },
  dragon_lair: { genre: "braise", tons: ["isoFlamme", "isoFlammeCoeur"] },
  druid_grove: { genre: "lucioles", tons: ["isoLucioleVerte", "isoEclat"] },
};
export const eclatDe = (code: BuildingCode): EclatMetier => ECLATS[code] ?? OR;

/** When the front reaches a building `d` dp (a diamond's distance, |dx| + 2|dy|) from the source, ms. */
export function retardOnde(d: number): number {
  return Math.round(IMPACT_MS + Math.min(1, Math.max(0, d / PORTEE_DP)) * ANNEAU_MS);
}

/**
 * The wave's plan: every improved building (not one that grows now) gets the time the front
 * reaches it; the NOEUDS_ONDE nearest ones that have windows light them.
 */
export function planOnde(
  source: readonly [number, number],
  batiments: readonly {
    code: BuildingCode;
    centre: readonly [number, number];
    ameliore: boolean;
    fenetres: boolean;
  }[],
): Pick<RevelationVillage, "retards" | "allume"> {
  const touches = batiments
    .filter((b) => b.ameliore)
    .map((b) => ({
      ...b,
      d: Math.abs(b.centre[0] - source[0]) + 2 * Math.abs(b.centre[1] - source[1]),
    }))
    .sort((a, b) => a.d - b.d || a.code.localeCompare(b.code));
  return {
    retards: new Map(touches.map((b) => [b.code, retardOnde(b.d)])),
    allume: new Set(
      touches
        .filter((b) => b.fenetres)
        .slice(0, NOEUDS_ONDE)
        .map((b) => b.code),
    ),
  };
}

/** A window lit by the wave: 1 for LUIT_MS once the front passed, else 0 (flat, 0 again by the end). */
export function allumeOnde(t: number, retard: number): number {
  "worklet";
  return t >= retard && t < retard + LUIT_MS ? 1 : 0;
}

/** A fire's extra height while the front passes: 0 to 0.5 and back to 0 within LUIT_MS. */
export function flareOnde(t: number, retard: number): number {
  "worklet";
  const v = (t - retard) / LUIT_MS;
  return v <= 0 || v >= 1 ? 0 : 0.5 * Math.sin(Math.PI * v);
}

/** The ring of the wave: nothing before the impact, then `echelle` (share of the way to PORTEE_DP) grows to 1 and fades out with it. */
export function anneauOnde(t: number): { echelle: number; opacite: number } {
  "worklet";
  const v = borne((t - IMPACT_MS) / ANNEAU_MS);
  return {
    echelle: v,
    opacite: t < IMPACT_MS || t >= ARRIVEE_MAX_MS ? 0 : 0.85 * (1 - v) ** 2,
  };
}

// E2 (bible §10): the burst is a few small warm points born at the roof of the building that rose,
// staggered, rising then falling under gravity and shrinking out; one Svg path per tone, drawn
// by `pointsChemin` (no big four-point stars). All of them are over by ONDE_MS.
/** Points thrown by the burst (8 to 12): E5 takes the most, so the burst reads by day. */
export const NB_POINTS = 12;
/** Each point leaves this long after the one before, ms. */
export const POINTS_DECALAGE_MS = 14;
/** A point lives this long, ms: the last one (NB_POINTS - 1 steps late) is gone before ONDE_MS. */
export const POINTS_VIE_MS = 520;
/** The burst's Svg box, dp; the points are born at (POINTS_L / 2, POINTS_H - 12), the roof. */
export const POINTS_L = 120;
export const POINTS_H = 100;
const GRAVITE = 260;
const frac = (v: number): number => {
  "worklet";
  return v - Math.floor(v);
};

/**
 * The points of tone `ton` (0 or 1: even and odd ones) at `t`, as one path of hexagons 2 to 4 dp
 * wide. A point is absent before its start, climbs fast, falls back under gravity and shrinks to
 * nothing in its last stretch.
 */
export function pointsChemin(t: number, ton: 0 | 1): string {
  "worklet";
  let d = "";
  for (let i = ton; i < NB_POINTS; i += 2) {
    const v = (t - NOUVEAU_MS - i * POINTS_DECALAGE_MS) / POINTS_VIE_MS;
    if (v < 0 || v >= 1) continue;
    const u = (v * POINTS_VIE_MS) / 1000;
    const x = POINTS_L / 2 + (frac(i * 0.755) - 0.5) * 20 + (frac(i * 0.618) - 0.5) * 70 * v;
    const y = POINTS_H - 12 - (80 + frac(i * 0.37 + 0.2) * 40) * u + 0.5 * GRAVITE * u * u;
    // E5 (anim-32): 4 to 5 dp wide, a brown rim drawn by the owner, readable on sunlit sand.
    const r = (2 + (i % 2) * 0.5) * (1 - Math.max(0, (v - 0.4) / 0.6) ** 2);
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      d += `${k ? "L" : "M"}${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`;
    }
    d += "Z";
  }
  return d;
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

/** The footprint's four corners on the screen, dp, from its centre (an iso parallelogram, 2:1 for a square). */
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

/**
 * The ring as a closed path in the ring's box (2 x PORTEE_DP wide, centred): the footprint itself
 * at `echelle` 0, the same diamond grown until its half-width reaches `reach` dp at 1.
 */
export function anneauChemin(coins: readonly Pt[], echelle: number, reach: number): string {
  "worklet";
  let demi = 1;
  for (const c of coins) demi = Math.max(demi, Math.abs(c[0]));
  const s = (demi + echelle * (reach - demi)) / demi;
  return `${coins
    .map((c, i) => `${i ? "L" : "M"}${PORTEE_DP + c[0] * s},${PORTEE_DP / 2 + c[1] * s}`)
    .join("")}Z`;
}

/** The dust at `t`: how far it has drifted (0 to 1) and how visible it is; nothing before the impact or after POUSSIERE_MS. */
export function poussiereOnde(t: number): { derive: number; opacite: number } {
  "worklet";
  const v = borne((t - IMPACT_MS) / POUSSIERE_MS);
  return {
    derive: sortie(v),
    opacite: t < IMPACT_MS || t >= IMPACT_MS + POUSSIERE_MS ? 0 : 0.9 * (1 - v),
  };
}

// An irregular hexagon of unit radius (a puff of dust seen flat), as angle and radius.
const BOUFFEE: readonly Pt[] = [
  [0, 1],
  [1.1, 0.8],
  [2.1, 1],
  [3.2, 0.85],
  [4.2, 1],
  [5.2, 0.8],
];

/** Four puffs, one at each corner of the footprint, drifting outward and swelling as `derive` goes 0 to 1. */
export function poussiereChemin(coins: readonly Pt[], derive: number): string {
  "worklet";
  // E5 (anim-32, H4-05): a real puff, wide from the first frame and swelling out.
  const r = 9 + 15 * derive;
  return coins
    .map((c) => {
      const n = Math.hypot(c[0], c[1]) || 1;
      const x = PORTEE_DP + c[0] + (c[0] / n) * DERIVE_DP * derive;
      const y = PORTEE_DP / 2 + c[1] + (c[1] / n) * (DERIVE_DP / 2) * derive;
      const pts = BOUFFEE.map(
        ([a, k], i) =>
          `${i ? "L" : "M"}${x + Math.cos(a) * r * k},${y + (Math.sin(a) * r * k) / 2}`,
      );
      return `${pts.join("")}Z`;
    })
    .join("");
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
