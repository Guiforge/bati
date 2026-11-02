// The painted surroundings (docs/designs/village-surroundings, stage 5), the pure side: which layer
// is on, where the painted terrain lies, where the forest masses and the props stand. Every layer
// is behind its own flag (constants/isoPoc.ts ALENTOURS, off until judged; app/dev-iso.tsx turns
// them on with `?peint=sol,foret,decor,animaux` or `?peint=tout`). Alentours.tsx draws them.
//
// The images come from stage-5/assets.py, one canvas size per family (the image-size ratchet of
// __tests__/iso-perf-compteur.test.tsx counts view sizes): TOILE_* below are its numbers in dp.
// Everything is a function of the island and a hash: the same land on every launch.

import { createContext } from "react";
import { ALENTOURS, type Alentours, COUCHES_ALENTOURS } from "@/constants/isoPoc";
import type { BuildingCode } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import { COTE, ecranXY, etatCarte, LARGEUR } from "./carteDemo";
import { EAU_GX, PARCELLES } from "./champs";
import type { Case } from "./isoLayout";
import { clairiere, distCases, mulberry32 } from "./monde";
import type { Point } from "./ombres";
import type { Emprise } from "./profondeur";
import { SORTIES } from "./rues";
import { BANDES_TERRAIN } from "./solBandes";
import { FONDU_TERRAIN, TERRAIN } from "./terrain";

export type { Alentours };
export { FONDU_TERRAIN, TERRAIN };

/** The layers on in this tree: the shipped flags, or what dev-iso's link asks for. */
export const AlentoursContext = createContext<Alentours>(ALENTOURS);

/** The layers a `?peint=` link names (`tout` for all); absent, the shipped flags. */
export function alentoursDe(p: string | undefined): Alentours {
  if (p === undefined) return ALENTOURS;
  const noms = p.split(",");
  return Object.fromEntries(
    COUCHES_ALENTOURS.map((c) => [c, noms.includes("tout") || noms.includes(c)]),
  ) as Alentours;
}

/** Whether the opening frame is the tight one (carteDemo.ts `cadrage`): the painted ground and forest both on. */
export const cadreSerre = (a: Alentours): boolean => a.sol && a.foret;

// --- Ground --------------------------------------------------------------------------------------

/** The terrain is cut in a grid of tiles of one size (1656 x 1614 px), so no image passes a GPU texture's 2048. */
export const TUILES_TERRAIN = { colonnes: 3, rangees: 4 } as const;
/** One terrain tile, dp. */
export const TUILE_TERRAIN = {
  w: TERRAIN.w / TUILES_TERRAIN.colonnes,
  h: TERRAIN.h / TUILES_TERRAIN.rangees,
} as const;

/** The ground's tier bands (scripts/iso/cuire_sol.py): a baked chunk exists per band, each one adding to the band below. */
const BANDES_SOL = ["t1-3", "t4-6", "t7-9", "t10-12"] as const;

/** The bands a tier may draw, the highest first: its own, then each one below (a chunk with no variant in a band keeps the band under it). */
export const bandesJusqua = (palier: number): readonly string[] =>
  BANDES_SOL.slice(0, Math.min(BANDES_SOL.length, Math.max(1, Math.ceil(palier / 3)))).toReversed();

/**
 * A terrain tile's pair of images at a tier: the highest band's variant it has at or under the tier
 * (a stamp's road or field baked into the chunk, solBandes.ts), else the plain ground. Bands only
 * add, so a tier never draws less than the one before it.
 */
export function tuileTerre(
  { r, c, jour, nuit }: { r: number; c: number; jour: number; nuit: number },
  palier: number,
): { jour: number; nuit: number } {
  for (const b of bandesJusqua(palier)) {
    const v = BANDES_TERRAIN[`${r}${c}.${b}`];
    if (v) return v;
  }
  return { jour, nuit };
}

/** An `evenodd` path: the box `r` (with a margin) less the painted terrain, where the vector ground still shows. */
export function horsTerrain(r: { x: number; y: number; w: number; h: number }): string {
  const m = FONDU_TERRAIN;
  const [x0, y0] = [TERRAIN.x + m, TERRAIN.y + m];
  const [w, h] = [TERRAIN.w - 2 * m, TERRAIN.h - 2 * m];
  return (
    `M${r.x - 20} ${r.y - 20}h${r.w + 40}v${r.h + 40}h${-(r.w + 40)}Z` +
    `M${x0} ${y0}h${w}v${h}h${-w}Z`
  );
}

// --- Forest --------------------------------------------------------------------------------------

/** A forest mass's canvas (448 x 384 px), dp: the mass fills its width, its foot on the bottom edge. */
export const TOILE_FORET = { w: 168, h: 144 } as const;
export const MASSES = ["feuillus", "melangee", "bouleaux", "dense"] as const;
export const BORDURES = ["bord_coniferes", "bord_crete"] as const;
export type NomForet = (typeof MASSES)[number] | (typeof BORDURES)[number];

export type Masse = {
  nom: NomForet;
  /** The foot (the canvas' bottom centre), map dp. */
  x: number;
  y: number;
  /** About the foot. The ring and the border: 0.65, 0.9 or 1.2 by distance from the village (small toward it); 1.1, 1.3 or 1.5 on the south lisiere. */
  echelle: number;
  /** Mirrored in turn: every mass, so neighbours of one asset never stand alike. */
  flip: boolean;
  /** The undergrowth strip laid over its feet (foret/sousbois_{sb + 1}), on the south and north edges only. */
  sb?: 0 | 1 | 2;
};

