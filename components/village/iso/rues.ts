// The streets of the map (L6-T18), drawn by the app from the path cells of isoLayout.json: no longer a
// cell-wide diamond each, a band that wanders a little (every cell's node is nudged, every edge
// bows) and that changes rank with the distance to the square: beaten earth, then stones, then
// paving by the campfire. Each building gets a footpath from its door (the `porte` attach point of
// its painted stage) to the nearest street cell. Pure and static: every nudge is a hash of the
// cell, and the whole network is computed once, for the finished island. RuesDessinees.tsx draws.
// T22: a band is a filled outline (ruban.ts), no stroke and no ink: its half-width wavers a little
// from node to node and bulges or narrows mid-edge, and a round disc joins it at each node.

import { type BuildingCode, buildingCodes } from "@/db/schema";
import { COTE, ecranXY, HAUTEUR, LARGEUR, pose, spriteDe } from "./carteDemo";
import { accrochesDe } from "./feux";
import { type Case, emplacements, sol, TAILLE } from "./isoLayout";
import type { Stade } from "./isoSpec";
import type { Point } from "./ombres";
import { cheminRuban, disque, ruban } from "./ruban";
import { blob } from "./solOrganique";
import { hasard } from "./solVarie";

export type Classe = 0 | 1 | 2;
/** A band's width in cells, by rank (earth, stones, paving), and a footpath's. */
export const LARGEURS = [0.5, 0.72, 0.94] as const;
export const SENTIER = 0.34;

const GRAINE = 11;
const feu = emplacements.campfire.coin;
/** Chebyshev distance, in cells, to the campfire within which a street is paved, then stoned. */
const PAVE = 3;
const EMPIERRE = 7;

const estRue = (gx: number, gy: number) => sol[gy]?.[gx] === "chemin" || sol[gy]?.[gx] === "pont";

/** The rank of a street cell: it climbs as the cell nears the square. */
export const classeDe = ([gx, gy]: Case): Classe => {
  const d = Math.max(Math.abs(gx - feu[0]), Math.abs(gy - feu[1]));
  return d <= PAVE ? 2 : d <= EMPIERRE ? 1 : 0;
};

/** How far a long street sways off its line, in cells, and over how many cells it sways back. */
const MEANDRE = 0.2;
const PERIODE = 7;
/** The sway at `t` cells along a row or column, its phase a hash of the row or column. */
const meandre = (t: number, ligne: number, sel: number) =>
  MEANDRE * Math.sin((2 * Math.PI * t) / PERIODE + 2 * Math.PI * hasard(ligne, sel, 68, GRAINE));

/**
 * The street's node on a cell, in grid units: the centre, nudged by up to 0.12 cell (B2: a
 * footpath that wanders, not a ruled cross), and swayed by a slow wave along its row and its
 * column (FIN-DIS: the plan draws long straight streets, the map never shows more than four cells
 * of one in a line). Each cell has one node, so crossing streets still meet.
 */
export const noeud = ([gx, gy]: Case): Point => [
  gx + 0.5 + (hasard(gx, gy, 60, GRAINE) - 0.5) * 0.24 + meandre(gy, gx, 1),
  gy + 0.5 + (hasard(gx, gy, 61, GRAINE) - 0.5) * 0.24 + meandre(gx, gy, 2),
];
/** A band's half-width at a node: its rank's, 8 % wider or narrower by the node. */
const demiNoeud = ([gx, gy]: Case, largeur: number) =>
  (largeur / 2) * (0.92 + 0.16 * hasard(gx, gy, 65, GRAINE));

/**
 * A slightly bowed band from grid point `a` to `b`, half-width `ha` to `hb` and `ventre` more (or
 * less) mid-way, with a disc at each end: its outline.
 */
function bande(a: Point, b: Point, bombe: number, ha: number, hb: number, ventre: number) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const n = Math.hypot(dx, dy) || 1;
  const c: Point = [(a[0] + b[0]) / 2 - (dy / n) * bombe, (a[1] + b[1]) / 2 + (dx / n) * bombe];
  const ts = Array.from({ length: 9 }, (_, k) => k / 8);
  const pts = ts.map((t): Point => {
    const [u, v, w] = [(1 - t) ** 2, 2 * t * (1 - t), t * t];
    return [u * a[0] + v * c[0] + w * b[0], u * a[1] + v * c[1] + w * b[1]];
  });
  const contour = (plus: number) =>
    cheminRuban([
      ruban(
        pts,
        ts.map((t) => ha + (hb - ha) * t + ventre * 4 * t * (1 - t) + plus),
      ),
      disque(a, ha + plus),
      disque(b, hb + plus),
    ]);
  return { d: contour(0) };
}

/** `d` is the band's outline. */
export type Arete = { de: Case; vers: Case; classe: Classe; d: string };

