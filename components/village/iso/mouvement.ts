// The pure side of the motion layer (LIFE M1, MouvementBld.tsx draws): which entries of a building's
// motion file show at a rank, in which order the windows light at dusk, and which buildings move in a
// wave. What moves itself is already pure elsewhere and reused as it is: `flamme` (feux.ts) for the
// flicker, `fumee` (feux.ts) for the puffs, `reflet` (horloge.ts) for the glints, `inclinaisonBanniere`
// (fierte.ts) for the sway, `angleAiles` (horloge.ts) for the sails.

import type { LightAnchor } from "@/constants/buildingData";
import { atteint } from "@/constants/buildingData";
import type { BuildingCode } from "@/db/schema";
import { graine } from "./graine";
import { MOUVEMENTS } from "./motion";
import type { Effet } from "./motion/types";

/** Animated nodes the motion layer may hold at once, all buildings together (the map's worst case, iso-ciel.test). */
export const MOUVEMENT_NOEUDS_MAX = 8;
/** Between two windows lighting at dusk, and how long one takes to come up, ms. */
export const PAS_FENETRE_MS = 700;
export const FONDU_FENETRE_MS = 900;

/** A light's halo radius by kind, dp (a building's canvas is about 112 dp wide): a brazier, a lit window, a crystal. */
export const RAYON_LUEUR: Record<LightAnchor["kind"], number> = {
  fire: 9,
  crystal: 7,
  beam: 8,
  fenetre: 6,
  glyphe: 8,
};

/** What a building's file shows at a rank: the rank filter, and the night's lights only at night (or `parJour`). */
export function effetsAuRang(
  effets: readonly Effet[],
  rank: number,
  base: number,
  nuit: boolean,
): readonly Effet[] {
  return effets.filter(
    (e) => atteint(e, rank, base) && (e.kind !== "lueur" || nuit || !!e.parJour),
  );
}

/** Animated nodes one entry costs while it moves. */
export const noeudsDe = (e: Effet): number =>
  e.kind === "particules" || e.kind === "miroitement" ? e.nb : 1;

/** Every window's turn at dusk, 0 to n - 1: the order is the day's own, so it is not the list's. */
export function ordreAllumage(n: number, cle: string): readonly number[] {
  // `graine` is too linear in its last characters to shuffle five indices; one multiplicative mix does.
  const g = graine(cle);
  const clef = (i: number) => Math.imul(g + i * 40503 + 1, 2654435761) >>> 0;
  const trie = Array.from({ length: n }, (_, i) => i).sort((a, b) => clef(a) - clef(b) || a - b);
  return Array.from({ length: n }, (_, i) => trie.indexOf(i));
}

/** How long `n` windows take to be all lit, ms. */
export const dureeAllumage = (n: number): number =>
  Math.max(0, n - 1) * PAS_FENETRE_MS + FONDU_FENETRE_MS;

/** A window's light, 0 to 1, `t` ms into the dusk: it comes up on its turn (`tour`), eased. */
export function allumage(t: number, tour: number): number {
  "worklet";
  const v = Math.min(1, Math.max(0, (t - tour * PAS_FENETRE_MS) / FONDU_FENETRE_MS));
  return v * v * (3 - 2 * v);
}

/**
 * The buildings that move in a wave: the lowest hashes of the day and the wave number whose nodes
 * still fit MOUVEMENT_NOEUDS_MAX (a building that does not fit is skipped, a smaller one may). The
 * count is the file's whole list, whatever the rank, so it never depends on the hero.
 */
export function mouvementDeVague(
  montres: readonly BuildingCode[],
  jour: number,
  numero: number,
): ReadonlySet<BuildingCode> {
  const choisis = new Set<BuildingCode>();
  let reste = MOUVEMENT_NOEUDS_MAX;
  const candidats = montres
    .flatMap((code) => {
      const m = MOUVEMENTS[code];
      return m ? [{ code, noeuds: m.effets.reduce((s, e) => s + noeudsDe(e), 0) }] : [];
    })
    .sort(
      (a, b) =>
        graine(`${jour}:${numero}:mouvement:${a.code}`) -
          graine(`${jour}:${numero}:mouvement:${b.code}`) || a.code.localeCompare(b.code),
    );
  for (const { code, noeuds } of candidats) {
    if (noeuds > reste) continue;
    choisis.add(code);
    reste -= noeuds;
  }
  return choisis;
}

/** Where in a puff's sub-cycle (share of it) the `i`th of `nb` starts: spread, off the cycle's two ends. */
export const phaseBouffee = (i: number, nb: number, duree: number, decalage: number): number =>
  0.02 + (1 - duree - 0.04) * (((i + decalage) / nb) % 1);