/** The ring's lattice step, dp (the island's 2:1 diamond), how far past the clearing it starts and how far from the island it stops. */
const PAS_ANNEAU = [128, 56] as const;
const RECUL_ANNEAU = 24;
const PORTEE_ANNEAU = 460;
/** The share of the ring's patches that are wooded (Guillaume, 01/11: groups with dark gaps between). */
const PART_BOISEE = 0.68;
/** How far a mass keeps from a road leaving the village and from the river, grid cells. */
const DEGAGE_ROUTE = 0.9;

/** A map point in grid coordinates (the inverse of `ecranXY`). */
const grille = (x: number, y: number): [number, number] => {
  const u = ((x - LARGEUR / 2) * 2) / COTE;
  const v = (y * 4) / COTE;
  return [(u + v) / 2, (v - u) / 2];
};

/** The south corner's plots as `libre` rects: corner and size, cells. */
const PARCELLES_RECTS = Object.values(PARCELLES).map(
  ([a, b, c, d]) => [a, b, c - a, d - b] as const,
);

/** The roads leaving the village, sampled every 0.3 cell, every one of them whether it shows yet or not. */
const ROUTES: readonly (readonly [number, number])[] = SORTIES.flatMap((s) =>
  s.branches.flatMap((b) =>
    b.slice(1).flatMap((p, i) => {
      const q = b[i] ?? p;
      const n = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / 0.3));
      return Array.from(
        { length: n },
        (_, k) => [q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n] as const,
      );
    }),
  ),
);

/**
 * The forest's glades (loupe BC r4): ground shows in a ring of about 4 cells, irregular, fixed in the
 * world (the same at every tier). Centres in grid cells: the north mass near screen px (620, 520) at
 * p06, the south-west one and the south-east one a little inside the painted ground's edge (36.8),
 * so the glade never opens onto the grey. `r` is the mean radius in cells.
 */
const CLAIRIERES = [
  { gx: -8.9, gy: -12.1, r: 1.9, a: 0.7, b: 2.4 },
  { gx: 25.7, gy: 34.6, r: 1.6, a: 2.1, b: 0.5 },
  { gx: 34.6, gy: 26.8, r: 1.6, a: 4.0, b: 1.3 },
] as const;
/** Whether grid point (gx, gy) lies in a glade: a radius that swells and shrinks with the angle. */
export const dansClairiere = (gx: number, gy: number): boolean =>
  CLAIRIERES.some((c) => {
    const t = Math.atan2(gy - c.gy, gx - c.gx);
    return (
      Math.hypot(gx - c.gx, gy - c.gy) <
      c.r * (1 + 0.16 * Math.sin(2 * t + c.a) + 0.1 * Math.sin(3 * t + c.b))
    );
  });

/**
 * Whether a mass of `largeur` x `hauteur` dp standing on (x, y) keeps clear of everything the
 * village draws on the ground: its foot and crown never on the island and its clearing, a field, a
 * road leaving the village or the river. The forest lies under the sprites, so a crown over the
 * island would show the paths drawn across it.
 */
function libre(
  dist: (x: number, y: number) => number,
  clair: number,
  champs: readonly (readonly [number, number, number, number])[],
  x: number,
  y: number,
  largeur: number,
  hauteur: number,
): boolean {
  if (
    POINTS_DEGAGES.some(
      ([px, py]) => Math.abs(px - x) < largeur / 2 && py > y - hauteur && py < y + 4,
    )
  )
    return false;
  // Its crown's middle too: a big mass must not stand over a glade between its samples.
  const coeur = [-0.2, 0, 0.2].map((d): [number, number] => [x + d * largeur, y - hauteur * 0.45]);
  if ([[x, y] as const, ...coeur].some(([px, py]) => dansClairiere(...grille(px, py))))
    return false;
  const points = [
    [x, y],
    [x - largeur * 0.42, y - hauteur * 0.2],
    [x + largeur * 0.42, y - hauteur * 0.2],
    [x - largeur * 0.32, y - hauteur * 0.65],
    [x + largeur * 0.32, y - hauteur * 0.65],
    [x, y - hauteur * 0.9],
  ] as const;
  return points.every(([px, py]) => {
    if (dist(px, py) < clair) return false;
    const [gx, gy] = grille(px, py);
    if (gx > EAU_GX[0] && gx < EAU_GX[1]) return false;
    if (dansClairiere(gx, gy)) return false;
    if (
      champs.some(
        ([cx, cy, w, h]) =>
          gx > cx - 0.3 && gx < cx + w + 0.3 && gy > cy - 0.3 && gy < cy + h + 0.3,
      )
    )
      return false;
    return ROUTES.every(([rx, ry]) => Math.hypot(gx - rx, gy - ry) >= DEGAGE_ROUTE);
  });
}

/** The two cottages the painted ground carries beside the plots, and the field block it paves over: corner and size, cells. */
const COTTAGES_RECTS = [
  [25.5, 21, 2.5, 2.5],
  [20.5, 26.5, 3, 2.5],
  [18, 16, 3, 2],
] as const;

/** The south road's line, grid points. */
export const ROUTE_SUD: readonly Point[] = SORTIES.find((s) => s.fin[0] === 12)?.branches[0] ?? [];
/** The south road's cells, from the gate street's end to the last one: a copy of the frozen list in docs/designs/village-loop/loupes/bc/route_tuiles.json (a test holds them equal). */
export const TUILES_ROUTE_SUD: readonly Point[] = [
  [12, 19],
  [12, 20],
  [13, 20],
  [14, 20],
  [15, 20],
  [15, 21],
  [16, 21],
  [17, 21],
  [18, 21],
  [19, 21],
  [20, 21],
  [21, 21],
  [22, 22],
  [22, 23],
  [23, 23],
  [23, 24],
  [24, 25],
  [25, 25],
  [26, 25],
  [27, 26],
  [27, 27],
  [27, 28],
  [28, 28],
  [28, 29],
  [29, 30],
  [30, 30],
  [30, 31],
  [31, 31],
  [32, 31],
  [33, 32],
  [33, 33],
  [34, 33],
  [34, 34],
  [35, 34],
  [35, 35],
  [36, 36],
  [37, 36],
  [37, 37],
  [38, 37],
  [39, 38],
  [39, 39],
  [39, 40],
  [40, 40],
  [40, 41],
  [40, 42],
  [41, 43],
  [42, 43],
  [43, 43],
  [44, 44],
];

