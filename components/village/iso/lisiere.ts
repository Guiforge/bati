// The lisiere (L4-T08a): trees, groves and rocks on the cells just off the island, so it does not
// float on the sky. Which cells carry one is fixed for a build (a hash of the cell, no randomness);
// which of them show depends only on the island: the ones within RAYON cells of it, fading with the
// distance. They stand without ground tile and cast no drawn shadow, are never tapped and never
// move. The shadow rule is still kept on the layout's terms (no decor shadow on a building, a path
// or another decor), so a ground tile under them later breaks nothing.

import raw from "@/constants/isoLisiere.json";
import type { BuildingCode } from "@/db/schema";
import { type Case, emplacements, type Sol, TAILLE } from "./isoLayout";
import { clePiece } from "./pieces";

/** How many cells off the island the lisiere reaches. */
export const RAYON = 4;
/**
 * Opacity by distance to the island: always 1 (audit DA lot 3). It faded to 0.3 at RAYON, which read
 * as grey ghost trees now the land has no sky to fade into; a far tree is as solid as a near one.
 */
export const opacite = (_r: number) => 1;
/**
 * The whole level-0 decode (audit of 31/10: half of it, stretched to the on-screen size, read as a
 * blurred tree at the front of the village). Measured 31/10 on the 42 trees of the finished island:
 * 0.68 MiB at 0.5, 1.54 at 0.75, 2.74 at 1 (rocks already at 1: 2.12 MiB in all at 0.5, 4.18 at 1).
 */
export const ECHELLE_DECODE = 1;
/** A lisiere rock keeps its full level-0 decode (T38, T22 blur): half of it read as a blurred boulder beside the dam, and it is darkened and large, unlike a tree. */
export const ECHELLE_ROCHER = 1;
export const echelleLisiere = (cle: string, decode = ECHELLE_DECODE) =>
  cle.startsWith("decor/rochers") ? ECHELLE_ROCHER : decode;

export type PieceLisiere = {
  /** The image family and name, without ambiance: `clePiece(famille, nom, ambiance)` is the key. */
  famille: string;
  nom: string;
  /** The key for the default ambiance (nuit); the map resolves its own with `clePiece`. */
  cle: string;
  miroir: false;
  case: Case;
  decor: true;
  kind: Sol;
  /** The building whose plot it stands on: it goes as soon as one cell of the plot shows. */
  batiment?: BuildingCode;
};

/** The lisiere: fixed, in scan order, read from constants/isoLisiere.json (written by the test). */
export const LISIERE: readonly PieceLisiere[] = raw.pieces.map(
  ({ famille, nom, kind, case: c, batiment }) => ({
    famille,
    nom,
    cle: clePiece(famille, nom),
    miroir: false,
    case: [c[0] ?? 0, c[1] ?? 0],
    decor: true,
    kind: kind as Sol,
    batiment: (batiment ?? undefined) as BuildingCode | undefined,
  }),
);

/**
 * How far a cell is from the island, in cells (king moves): 1 to RAYON for the ones the lisiere shows
 * on, null for an island cell itself and for anything beyond RAYON.
 */
export function anneau(visible: readonly (readonly boolean[])[], [gx, gy]: Case): number | null {
  if (visible[gy]?.[gx]) return null;
  for (let r = 1; r <= RAYON; r++)
    for (let x = gx - r; x <= gx + r; x++)
      for (let y = gy - r; y <= gy + r; y++)
        if (Math.max(Math.abs(x - gx), Math.abs(y - gy)) === r && visible[y]?.[x]) return r;
  return null;
}

/** The pieces on show for an island, each with its opacity. Nothing for a cell that is not shown. */
export function lisiereMontree(
  visible: readonly (readonly boolean[])[],
): { piece: PieceLisiere; opacite: number }[] {
  return LISIERE.flatMap((piece) => {
    const r = anneau(visible, piece.case);
    const plot = piece.batiment ? emplacements[piece.batiment].cases : [];
    const montre = plot.some(([gx, gy]) => visible[gy]?.[gx]);
    // The back of the island stands against the world's forest and mountains, which replace the
    // lisiere there (L6-T10): a faded tree would hang in the sky. Only the side and front ones stay,
    // on the ground at the island's edge.
    const devant = piece.case[0] + piece.case[1] >= TAILLE - 2;
    return r === null || montre || !devant ? [] : [{ piece, opacite: opacite(r) }];
  });
}

/**
 * T39: the one painted tree (decor/arbre_a) is told apart in code by a mirror on one cell in two
 * (a hash of the cell: the same forest on every visit, no animated node; only the image is
 * flipped, the ground shadow is the piece's own). A size range or a tint overlay was tried and
 * dropped: a new image size or 12 more opacity nodes break the ratchets of iso-perf-compteur.
 */
function miroirArbre([gx, gy]: Case): boolean {
  const h = Math.imul(gx + 64, 73856093) ^ Math.imul(gy + 64, 19349663) ^ Math.imul(3, 83492791);
  return ((h >>> 16) & 1) === 1;
}

/** Whether a decor piece is drawn mirrored: its own flag, or the painted tree's hash. */
export const retournee = (p: { cle: string; decor: boolean; miroir: boolean; case: Case }) =>
  p.miroir || (p.decor && p.cle.startsWith("decor/arbre_a") && miroirArbre(p.case));