/** Every street edge between two neighbouring street cells (towards +gx or +gy), once; `camp` draws them all at rank 0's width. */
const aretes = (camp: boolean): readonly Arete[] =>
  Array.from(
    { length: TAILLE * TAILLE },
    (_, i) => [i % TAILLE, Math.floor(i / TAILLE)] as const,
  ).flatMap(([gx, gy]) =>
    estRue(gx, gy)
      ? (
          [
            [1, 0],
            [0, 1],
          ] as const
        ).flatMap(([dx, dy]): Arete[] => {
          if (!estRue(gx + dx, gy + dy)) return [];
          const de: Case = [gx, gy];
          const vers: Case = [gx + dx, gy + dy];
          const bombe = (hasard(gx, gy, 62 + dx, GRAINE) - 0.5) * 0.7;
          const classe = (camp ? 0 : Math.max(classeDe(de), classeDe(vers))) as Classe;
          const l = LARGEURS[classe];
          const ventre = (hasard(gx, gy, 66 + dx, GRAINE) - 0.5) * 0.12 * l;
          return [
            {
              de,
              vers,
              classe,
              ...bande(noeud(de), noeud(vers), bombe, demiNoeud(de, l), demiNoeud(vers, l), ventre),
            },
          ];
        })
      : [],
  );

export const ARETES = aretes(false);
/** H1-06: the camp's streets, narrow earth paths (all rank 0, LARGEURS[0]); the wider ranks wait for the island to grow. */
export const ARETES_CAMP = aretes(true);

export type Sentier = {
  code: BuildingCode;
  porte: Point;
  fin: Case;
  d: string;
};

/** Where a stage's door stands on the ground, in grid units: its sprite point, taken at ground level. */
export function porteSol(code: BuildingCode): Point | null {
  for (const stade of ["solid", "grand", "rough"] as const satisfies readonly Stade[]) {
    const s = spriteDe(code, stade);
    const porte = accrochesDe(code, stade)?.porte;
    if (!s || !porte) continue;
    const corps = pose(code, s);
    const k = corps.w / s.size[0];
    const x = corps.x + porte[0] * k;
    const y = corps.y + porte[1] * k;
    const somme = (4 * y) / COTE;
    const diff = (2 * (x - LARGEUR / 2)) / COTE;
    return [(somme + diff) / 2, (somme - diff) / 2];
  }
  return null;
}

/** The point of the footprint closest to `p`: a door is on the building's edge, never beyond it. */
function surEmprise(code: BuildingCode, p: Point): Point {
  const [x, y] = emplacements[code].coin;
  const [w, d] = emplacements[code].emprise;
  return [Math.min(x + w, Math.max(x, p[0])), Math.min(y + d, Math.max(y, p[1]))];
}

const RUES: readonly Case[] = Array.from(
  { length: TAILLE * TAILLE },
  (_, i): Case => [i % TAILLE, Math.floor(i / TAILLE)],
).filter(([gx, gy]) => estRue(gx, gy));

/**
 * One footpath per building (the campfire, which stands on the crossing, has none): from its door,
 * or from the middle of its front edge when its stage has no door, to the nearest street node.
 */
export const SENTIERS: readonly Sentier[] = buildingCodes.flatMap((code): Sentier[] => {
  if (code === "campfire") return [];
  const { coin, emprise } = emplacements[code];
  const devant: Point = [coin[0] + emprise[0], coin[1] + emprise[1] / 2];
  const porte = surEmprise(code, porteSol(code) ?? devant);
  const proche = RUES.map((c) => ({
    c,
    d: Math.hypot(...[0, 1].map((k) => (noeud(c)[k] ?? 0) - (porte[k] ?? 0))),
  })).sort((a, b) => a.d - b.d)[0];
  if (!proche) return [];
  const bombe = (hasard(coin[0], coin[1], 64, GRAINE) - 0.5) * 0.3;
  const h = SENTIER / 2;
  return [{ code, porte, fin: proche.c, ...bande(porte, noeud(proche.c), bombe, h, h, 0) }];
});

/** The paved square round the campfire, a blob wider than a cell. No soft edge (AUDIT-DA 6: its faint flat copy read as a pale ring with a hard rim). */
export const PLACE: string = blob(feu[0], feu[1], 1.5, 9, GRAINE, 8);
export const CASE_PLACE: Case = feu;

/** The four neighbours of a cell, the ways a street runs. */
const VOISINS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Where a street stops short on the island (audit T43 round 1: the tier-1 cross ended in the void):
 * every shown street cell whose street carries on over a cell the island does not show yet gets a
 * stone on that side, so the arm ends on something. Pure; a growing island moves or drops them.
 */