/**
 * Map points no mass box may cover: the south road's cells (centre, four inner points and the
 * middle of each step), its line, and a 1 cell lattice over each plot and cottage. A mass' box is
 * its whole canvas on its foot (168 x 144 dp times its scale), so neither foot nor crown reaches them.
 * Every cell and every sample of the line, to the bottom of the screen: the road leaves the frame
 * (round 4), so no mass box, border masses included, crosses the corridor. `libre`'s crown samples
 * keep 0.9 cell off the road line as well.
 */
export const POINTS_DEGAGES: readonly (readonly [number, number])[] = [
  ...ROUTE_SUD.map((p) => ecranXY(p)),
  ...TUILES_ROUTE_SUD.flatMap(([gx, gy], k): (readonly [number, number])[] => {
    const [x, y] = ecranXY([gx + 0.5, gy + 0.5]);
    const n = TUILES_ROUTE_SUD[k + 1];
    const mid = n ? ecranXY([(gx + n[0]) / 2 + 0.5, (gy + n[1]) / 2 + 0.5]) : null;
    return [[x, y], [x - 14, y], [x + 14, y], [x, y - 7], [x, y + 7], ...(mid ? [mid] : [])];
  }),
  ...[...PARCELLES_RECTS, ...COTTAGES_RECTS].flatMap(([a, b, w, h]) => {
    const [nx, ny] = [Math.ceil(w) + 1, Math.ceil(h) + 1];
    return Array.from({ length: nx * ny }, (_, k) =>
      ecranXY([
        a - 0.2 + ((w + 0.4) * (k % nx)) / (nx - 1),
        b - 0.2 + ((h + 0.4) * Math.floor(k / nx)) / (ny - 1),
      ]),
    );
  }),
];

/** The south lisiere, computed once: it is the same at every tier (the island is far from it), so the walk is paid once. */
let LISIERE_SUD: Masse[] | null = null;
const lisiereFigee = (ok: OkMasse): Masse[] => {
  LISIERE_SUD ??= lisiereSud(ok);
  return LISIERE_SUD;
};
// By content, not identity: etatCarte and etatAvec hand back a new `visible` on every call, and the walk costs hundreds of ms.
// shortcut: never evicted, the islands a session sees are few (a tier and what stands on it); bound it if that stops being true.
const CACHE_FORET = new Map<string, Masse[]>();
const cleForet = (
  visible: readonly (readonly boolean[])[],
  champs: readonly (readonly [number, number, number, number])[],
) => `${visible.map((l) => l.map((v) => (v ? 1 : 0)).join("")).join("|")}/${champs.join("|")}`;

/**
 * The forest round the island of `visible`: a jittered lattice of wooded patches round it,
 * each mass standing past the clearing (monde.ts `clairiere`, which widens with the island: the edge
 * backs off, never comes forward), and the border along the painted terrain's edge, which closes
 * the map, gapped in front so the bottom of the screen is never one carpet. Light kinds near the
 * glade, dense ones deeper; no two neighbours alike; back to front.
 */
export function massesForet(
  visible: readonly (readonly boolean[])[],
  champs: readonly (readonly [number, number, number, number])[] = [],
): Masse[] {
  const cle = cleForet(visible, champs);
  const deja = CACHE_FORET.get(cle);
  if (deja) return deja;
  const dist = distCases(visible);
  const clair = clairiere(visible);
  // The painted ground carries the south corner's two plots: no mass on them, whatever the tier.
  const exclus = [...champs, ...PARCELLES_RECTS, ...COTTAGES_RECTS];
  const ok = (x: number, y: number, e: number) =>
    libre(dist, clair, exclus, x, y, TOILE_FORET.w * e, TOILE_FORET.h * e);
  // The south lisiere owns the land past the painted ground's edge: the ring leaves it alone.
  const horsLisiere = (x: number, y: number, e: number) =>
    !dansLisiere(...grille(x, y), DEBUT_ANNEAU) && ok(x, y, e);
  const out = [...anneau(dist, clair, horsLisiere), ...bordure(ok), ...lisiereFigee(ok)].sort(
    (a, b) => a.y - b.y,
  );
  CACHE_FORET.set(cle, out);
  return out;
}

/**
 * The south lisiere (loupe BC). The painted ground is the square gx, gy under 36.8, its tip the
 * south road's end; past its two south edges the baked terrain is grey noise, which the forest hides.
 * Whole masses only, never cut: a lattice of feet over everything past the edge (to 50 cells), three
 * size classes by depth (1.1 near the village, 1.3, 1.5 at the map's edge: nearer the viewer than the north's 0.65, 0.9, 1.2), four species in a cycle
 * that keeps every repeat 6 cells or more apart, mirrored by the parity of the column (with the strip index, no neighbour of the eight wears the same pair). No `bord_*` border sprite here: they show their slab inside a forest, they belong to
 * the map's true edge (`bordure`). No mass covers a cell of the south road (`POINTS_DEGAGES`), so
 * the road runs clear to its last cell. A function of the terrain only, not of the tier: the same
 * masses at every tier (the ring leaves this land to it), so nothing appears late or goes.
 */
