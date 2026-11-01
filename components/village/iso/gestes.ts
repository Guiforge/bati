// The villagers' work gestures (T03, criterion 8), pure: what a villager does with its body while it
// stands at a place it came to work at (a segment marked `travail`, marcheurs.ts). No arm or tool is
// drawn: the whole figure moves about its feet (lean, bow, crouch, hop), on the node it already has,
// so a gesture adds no animated node. Each gesture is a loop scaled by an envelope that is 0 at
// both ends of the stop, so a villager never jumps into or out of it.

import type { Role, Segment } from "./marcheurs";

/** The pose offsets a gesture gives, all 0 at rest: dp up, degrees forward, share of height lost. */
export type Pose = { leve: number; penche: number; ecrase: number };

export const POSE_REPOS: Pose = { leve: 0, penche: 0, ecrase: 0 };

/** The gesture eases in and out over this long at each end of the stop, ms. */
export const ENVELOPPE_MS = 220;

type Geste = "frappe" | "beche" | "cueille" | "guette" | "hoche" | "danse" | "saute";

/** Which gesture each role works with: the smith strikes, the farmer digs, the herbalist picks… */
export const GESTE_DE: Record<Role, Geste> = {
  smith: "frappe",
  farmer: "beche",
  herbalist: "cueille",
  watcher: "guette",
  sage: "hoche",
  minstrel: "danse",
  champion: "saute",
};

/** One loop of each gesture, ms (T27 slowed the three quick ones: frappe 520, danse 760, saute 560). */
const PERIODE: Record<Geste, number> = {
  frappe: 700,
  beche: 1100,
  cueille: 1500,
  guette: 1800,
  hoche: 1400,
  danse: 1000,
  saute: 750,
};

/** One loop of the party's hop, ms. */
const PERIODE_JOIE = 800;

/** The pose of `role` at `t` ms into a work stop `duree` ms long (`t` read from the ambient clock). */
export function geste(role: Role, t: number, duree: number): Pose {
  "worklet";
  if (t <= 0 || t >= duree) return POSE_REPOS;
  const a = Math.min(1, t / ENVELOPPE_MS, (duree - t) / ENVELOPPE_MS);
  const g = GESTE_DE[role];
  const u = (t % PERIODE[g]) / PERIODE[g];
  const s = Math.sin(2 * Math.PI * u);
  if (g === "frappe") {
    // Raise slowly (70 % of the loop), strike fast past upright: the blow lands at the loop's end.
    const v = u < 0.7 ? u / 0.7 : 1 - ((u - 0.7) / 0.3) * 1.45;
    return { leve: 4 * Math.max(0, v) * a, penche: -24 * v * a, ecrase: 0 };
  }
  if (g === "beche") {
    // Bend down to the soil and come up: a deep bow on the half loop, a short rest upright.
    const v = u < 0.6 ? Math.sin((Math.PI * u) / 0.6) : 0;
    return { leve: -1.5 * v * a, penche: 28 * v * a, ecrase: 0.06 * v * a };
  }
  if (g === "cueille") {
    // Crouch, hold low, rise.
    const v = Math.min(1, 2 * Math.max(0, Math.sin(Math.PI * u)));
    return { leve: 0, penche: 10 * v * a, ecrase: 0.26 * v * a };
  }
  if (g === "guette") {
    // On its toes, a slow look one way then the other.
    return { leve: 3 * a, penche: 9 * s * a, ecrase: 0 };
  }
  if (g === "hoche") {
    // Two small nods, then a still half loop.
    const v = u < 0.5 ? Math.abs(Math.sin(4 * Math.PI * u)) : 0;
    return { leve: 0, penche: 9 * v * a, ecrase: 0 };
  }
  if (g === "danse") {
    // Sway from side to side, a little hop at each end.
    return { leve: 3 * Math.abs(s) * a, penche: 11 * s * a, ecrase: 0 };
  }
  // saute: hops in place, squashing a little on landing.
  const v = Math.abs(s);
  return { leve: 8 * v * a, penche: 0, ecrase: 0.12 * (1 - v) * a * a };
}

/** The party's pose (T26), the same for every trade: hops with a sway, the way a figure with no arms cheers. */
export function gesteJoie(t: number, duree: number): Pose {
  "worklet";
  if (t <= 0 || t >= duree) return POSE_REPOS;
  const a = Math.min(1, t / ENVELOPPE_MS, (duree - t) / ENVELOPPE_MS);
  const s = Math.sin(2 * Math.PI * ((t % PERIODE_JOIE) / PERIODE_JOIE));
  return { leve: 7 * Math.abs(s) * a, penche: 7 * s * a, ecrase: 0.1 * (1 - Math.abs(s)) * a * a };
}

/** The pose of a walker at `t` ms into its wave: its role's gesture during a work stop, else rest. */
export function poseA(role: Role, segments: readonly Segment[], t: number): Pose {
  "worklet";
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s?.travail && t > s.t0 && t < s.t0 + s.duree)
      return s.joie ? gesteJoie(t - s.t0, s.duree) : geste(role, t - s.t0, s.duree);
  }
  return POSE_REPOS;
}