export function bornesDeRue(montre: (gx: number, gy: number) => boolean): readonly Point[] {
  return RUES.flatMap(([gx, gy]) =>
    montre(gx, gy)
      ? VOISINS.filter(([dx, dy]) => estRue(gx + dx, gy + dy) && !montre(gx + dx, gy + dy)).map(
          ([dx, dy]): Point => {
            const [nx, ny] = noeud([gx, gy]);
            return [nx + dx * 0.3, ny + dy * 0.3];
          },
        )
      : [],
  );
}

/** A stone's outline (screen `d`) on grid point `p`: a squat seven-sided pebble, a quarter cell wide, never twice the same. */
export function bornePath(p: Point): string {
  const pts = Array.from({ length: 7 }, (_, i): Point => {
    const a = (2 * Math.PI * i) / 7;
    const r = 0.13 * (0.8 + 0.4 * hasard(Math.floor(p[0]), Math.floor(p[1]), 67 + i, GRAINE));
    return [p[0] + r * Math.cos(a), p[1] + r * Math.sin(a)];
  });
  return cheminRuban([pts]);
}

/** A road leaving the village (FIN-CAR): from a street's last cell on the island's edge, out into the world. */
export type Sortie = {
  /** The street cell it leaves from: it shows once that cell does. */
  fin: Case;
  /** The branches, grid points from the cell's node outward: the road, then the track it forks into. */
  branches: readonly (readonly Point[])[];
  d: string;
};

/** How far a road reaches off the island, in cells, and where it forks. */
const PORTEE_SORTIE = 8;
const FOURCHE = 3.5;
/** A road stops where it would leave the map's box (the ground tiles cover no more): screen dp. */
const MARGE_CARTE = 20;
const dansCarte = ([gx, gy]: Point) => {
  const [x, y] = ecranXY([gx, gy]);
  return (
    x > MARGE_CARTE && x < LARGEUR - MARGE_CARTE && y > MARGE_CARTE && y < HAUTEUR - MARGE_CARTE
  );
};

/**
 * A wandering line from `depart` heading `(dx, dy)` (a unit axis of the grid) for `n` steps of 0.8
 * cell: the heading bends slowly by a hash of `sel`, so no two exits run alike. Stops at the map's edge.
 */
function serpente(depart: Point, [dx, dy]: Point, derive: number, sel: number, n: number): Point[] {
  const pts: Point[] = [depart];
  let [x, y] = depart;
  for (let k = 1; k <= n; k++) {
    const biais = derive + (hasard(sel, k, 70, GRAINE) - 0.5) * 0.5;
    // The lateral drift is along the other axis, so the line meanders around its heading.
    x += 0.8 * (dx + (dy === 0 ? 0 : biais));
    y += 0.8 * (dy + (dx === 0 ? 0 : biais));
    if (!dansCarte([x, y])) break;
    pts.push([x, y]);
  }
  return pts;
}

/** Where the roads leave the plan (FIN-DIS): the grand-route's two ends and the south gate's road. */
const BOUTS: readonly Case[] = [
  [0, 10],
  [TAILLE - 1, 10],
  [12, TAILLE - 1],
];

/**
 * The village's roads go on beyond the island: each runs 8 cells out from its end, meandering,
 * and forks at 3.5 cells into a second track. Every point is a hash of the end: the same roads on
 * every visit.
 */
export const SORTIES: readonly Sortie[] = BOUTS.filter(([gx, gy]) => estRue(gx, gy)).map(
  ([gx, gy]): Sortie => {
    // Outward: across the west or the east edge, else across the south one.
    const cap: Point = gx === 0 ? [-1, 0] : gx === TAILLE - 1 ? [1, 0] : [0, 1];
    const depart = noeud([gx, gy]);
    const route = serpente(
      depart,
      cap,
      (hasard(gx, gy, 71, GRAINE) - 0.5) * 0.3,
      gx + gy + 1,
      PORTEE_SORTIE / 0.8,
    );
    const iF = Math.min(route.length - 1, Math.round(FOURCHE / 0.8));
    const origine = route[iF] ?? depart;
    const cote = hasard(gx, gy, 72, GRAINE) < 0.5 ? -1 : 1;
    const voie = serpente(origine, cap, cote * 0.55, gx + gy + 5, (PORTEE_SORTIE - FOURCHE) / 0.8);
    const branches = [route, voie];
    const d = cheminRuban(
      branches.flatMap((b, i) => {
        // Narrower as it leaves, to a thread at the far end, and the second track thinner still.
        const demi = b.map(
          (_, k) =>
            ((i === 0 ? LARGEURS[0] : SENTIER) / 2) * (1 - 0.65 * (k / Math.max(1, b.length - 1))),
        );
        return [ruban(b, demi), disque(b[0] ?? depart, demi[0] ?? 0.1)];
      }),
    );
    return { fin: [gx, gy], branches, d };
  },
);