const LISIERE_DEBUT = 35.2;
/** The ring stops here (a 2 cell strip of meadow between it and the lisiere). */
const DEBUT_ANNEAU = 33;
const PAS_LISIERE = 3.6;
const FOND_LISIERE = 50;
const ESPECES_LISIERE: readonly NomForet[] = ["bouleaux", "feuillus", "dense", "melangee"];
/** The size class of a foot: depth sets the trend (small near the village), a hash of the foot mixes it, so neither a row nor the gx = gy mirror repeats a size. */
const classeLisiere = (gx: number, gy: number) => {
  const alea = mulberry32(Math.round(gx * 8) * 104729 + Math.round(gy * 8) * 7919 + 5)();
  const somme = gx + gy + (alea - 0.5) * 16;
  return somme < 74 ? 1.1 : somme < 88 ? 1.3 : 1.5;
};
const dansLisiere = (gx: number, gy: number, debut = LISIERE_DEBUT) => gx > debut || gy > debut;
/** The undergrowth strip a lattice index picks: three in turn, so a neighbour never wears the same. */
const SOUSBOIS = [0, 1, 2] as const;
const sbDe = (n: number) => SOUSBOIS[((Math.round(n) % 3) + 3) % 3] ?? 0;

type OkMasse = (x: number, y: number, echelle: number) => boolean;

/** Whether a map point lies under a mass's crown (an ellipse over its canvas). */
const sousCouronne = (x: number, y: number, m: Masse) => {
  const [w, h] = [TOILE_FORET.w * m.echelle, TOILE_FORET.h * m.echelle];
  return ((x - m.x) / (0.45 * w)) ** 2 + ((y - (m.y - 0.5 * h)) / (0.45 * h)) ** 2 < 1;
};

/** The first species with no twin within 6 cells of (fx, fy), else within 3 (a hole is worse than a distant twin). */
function especeLibre(tous: readonly Masse[], fx: number, fy: number): NomForet | undefined {
  const loin = (n: NomForet, d: number) =>
    tous.every((m) => {
      const [mx, my] = grille(m.x, m.y);
      return m.nom !== n || Math.max(Math.abs(mx - fx), Math.abs(my - fy)) >= d;
    });
  return ESPECES_LISIERE.find((n) => loin(n, 6)) ?? ESPECES_LISIERE.find((n) => loin(n, 3));
}

/** The first undergrowth strip that no mass within 4.5 cells wears with the same mirror. */
function sbLibre(tous: readonly Masse[], fx: number, fy: number, flip: boolean): 0 | 1 | 2 {
  const pris = tous
    .filter((m) => m.flip === flip && m.sb !== undefined)
    .filter((m) => {
      const [mx, my] = grille(m.x, m.y);
      return Math.max(Math.abs(mx - fx), Math.abs(my - fy)) < 4.5;
    })
    .map((m) => m.sb);
  return SOUSBOIS.find((n) => !pris.includes(n)) ?? 0;
}

/**
 * Fills what the lattice left bare past the painted ground's edge: every point of a 1.5 cell
 * lattice under no crown gets a mass centred on it, of the first species with no twin within 6 cells
 * (3 when none is free: a hole is worse than a distant twin).
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one lattice walk, each point a short list of steps
function combler(ok: OkMasse, deja: readonly Masse[]): Masse[] {
  const tous = [...deja];
  const ajouts: Masse[] = [];
  for (let gy = 36; gy <= FOND_LISIERE; gy += 1.5) {
    for (let gx = 14; gx <= FOND_LISIERE; gx += 1.5) {
      if ((gx <= LISIERE_DEBUT && gy <= LISIERE_DEBUT) || Math.abs(gx - gy) > 20) continue;
      const [px, py] = ecranXY([gx, gy]);
      if (tous.some((m) => sousCouronne(px, py, m))) continue;
      const echelle = classeLisiere(gx, gy);
      // The foot goes further down, then aside, while the box would cover a cell of the road (the road's tip).
      const { w, h } = TOILE_FORET;
      const pieds = [0, -0.3, 0.3].flatMap((d) =>
        [0.5, 0.75, 1].map((k): [number, number] => [px + d * w * echelle, py + k * h * echelle]),
      );
      const pied = pieds.find(([cx, cy]) => ok(cx, cy, echelle));
      if (!pied) continue;
      const [x, y] = pied;
      const [fx, fy] = grille(x, y);
      const nom = especeLibre(tous, fx, fy);
      if (!nom) continue;
      const m: Masse = {
        nom,
        x,
        y,
        echelle,
        flip: tous.length % 2 === 1,
        sb: sbLibre(tous, fx, fy, tous.length % 2 === 1),
      };
      tous.push(m);
      ajouts.push(m);
    }
  }
  return ajouts;
}

/**
 * The last pass, in screen space (loupe BC r3): the holes `combler` leaves, which lie beside the
 * road's tip where a lattice foot's box would cover its cells. For each point of a 12 dp lattice
 * past the painted edge that no crown covers, the first foot (down, then aside) whose mass covers
 * it and keeps off the road gets that mass.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one lattice walk, each point a short list of steps
function boucher(ok: OkMasse, deja: readonly Masse[]): Masse[] {
  const tous = [...deja];
  const ajouts: Masse[] = [];
  for (let y = 720; y <= 1060; y += 12)
    for (let x = 120; x <= 880; x += 12) {
      const [gx, gy] = grille(x, y);
      if ((gx <= 36.8 && gy <= 36.8) || Math.abs(gx - gy) > 20) continue;
      if (tous.some((m) => sousCouronne(x, y, m))) continue;
      // Feet by increasing displacement: down, then aside, its class's size then the smallest.
      const pieds = [20, 40, 60, 80, 100, 130].flatMap((dy) =>
        [0, -20, 20, -40, 40, -60, 60, -80, 80].map((dx): [number, number] => [x + dx, y + dy]),
      );
      const essais = pieds.flatMap(([fx, fy]) => {
        const [gfx, gfy] = grille(fx, fy);
        return [classeLisiere(gfx, gfy), 1.1].map((echelle): [number, number, number] => [
          fx,
          fy,
          echelle,
        ]);
      });
      for (const [fx, fy, echelle] of essais) {
        const [gfx, gfy] = grille(fx, fy);
        const nom = especeLibre(tous, gfx, gfy);
        if (!nom || !ok(fx, fy, echelle)) continue;
        const m: Masse = {
          nom,
          x: fx,
          y: fy,
          echelle,
          flip: tous.length % 2 === 1,
          sb: sbLibre(tous, gfx, gfy, tous.length % 2 === 1),
        };
        if (!sousCouronne(x, y, m)) continue;
        tous.push(m);
        ajouts.push(m);
        break;
      }
    }
  return ajouts;
}

function lisiereSud(ok: OkMasse): Masse[] {
  const out: Masse[] = [];
  const n = Math.floor((FOND_LISIERE - 14) / PAS_LISIERE) + 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const hasard = mulberry32(90001 + j * 104729 + i * 7919);
      const gx = 14 + (i + (hasard() - 0.5) * 0.5) * PAS_LISIERE;
      const gy = 14 + (j + (hasard() - 0.5) * 0.5) * PAS_LISIERE;
      if (!dansLisiere(gx, gy) || Math.abs(gx - gy) > 20) continue;
      const nom = ESPECES_LISIERE[(i + 2 * j) % ESPECES_LISIERE.length] ?? "melangee";
      const [x, y] = ecranXY([gx, gy]);
      const echelle = classeLisiere(gx, gy);
      if (ok(x, y, echelle))
        out.push({ nom, x, y, echelle, flip: i % 2 === 1, sb: sbDe(i + 2 * j) });
    }
  }
  const rempli = [...out, ...combler(ok, out)];
  return varierSousBois([...rempli, ...boucher(ok, rempli)]);
}

/**
 * Back to front over the whole lisiere: the first (undergrowth strip, mirror) pair, the mass's own
 * mirror first, that no mass within 3 cells wears (the lattice, `combler` and `boucher` each pick
 * theirs blind to the others, and the near forest's big masses crowd more than three neighbours).
 */
