// The comic bubble (bulle BD) opened by a tap in the iso scene (docs/design/components/village-bulle.md):
// what it is about, where it opens, and what a further tap does to it. Pure, tested in
// __tests__/iso-bulle.test.ts; the drawing is Bulle.tsx.

import type { BuildingCode } from "@/db/schema";
import type { Role } from "./marcheurs";

/**
 * What a bubble is about. One door for every tappable thing of the scene: buildings, and (T26) the
 * villagers, by their id (a trade's name, or `h<n>` for an inhabitant, which wears `role`'s sprite).
 */
export type CibleBulle =
  | { type: "batiment"; code: BuildingCode }
  | { type: "villageois"; id: string; role: Role; habitant: boolean };

/** A bubble asked for: its subject, and the point its tail aims at, in window dp. */
export type Ouverture = { cible: CibleBulle; ancre: readonly [x: number, y: number] };

/** Where a view's top left lies in the window (its own seam: a jest host never measures). */
export function mesurerFenetre(
  vue: { measureInWindow: (cb: (x: number, y: number) => void) => void } | null,
  cb: (x: number, y: number) => void,
): void {
  if (vue) vue.measureInWindow(cb);
}

/** A stable key for a subject: the building's code, or the villager's id. */
export const cleCible = (c: CibleBulle): string =>
  `${c.type}-${c.type === "batiment" ? c.code : c.id}`;

export function memeCible(a: CibleBulle, b: CibleBulle): boolean {
  return cleCible(a) === cleCible(b);
}

/**
 * The bubble after a tap while `ouverte` shows: the same element closes it, another one replaces
 * it, the empty map (or anything outside the scene) closes it. Never two at once.
 */
export function apresTap(ouverte: Ouverture | null, touchee: Ouverture | null): Ouverture | null {
  if (!touchee) return null;
  if (ouverte && memeCible(ouverte.cible, touchee.cible)) return null;
  return touchee;
}

/** Room kept between the bubble and the safe area's edge. */
export const MARGE_BULLE = 8;
/** The tab bar's height over the bottom inset, as the tabs layout sets it. */
export const HAUTEUR_BARRE = 60;
/** The tail's length, from the frame's edge to its point. */
export const QUEUE_BULLE = 8;
/** Half the tail's base, and the frame's radius beside it: the tail never leaves the straight edge. */
const COIN = 12;
const LARGEUR_MAX = 320;
/** Above this font scale the bubble is the bottom sheet (decision of 30/10: read live). */
export const ECHELLE_FEUILLE = 1.3;
/** The bubble is held to this share of the free height, so one side of its anchor always has room. */
const PART_HAUTEUR_MAX = 0.45;

type Taille = { w: number; h: number };
type Insets = { top: number; bottom: number; left: number; right: number };

export type Placement =
  | {
      mode: "bulle";
      x: number;
      y: number;
      /** `haut`: the bubble lies above its anchor, its tail on the bottom edge. */
      cote: "haut" | "bas";
      /** The tail's point, from the frame's left edge. */
      queueX: number;
    }
  | { mode: "feuille" };

/**
 * The shell for `ouverte`, given the size measured for it (`taille`, null until its first layout):
 * the sheet beyond 130 % text whatever the size, else where `placerBulle` puts it once measured.
 */
export function etatBulle(
  ouverte: Ouverture | null,
  taille: Taille | null,
  ecran: Taille & { fontScale: number },
  insets: Insets,
): { feuille: boolean; placee: Extract<Placement, { mode: "bulle" }> | null } {
  if (!ouverte) return { feuille: false, placee: null };
  if (ecran.fontScale > ECHELLE_FEUILLE) return { feuille: true, placee: null };
  if (!taille) return { feuille: false, placee: null };
  const p = placerBulle({
    ancre: ouverte.ancre,
    taille,
    ecran,
    insets,
    fontScale: ecran.fontScale,
  });
  return p.mode === "bulle" ? { feuille: false, placee: p } : { feuille: true, placee: null };
}

/**
 * The tallest the bubble's frame grows (its content scrolls past it): short of the free height
 * (`insets.bottom` carries the tab bar), so a long deed list or a landscape window stays a bubble
 * and its text never goes under the bar.
 */
export function hauteurMaxBulle(ecranH: number, insets: Insets): number {
  return Math.floor(
    PART_HAUTEUR_MAX * (ecranH - insets.top - insets.bottom - 2 * MARGE_BULLE) - QUEUE_BULLE,
  );
}

/** The width the bubble is laid out at, before its height is known. */
export function largeurBulle(ecranW: number): number {
  return Math.min(LARGEUR_MAX, ecranW - 4 * MARGE_BULLE);
}

const borne = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Where the bubble of size `taille` opens for `ancre` (window dp): above it by default, below when
 * the room above is short of the bubble and its tail, clamped into the safe area with an 8 dp
 * margin; the tail follows the anchor, inside the frame's corners. The bottom sheet when the text
 * is above 130 %, or when neither side fits (the frame's height is held by `hauteurMaxBulle`).
 */
export function placerBulle({
  ancre,
  taille,
  ecran,
  insets,
  fontScale,
}: {
  ancre: readonly [x: number, y: number];
  taille: Taille;
  ecran: Taille;
  insets: Insets;
  fontScale: number;
}): Placement {
  if (fontScale > ECHELLE_FEUILLE) {
    return { mode: "feuille" };
  }
  const haut = insets.top + MARGE_BULLE;
  const bas = ecran.h - insets.bottom - MARGE_BULLE;
  const gauche = insets.left + MARGE_BULLE;
  const droite = ecran.w - insets.right - MARGE_BULLE;
  // An anchor off the screen (a sprite half out of the frame) is held on it (decision of 30/10).
  const ax = borne(ancre[0], gauche, droite);
  const ay = borne(ancre[1], haut, bas);
  const besoin = taille.h + QUEUE_BULLE;
  const cote = ay - haut >= besoin ? "haut" : bas - ay >= besoin ? "bas" : null;
  if (!cote || taille.w > droite - gauche) return { mode: "feuille" };
  const x = borne(ax - taille.w / 2, gauche, droite - taille.w);
  return {
    mode: "bulle",
    x,
    y: cote === "haut" ? ay - besoin : ay + QUEUE_BULLE,
    cote,
    queueX: borne(ax - x, COIN, taille.w - COIN),
  };
}
