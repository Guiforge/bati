// The world around the island, the pure side. L6-T17: the forest and the rocks lie
// in the map's own space, on the camera's transform, over an extent larger than
// anything the camera can show; they are laid out in tiles of art reused around the island (a few
// images shared by every cell, so the memory is a handful of tiles, not the area). All fixed by a
// seed: the world is the same on every visit. T23: an iso view looks down on the ground, so there is
// no sky, no horizon and no mountains; the world covers the whole frame. Nothing here draws or
// moves; Monde.tsx draws it.

import { COTE, ecranXY, emprise, HAUTEUR, LARGEUR } from "./carteDemo";
import { CASES, paliers } from "./isoLayout";
import tuilesJson from "./mondeTuiles/tuiles.json";
import { ileJouable, PART_ILE } from "./navigation";
import { bruit, hasard as hachage } from "./solVarie";

export const ESPECES = ["rond", "conifere", "clair"] as const;
export type Espece = (typeof ESPECES)[number];

/** A seeded generator of numbers in [0, 1): same seed, same world. */
export function mulberry32(a: number) {
  let t = a;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** One forest tile of art: what it holds (mondeTuiles/tuiles.json, which generer.py draws). */
export type Tuile = keyof typeof tuilesJson.tuiles;
export const TUILES: Record<
  Tuile,
  { arbres: Record<Espece, number>; buissons: number; rochers: number; hauteur: number[] }
> = tuilesJson.tuiles;

/** A cell of the world's grid, in map dp. A forest tile's image is `IMAGE` wide and sits a margin outside it. */
export const CELLULE = 320;
export const IMAGE = 384;
export const MARGE_X = 32;
export const MARGE_HAUT = 64;
/** How far a forest tile is nudged inside its margin (L6-T20), at most: the reach's only spare (T23). */
const DECALE_MAX = MARGE_X - 16;
/** No tall crown within this distance of the finished island's rim: the clearing around it. */
const CLAIRIERE = 80;
/** The clearing round a one-cell island: the forest stands almost against the first hamlet (L6-T19). */
const CLAIRIERE_MIN = 28;
const CELLULES_MAX = paliers.flat().filter((p) => p !== null).length;

/** The clearing's width for an island of `visible`: it widens with the island, so the forest backs off as the village grows. */
export function clairiere(visible: readonly (readonly boolean[])[]): number {
  const n = visible.flat().filter(Boolean).length;
  return CLAIRIERE_MIN + (CLAIRIERE - CLAIRIERE_MIN) * Math.min(1, n / CELLULES_MAX);
}

/**
 * How far (px, py) is outside the island of `visible`, in dp (negative inside it): the nearest
 * cell's diamond. Near a diamond's vertex it reads a little short, which only widens the clearing.
 */
export function distCases(
  visible: readonly (readonly boolean[])[],
): (px: number, py: number) => number {
  const centres = CASES.flatMap(([gx, gy]) =>
    visible[gy]?.[gx] ? [ecranXY([gx + 0.5, gy + 0.5])] : [],
  );
  const [a, b] = [COTE / 2, COTE / 4];
  const echelle = (a * b) / Math.hypot(a, b);
  // A loop, not a map and a spread: casesMonde calls it 9 times a cell, over ~400 centres, on the
  // map's first render (PLAN-PERF P2, the top of its profile).
  return (px, py) => {
    let min = Number.POSITIVE_INFINITY;
    // Indexed, no destructuring: Babel turns a destructured loop variable into a helper call.
    for (let i = 0; i < centres.length; i++) {
      const c = centres[i] as readonly [number, number];
      const d = Math.abs(px - c[0]) / a + Math.abs(py - c[1]) / b;
      if (d < min) min = d;
    }
    return (min - 1) * echelle;
  };
}

export type Zone = { x0: number; x1: number; y0: number; y1: number };

/**
 * The part of the map the camera can ever show: without an island, with half a cell to spare; with
 * one, with only the forest tiles' nudge (`DECALE_MAX`, T23) to spare. The pan bounds (navigation.ts)
 * let the island's rim go `1 - PART_ILE` of the frame past its far side, so the frame, in map dp, reaches
 * `(1 - PART_ILE) * frame / zoom` beyond the island; that is largest at the lowest zoom. The
 * island's box holds the map's centre (the framing puts it there) and sits inside `LARGEUR` x `HAUTEUR`.
 */
export function etendue(
  zmin: number,
  w: number,
  h: number,
  visible?: readonly (readonly boolean[])[],
): Zone {
  // The pan bounds keep part of the island's middle half in view (navigation.ts `ileJouable`), so
  // the frame reaches `portee` beyond that box. Without an island: the finished one, the whole map,
  // with half a cell to spare.
  const ile = visible && emprise(visible);
  const boite = ileJouable(ile || { x0: 0, x1: LARGEUR, y0: 0, y1: HAUTEUR });
  // L6-T20: with the island's real box the reach is the frame minus what the pan keeps in view
  // (navigation.ts `axe`), so a small island at palier 1 needs a few cells, not the whole map's.
  // T23: the land fills the frame's top too (no sky), so the reach is the same on every side.
  const marge = ile ? DECALE_MAX : CELLULE / 2;
  const portee = (a: number, taille: number) =>
    Math.max((1 - PART_ILE) * a, a - zmin * taille) / zmin + marge;
  const [l, k] = [boite.x1 - boite.x0, boite.y1 - boite.y0];
  // No clamp: an island under half of the frame can be pushed nearly a frame away, past the map
  // (review L6-T20; at zoom 0.3 a palier 1 showed bare ground below).
  return {
    x0: boite.x0 - portee(w, l),
    x1: boite.x1 + portee(w, l),
    y0: boite.y0 - portee(h, k),
    y1: boite.y1 + portee(h, k),
  };
}

/** Distance from (px, py) to the segment (ax, ay)-(bx, by). */
function versSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

/** How far (px, py) is outside the island's diamond, in dp; negative inside it. */
export function distIle(px: number, py: number): number {
  const a = LARGEUR / 2;
  const b = HAUTEUR / 2;
  const s = [
    [0, b, a, 0],
    [a, 0, 2 * a, b],
    [2 * a, b, a, 2 * b],
    [a, 2 * b, 0, b],
  ] as const;
  const d = Math.min(...s.map(([x0, y0, x1, y1]) => versSegment(px, py, x0, y0, x1, y1)));
  return Math.abs(px - a) / a + Math.abs(py - b) / b <= 1 ? -d : d;
}

export type CaseMonde = {
  genre: "foret";
  tuile: Tuile;
  x: number;
  y: number;
  miroir: boolean;
  /**
   * The image's scale, 0.8 to 1: a grove of unequal trees, not a grid of clones (audit DA lot 3).
   * No per-cell tint: an opacity per image was the 61 ms frame (PLAN-PERF P0).
   */
  echelle: number;
  /** The ring the cell belongs to: -1 for the glade, else the index in ANNEAUX (the tests read the frontiers). */
  rang: number;
};

/** A forest tile's nudge, inside its margin (L6-T20). */
const decale = (hasard: () => number) => (hasard() - 0.5) * 2 * DECALE_MAX;

/**
 * The rings of density round the village, by `eloignement` in cells: open ground with a few
 * trees, a light wood, a dark one, then the thickest forest at the back of the frame (audit of
 * 31/10: few trees near the rim and in front, dense behind). No birch tile, and no mixed one inside
 * 2.3 cells: their pale round trees read as unpainted next to the inked island (iter-01 H1-03).
 */
const ANNEAUX: readonly [number, readonly Tuile[]][] = [
  [0.8, ["rochers", "clairiere"]],
  [1.3, ["rochers", "coni"]],
  [2.3, ["coni", "mixte"]],
  [Number.POSITIVE_INFINITY, ["dense", "coni", "bouleaux"]],
];

/** The tiles of the ring `eloignement` cells from the village (see `eloignement`). */
export const anneauForet = (eloignement: number): readonly Tuile[] =>
  ANNEAUX[rangAnneau(eloignement)]?.[1] ?? ["dense"];

/** The index of the ring `eloignement` cells from the village in ANNEAUX. */
const rangAnneau = (eloignement: number) =>
  Math.max(
    0,
    ANNEAUX.findIndex(([m]) => eloignement < m),
  );

/** How much a cell below the island's middle counts as nearer (dp per cell of depth, up to 1.5 cells), and a cell above as farther. */
const DEVANT = 150;
/** The wobble of the rings' edges (cells), a slow noise. */
const OUVERTURE = 0.8;
/**
 * FIN-CAR: the rings' frontiers fall on the 320 dp grid, and far from the island they follow the
 * plain distance, so a smooth wobble still leaves a straight run of cells. A per-cell jitter (a
 * hash, not a noise) moves a cell's distance by up to half this much either way, in cells, which
 * makes the cells near a frontier flip: a ragged strip of both rings, never a line.
 */
const GRAIN = 2.6;
/** Within this distance (cells) of the island a cell never reaches the densest ring, so no dense wood stands beside the glade. */
const RAMPE = 2;
/** The last ring below the densest one is under this (cells). */
const AVANT_DENSE = 2.29;

/**
 * How far into the forest a cell stands, in world cells: the distance to the island (`dmin`, dp),
 * eased by the cell's depth (`y`, the cell's centre: in front the wood stays open longer, behind it
 * thickens sooner) and wobbled by the noise `n` in [0, 1].
 */
export const eloignement = (dmin: number, y: number, n: number, grain = 0.5) => {
  const d = dmin + (grain - 0.5) * GRAIN * CELLULE;
  const e =
    (d - DEVANT * Math.min(1.5, Math.max(-1.5, (y - HAUTEUR / 2) / CELLULE))) / CELLULE +
    (n - 0.5) * OUVERTURE;
  // A cell next to a glade (whose own cells are within 1.96 cells of it, the distance being
  // 1-Lipschitz) stays under the densest ring.
  return dmin / CELLULE < RAMPE ? Math.min(e, AVANT_DENSE) : e;
};

/** The distance to the island and the clearing round it: the island of `visible`, else the finished one. */
function ilePour(visible?: readonly (readonly boolean[])[]) {
  return visible
    ? { dist: distCases(visible), clair: clairiere(visible) }
    : { dist: distIle, clair: CLAIRIERE };
}

/**
 * The world's cells over `zone`: forest tiles chosen by rings of density round the island (`anneau`), never the one just left or above of a cell, mirrored at random so twelve looks come
 * from six drawings; clearing tiles only near the island's rim, nothing under the island;
 * (the sea is gone: FIN-CAR).
 */
export function casesMonde(
  zone: Zone,
  graine: number,
  visible?: readonly (readonly boolean[])[],
): CaseMonde[] {
  const { dist, clair } = ilePour(visible);
  const c0 = Math.floor(zone.x0 / CELLULE);
  const c1 = Math.ceil(zone.x1 / CELLULE) - 1;
  const r0 = Math.floor(zone.y0 / CELLULE);
  const r1 = Math.ceil(zone.y1 / CELLULE) - 1;
  const choisi = new Map<string, Tuile>();
  const cases: CaseMonde[] = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const hasard = mulberry32(graine + c * 7919 + r * 104729);
      const miroir = hasard() < 0.5;
      const x = c * CELLULE;
      const y = r * CELLULE;
      // Nine points of the cell: the island's rim anywhere near it makes it a glade; inside, nothing.
      const pts = [0, 0.5, 1].flatMap((u) =>
        [0, 0.5, 1].map((v) => dist(x + u * CELLULE, y + v * CELLULE)),
      );
      if (pts.every((d) => d <= 0)) continue;
      // The glade is not a band of even width: it swells and narrows with a slow noise (never under CLAIRIERE).
      const pres = Math.min(...pts) < clair * (1 + 1.2 * bruit(c, r, 2, graine));
      const rang = pres
        ? -1
        : rangAnneau(
            eloignement(
              Math.min(...pts),
              y + CELLULE / 2,
              bruit(c, r, 3, graine),
              hachage(c, r, 9, graine),
            ),
          );
      const liste = rang < 0 ? (["clairiere"] as const) : (ANNEAUX[rang]?.[1] ?? ["dense"]);
      const gauche = choisi.get(`${c - 1},${r}`);
      const haut = choisi.get(`${c},${r - 1}`);
      const tuile =
        liste.find((t) => t !== gauche && t !== haut) ??
        liste.find((t) => t !== gauche) ??
        liste[0] ??
        "dense";
      choisi.set(`${c},${r}`, tuile);
      // L6-T20: nudged inside its margin so the glades do not line up.
      const [dx, dy] = [decale(hasard), decale(hasard)];
      const echelle = 0.8 + 0.2 * hasard();
      cases.push({ genre: "foret", tuile, x: x + dx, y: y + dy, miroir, echelle, rang });
    }
  }
  return cases;
}