function varierSousBois(masses: readonly Masse[]): Masse[] {
  const out: Masse[] = [];
  for (const m of masses) {
    const voisins = out.filter((o) => pres(o, m, 3.01));
    const libre = [m.flip, !m.flip].flatMap((flip) =>
      SOUSBOIS.filter((n) => !voisins.some((o) => o.flip === flip && o.sb === n)).map(
        (n): Masse => ({ ...m, flip, sb: n }),
      ),
    );
    out.push(libre[0] ?? m);
  }
  return out;
}

/**
 * The ring: a jittered lattice over the painted terrain, kept where it stands past the clearing and
 * within `PORTEE_ANNEAU` of the island (a screen at the zoom floor never shows further). A coarse
 * noise switches whole patches on or off, so the woods come in groups with dark gaps between them
 * and never one carpet.
 *
 * Everything but the filter is a function of the lattice cell alone, never of the tier or of the
 * neighbour kept: the size class (0.7, 1, 1.3, by distance from the village's middle, small toward
 * it), the species (a 3 colouring of the hex lattice, so the six neighbours of a mass are other
 * species, the light kind near the village and the dense one far), the mirror (by parity) and the
 * undergrowth. A mass therefore never changes between tiers; only the clearing's edge backs off.
 */
type Graine = Masse & { i: number; j: number; garde: number };
let GRAINES_ANNEAU: readonly Graine[] | null = null;
/** The village's middle, cells, and the distances that cut the size classes (Chebyshev). */
const CENTRE_VILLAGE = 10;
// North classes (loupe BC r4): the largest stays at 1.2, the ratio of the largest to the smallest 1.85.
const CLASSES_ANNEAU = [0.65, 0.9, 1.2] as const;
const COUPURES_ANNEAU = [14, 20] as const;
const modulo = (n: number, m: number) => ((n % m) + m) % m;

/** The species of a lattice cell: a 3 colouring (q - r) mod 3, the third colour dense far from the village on half its cells, else mixed. */
function especeAnneau(q: number, j: number, classe: number): NomForet {
  const teinte = modulo(q - j, 3);
  if (teinte === 0) return "feuillus";
  if (teinte === 1) return "bouleaux";
  return classe > 0 && modulo(Math.floor(q / 2) + Math.floor(j / 2), 2) === 1
    ? "dense"
    : "melangee";
}

/**
 * A patch with at most three wooded neighbours on the lattice at tier 6 stands (almost) alone on the
 * meadow, and the eye reads two of them as twins when they share an asset: in one viewport (720 x 1600 dp)
 * they never wear the same asset (the first species no neighbour and no other such patch nearby
 * has, else the one fewest have), never the same size (the class fewest of them wear, the lattice's
 * own when it is free), and a twin never stands within 6 cells (the later one is moved off
 * along the larger axis). Loupe BC r3 asked for the assets, r4 for the sizes and the distance after
 * two of the r3 pair, one asset mirrored, showed up top left. Static: the lattice alone decides, so
 * a mass never changes between tiers.
 */
function isolesDistincts(graines: readonly Graine[]): readonly Graine[] {
  // What stands at tier 6 (the screen the loupe judges) decides who is alone: a patch whose
  // neighbours the clearing pushes back is alone on the meadow, and keeps what it is given at every tier.
  const { visible } = etatCarte(6, false);
  const [dist, clair] = [distCases(visible), clairiere(visible)];
  const vivantes = graines.filter(
    (g) => boisee(g.i, g.j) && g.garde <= 0.85 && dist(g.x, g.y) >= clair + RECUL_ANNEAU,
  );
  const voisins = (g: Graine) =>
    vivantes.filter(
      (v) => v !== g && ((v.x - g.x) / PAS_ANNEAU[0]) ** 2 + ((v.y - g.y) / PAS_ANNEAU[1]) ** 2 < 3,
    );
  const choisis = new Map<Graine, Graine>();
  for (const g of vivantes.filter((v) => voisins(v).length <= 3)) {
    const proches = [...choisis.values()].filter(
      (o) => Math.abs(o.x - g.x) < 720 && Math.abs(o.y - g.y) < 1600,
    );
    const pris = voisins(g).map((v) => v.nom);
    const emploi = (n: NomForet) => proches.filter((o) => o.nom === n).length;
    const taille = (e: number) => proches.filter((o) => o.echelle === e).length;
    const jumeaux = (n: NomForet) => proches.filter((o) => o.nom === n && pres(o, g, 6)).length;
    const nom =
      [...MASSES].sort(
        (x, y) =>
          jumeaux(x) - jumeaux(y) || emploi(x) - emploi(y) || +pris.includes(x) - +pris.includes(y),
      )[0] ?? g.nom;
    const echelle =
      [...CLASSES_ANNEAU].sort(
        (x, y) => taille(x) - taille(y) || +(y === g.echelle) - +(x === g.echelle),
      )[0] ?? g.echelle;
    const [x, y] = ecarte(
      g,
      proches.filter((o) => o.nom === nom),
    );
    choisis.set(g, { ...g, nom, echelle, x, y });
  }
  return graines.map((g) => choisis.get(g) ?? g);
}

/** Whether two masses' feet lie within `d` cells of each other (Chebyshev). */
const pres = (a: Masse, b: Masse, d: number) => {
  const [[ax, ay], [bx, by]] = [grille(a.x, a.y), grille(b.x, b.y)] as const;
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by)) < d;
};

/** The foot of `g`, moved off along its larger axis by 0.6 cell steps until no mass of `autres` stands within 6 cells of it. */
function ecarte(g: Graine, autres: readonly Graine[]): [number, number] {
  let [gx, gy] = grille(g.x, g.y);
  for (let k = 0; k < 8; k++) {
    const gene = autres
      .map((o) => grille(o.x, o.y))
      .find(([ox, oy]) => Math.max(Math.abs(ox - gx), Math.abs(oy - gy)) < 6);
    if (!gene) break;
    const [dx, dy] = [gx - gene[0], gy - gene[1]];
    const pas = (d: number) => (d < 0 ? -0.6 : 0.6);
    if (Math.abs(dx) >= Math.abs(dy)) gx += pas(dx);
    else gy += pas(dy);
  }
  return [...ecranXY([gx, gy])] as [number, number];
}

function grainesAnneau(): readonly Graine[] {
  if (GRAINES_ANNEAU) return GRAINES_ANNEAU;
  const out: Graine[] = [];
  const T = TERRAIN;
  for (let j = 0; j * PAS_ANNEAU[1] < T.h; j++) {
    for (let i = 0; i * PAS_ANNEAU[0] < T.w; i++) {
      const hasard = mulberry32(31337 + j * 104729 + i * 7919);
      const [x, y] = [
        T.x + (i + 0.5 * (j % 2) + (hasard() - 0.5) * 0.7) * PAS_ANNEAU[0],
        T.y + (j + (hasard() - 0.5) * 0.7) * PAS_ANNEAU[1],
      ];
      const garde = hasard();
      const [gx, gy] = grille(x, y);
      const loin = Math.max(Math.abs(gx - CENTRE_VILLAGE), Math.abs(gy - CENTRE_VILLAGE));
      const classe = COUPURES_ANNEAU.filter((c) => loin >= c).length;
      // Axial coordinates of the odd-row lattice: the 3 colouring is (q - r) mod 3.
      const q = i - (j - (j % 2)) / 2;
      out.push({
        nom: especeAnneau(q, j, classe),
        x,
        y,
        echelle: CLASSES_ANNEAU[classe] ?? 1,
        flip: modulo(q + j, 2) === 1,
        // The north edge only: the undergrowth over the feet of the masses the top of the map shows.
        sb: gx + gy < 6 ? sbDe(q + 2 * j) : undefined,
        i,
        j,
        garde,
      });
    }
  }
  GRAINES_ANNEAU = isolesDistincts(out);
  return GRAINES_ANNEAU;
}

function anneau(dist: (x: number, y: number) => number, clair: number, ok: OkMasse): Masse[] {
  return grainesAnneau()
    .filter((g) => {
      const d = dist(g.x, g.y);
      return d >= clair + RECUL_ANNEAU && d <= PORTEE_ANNEAU && boisee(g.i, g.j) && g.garde <= 0.85;
    })
    .filter((g) => ok(g.x, g.y, g.echelle))
    .map(({ nom, x, y, echelle, flip, sb }) => ({ nom, x, y, echelle, flip, sb }));
}

/** Whether the 3 x 3 patch of the lattice holding cell (i, j) is wooded: its own hash says. */
const boisee = (i: number, j: number): boolean =>
  mulberry32(777 + Math.floor(j / 3) * 15485863 + Math.floor(i / 3) * 32452843)() <= PART_BOISEE;

/** The border along the painted terrain's edge: a wall at the back, gaps in front. The only place `bord_*` stand. */
function bordure(ok: OkMasse): Masse[] {
  const out: Masse[] = [];
  const T = TERRAIN;
  const bords: [number, number, number, number, number][] = [
    // x0, y0, dx, dy, share of pieces skipped
    [T.x, T.y + 34, 115, 0, 0],
    [T.x + 14, T.y + 90, 0, 105, 0.2],
    [T.x + T.w - 14, T.y + 90, 0, 105, 0.2],
    [T.x + 30, T.y + T.h + 6, 135, 0, 0.4],
  ];
  for (const [j, [x0, y0, dx, dy, saute]] of bords.entries()) {
    const longueur = dx > 0 ? T.w : T.h - 90;
    const pas = dx + dy;
    for (let i = 0; i * pas <= longueur; i++) {
      const hasard = mulberry32(48611 + j * 104729 + i * 7919);
      const [x, y] = [x0 + i * dx + (hasard() - 0.5) * 40, y0 + i * dy + (hasard() - 0.5) * 30];
      if (hasard() < saute) continue;
      hasard(); // the old scale draw: the species keeps its place in the sequence
      const nom = hasard() < 0.65 ? "bord_coniferes" : "bord_crete";
      if (ok(x, y, 1.2)) out.push({ nom, x, y, echelle: 1.2, flip: i % 2 === 1 });
    }
  }
  return out;
}

// --- Day veil on the surroundings (loupe BC, criterion 9) ------------------------------------------

/** The veil's ellipse in map dp: clear inside the island's own extent (`dedans` of the radius), slate `force` at the rim and beyond. */
export type Voile = { cx: number; cy: number; rx: number; ry: number; dedans: number };
/** How far past the island's half width the veil reaches its full strength (dp; down it is the same ratio), and that strength. Simulated on the p06 capture: 0.96 becomes 1.19. */
export const VOILE_PORTEE = { x: 560, force: 0.36 } as const;
const CACHE_VOILE = new WeakMap<readonly (readonly boolean[])[], Voile>();

/** The veil of a tier: centred on the island's middle, as wide as the island plus `VOILE_PORTEE`, so it grows with the tier and darkens the surroundings only. */
export function voileVillage(visible: readonly (readonly boolean[])[]): Voile {
  const deja = CACHE_VOILE.get(visible);
  if (deja) return deja;
  const pts = visible.flatMap((l, gy) =>
    l.flatMap((v, gx) => (v ? [ecranXY([gx + 0.5, gy + 0.5])] : [])),
  );
  const [xs, ys] = [pts.map((p) => p[0]), pts.map((p) => p[1])];
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [rx, ry] = [(x1 - x0) / 2 + 24, (y1 - y0) / 2 + 12];
  const v: Voile = {
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    rx: rx + VOILE_PORTEE.x,
    // The same ratio on both axes keeps the clear ellipse the island's own shape.
    ry: (ry * (rx + VOILE_PORTEE.x)) / rx,
    dedans: rx / (rx + VOILE_PORTEE.x),
  };
  CACHE_VOILE.set(visible, v);
  return v;
}

// --- Props ---------------------------------------------------------------------------------------

/** A prop's canvas (240 x 220 px), dp, and where its foot is in it (a share of its height). */
export const TOILE_ACCESSOIRE = { w: 57.6, h: 52.8, pied: 212 / 220 } as const;

export const NOMS_ACCESSOIRES = [
  "caisses_1",
  "caisses_2",
  "sacs_de_grain_1",
  "sacs_de_grain_2",
  "sacs_de_grain_3",
  "tas_de_bois_1",
  "tas_de_bois_2",
  "tonneaux_1",
  "tonneaux_2",
  "tonneaux_3",
  "lanterne_1",
  "lanterne_2",
  "bottes_de_foin_1",
  "bottes_de_foin_2",
  "potager_1",
  "poulailler_2",
  "epouvantail_2",
  "charrette_1",
  "charrette_2",
  "linge_1",
  "outils_1",
  "outils_3",
  "ratelier_1",
  "ratelier_2",
  "etal_1",
  "menhir_1",
  "menhir_2",
  "menhir_3",
  "poteau_indicateur_1",
  "cloture_1",
  "chat_1",
  "pecheur_1",
  "charrette_cassee_1",
  "sieste_1",
  "renard_1",
] as const;
export type NomAccessoire = (typeof NOMS_ACCESSOIRES)[number];

export type Accessoire = {
  nom: NomAccessoire;
  /** The cell it stands on: its footprint in the depth order, 1 x 1. */
  case: Case;
  /** Shown with this building only. */
  batiment?: BuildingCode;
  /** From this tier (the camp first, the town last); 1 when absent. */
  palier?: VillageTier;
  /** Its foot, a grid point, when not the cell's middle (the fisherman on the bridge's front edge). */
  pied?: readonly [number, number];
  /** On this building's roof (the cat): drawn right after it, its foot on its sprite's top. */
  sur?: BuildingCode;
  /** Off the island, beside a plot the painted ground carries (loupe BC): shown with the painted ground, from `palier`, whatever the cells. */
  hors?: true;
  /** Mirrored: a repeat of a prop shown elsewhere in the same view stands flipped (art rule 3). */
  flip?: true;
};

/**
 * Small groups that tell something, on grass cells beside the buildings and the roads of the
 * FIN-DIS plan (dd7cceb0): the camp's crates, sacks and wood round the tent and the fire from tier
 * 1; wood and barrels by the forge, hay and the hen house by the farm, washing by the well and the
 * mill, racks by the archery range and the armory, a stall by the fountain, standing stones by the
 * druids; the stories (the cat on the farm's roof, the fisherman on the bridge, the broken cart on
 * the south road, the old man asleep against his barrel, the fox watching the hens across the
 * river). A prop shows once its cell is on the island, its building stands and its tier is reached:
 * none of the three ever goes back, so nothing disappears.
 */
export const ACCESSOIRES: readonly Accessoire[] = [
  // The camp (tier 1).
  { nom: "caisses_2", case: [7, 11] },
  { nom: "sacs_de_grain_2", case: [7, 12] },
  { nom: "tas_de_bois_2", case: [12, 8] },
  { nom: "tonneaux_1", case: [12, 9] },
  { nom: "lanterne_1", case: [12, 7] },
  // The trades.
  { nom: "tas_de_bois_1", case: [15, 7], batiment: "forge" },
  { nom: "tonneaux_2", case: [15, 6], batiment: "forge" },
  { nom: "bottes_de_foin_1", case: [3, 8], batiment: "farm" },
  { nom: "sacs_de_grain_3", case: [3, 9], batiment: "farm" },
  { nom: "potager_1", case: [5, 6], batiment: "farm", palier: 3 },
  { nom: "poulailler_2", case: [3, 6], batiment: "farm", palier: 4 },
  { nom: "epouvantail_2", case: [3, 7], batiment: "farm", palier: 5 },
  { nom: "bottes_de_foin_2", case: [3, 4], batiment: "barn" },
  { nom: "charrette_2", case: [3, 5], batiment: "barn", palier: 6 },
  { nom: "sacs_de_grain_1", case: [5, 12], batiment: "windmill" },
  { nom: "charrette_1", case: [5, 11], batiment: "windmill", palier: 7 },
  { nom: "linge_1", case: [4, 14], batiment: "well", palier: 4 },
  { nom: "outils_3", case: [3, 14], batiment: "well", palier: 5 },
  // outils_1 (a lone ladder) stood on the path by the quarry: gone (F3, anim-23).
  { nom: "ratelier_1", case: [15, 14], batiment: "archery_range" },
  { nom: "ratelier_2", case: [14, 14], batiment: "archery_range", palier: 5 },
  { nom: "caisses_1", case: [16, 7], batiment: "armory" },
  { nom: "etal_1", case: [13, 14], batiment: "fountain", palier: 6 },
  { nom: "menhir_1", case: [15, 4], batiment: "druid_grove" },
  { nom: "menhir_3", case: [16, 5], batiment: "druid_grove", palier: 7 },
  { nom: "menhir_2", case: [12, 1], batiment: "wizard_tower" },
  { nom: "lanterne_2", case: [16, 6], batiment: "watchtower" },
  { nom: "poteau_indicateur_1", case: [19, 14], batiment: "high_road" },
  { nom: "tonneaux_3", case: [4, 18], batiment: "champion_arena" },
  { nom: "cloture_1", case: [9, 18], batiment: "champion_arena", palier: 10 },
  // The stories (style bible of 31/10 §8).
  { nom: "chat_1", case: [4, 7], sur: "farm", batiment: "farm", palier: 3 },
  { nom: "pecheur_1", case: [2, 11], pied: [2.55, 11.02], palier: 2 },
  { nom: "sieste_1", case: [7, 9], palier: 3 },
  { nom: "charrette_cassee_1", case: [13, 18], palier: 10 },
  { nom: "renard_1", case: [1, 6], batiment: "farm", palier: 4 },
  // The south corner, off the island: the cart alone, on the road's edge beside the wheat plot (docs/designs/village-loop/loupes/bc/route_tuiles.json). The painted ground carries its own fence, hay, barrels and crates. It repeats the prop 6 cells or more away on the island, so mirrored.
  { nom: "charrette_1", case: [18, 22], pied: [18.2, 22.15], palier: 4, hors: true, flip: true },
];

/** The props that show on the island of `visible`, with the buildings `montres` and the tier `palier`. */
export function accessoiresMontres(
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
  palier: VillageTier,
  /** The ground is painted: the props off the island (`hors`) show with it. */
  solPeint = false,
): Accessoire[] {
  return ACCESSOIRES.filter(
    (a) =>
      (a.hors ? solPeint : visible[a.case[1]]?.[a.case[0]] === true) &&
      (a.batiment === undefined || montres.includes(a.batiment)) &&
      (a.palier ?? 1) <= palier,
  );
}

/** A prop's footprint in the depth order: its cell, or its building's for one on a roof. */
export const empriseAccessoire = (a: Accessoire, roof?: Emprise): Emprise =>
  roof ?? { coin: a.case, emprise: [1, 1] };

/** A prop's foot, map dp: its own grid point, else its cell's middle nudged by a hash (no grid of props). */
export function piedAccessoire(a: Accessoire): readonly [number, number] {
  if (a.pied) return ecranXY([a.pied[0], a.pied[1]]);
  const h = mulberry32(a.case[0] * 131 + a.case[1] * 977);
  return ecranXY([a.case[0] + 0.5 + (h() - 0.5) * 0.24, a.case[1] + 0.5 + (h() - 0.5) * 0.24]);
}

// --- Animals ----------------------------------------------------------------------

/** One running or flying frame, dp; a strip holds four side by side (64 x 56 px, 4 px a dp). */
export const IMAGE_ANIMAL = { w: 16, h: 14 } as const;
/** The mice of a run, one painted each: offset from the run's point along the run (behind is negative) and across, dp, and the frame's phase. */
export const SOURIS = [
  { nom: "souris_grise", dx: 0, dy: 0, phase: 0 },
  { nom: "souris_brune", dx: -11, dy: 3, phase: 1.6 },
  { nom: "souris_noire", dx: -21, dy: -2, phase: 2.9 },
] as const;
/** A mouse's frame changes this often while it runs, ms: a scurry, faster than the eye follows. */
export const FRAME_SOURIS_MS = 65;
