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
import { COTE, ecranXY, LARGEUR } from "./carteDemo";
import { PARCELLES } from "./champs";
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
  /** About the foot: ±10 % round 1 for a mass, 1.3 for the border; 0.85, 1.15 or 1.5 on the south lisiere. */
  echelle: number;
  /** Mirrored on the south lisiere only (repeats alternate); the ring and the border are never mirrored (the light is on the left). */
  flip?: boolean;
};

/** The ring's lattice step, dp (the island's 2:1 diamond), how far past the clearing it starts and how far from the island it stops. */
const PAS_ANNEAU = [128, 56] as const;
const RECUL_ANNEAU = 24;
const PORTEE_ANNEAU = 460;
/** The share of the ring's patches that are wooded (Guillaume, 01/11: groups with dark gaps between). */
const PART_BOISEE = 0.68;
/** How far a mass keeps from a road leaving the village and from the river, grid cells. */
const DEGAGE_ROUTE = 0.9;
const RIVIERE_GX: readonly [number, number] = [1.5, 3.5];

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
  routes: readonly (readonly [number, number])[] = ROUTES,
): boolean {
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
    if (gx > RIVIERE_GX[0] && gx < RIVIERE_GX[1]) return false;
    if (
      champs.some(
        ([cx, cy, w, h]) =>
          gx > cx - 0.3 && gx < cx + w + 0.3 && gy > cy - 0.3 && gy < cy + h + 0.3,
      )
    )
      return false;
    return routes.every(([rx, ry]) => Math.hypot(gx - rx, gy - ry) >= DEGAGE_ROUTE);
  });
}

const CACHE_FORET = new WeakMap<readonly (readonly boolean[])[], Masse[]>();

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
  const deja = CACHE_FORET.get(visible);
  if (deja) return deja;
  const dist = distCases(visible);
  const clair = clairiere(visible);
  // The painted ground carries the south corner's two plots: no mass on them, whatever the tier.
  const exclus = [...champs, ...PARCELLES_RECTS];
  const ok = (x: number, y: number, e: number, routes: typeof ROUTES = ROUTES) =>
    libre(dist, clair, exclus, x, y, TOILE_FORET.w * e, TOILE_FORET.h * e, routes);
  // The south lisiere owns the land past the painted ground's edge: the ring leaves it alone.
  const horsLisiere = (x: number, y: number, e: number) =>
    !dansLisiere(...grille(x, y), DEBUT_ANNEAU) && ok(x, y, e);
  const out = [...anneau(dist, clair, horsLisiere), ...bordure(ok), ...lisiereSud(ok)].sort(
    (a, b) => a.y - b.y,
  );
  CACHE_FORET.set(visible, out);
  return out;
}

/**
 * The south lisiere (loupe BC). The painted ground is the square gx, gy under 36.8, its tip the
 * south road's end; past its two south edges the baked terrain is grey noise, which the forest hides.
 * Whole masses only, never cut: a lattice of feet over everything past the edge (to 50 cells), three
 * size classes by depth (0.85 near the village, 1.0, 1.2 at the map's edge), six species in a cycle
 * that keeps every repeat 6 cells or more apart, mirrored by the parity of the cell so the repeats
 * alternate. A curtain of masses stands along the road's last stretch, each foot beside it and its
 * crown over it, so the road goes in behind the trees and ends there. A function of the terrain
 * only, not of the tier: the same masses at every tier (the ring leaves this land to it), so
 * nothing appears late or goes.
 */
const LISIERE_DEBUT = 35.2;
/** The ring stops here (a 2 cell strip of meadow between it and the lisiere). */
const DEBUT_ANNEAU = 33;
const PAS_LISIERE = 3.6;
const FOND_LISIERE = 50;
const ESPECES_LISIERE: readonly NomForet[] = [
  "bouleaux",
  "bord_coniferes",
  "feuillus",
  "dense",
  "bord_crete",
  "melangee",
];
const classeLisiere = (somme: number) => (somme < 74 ? 0.85 : somme < 88 ? 1 : 1.2);
const dansLisiere = (gx: number, gy: number, debut = LISIERE_DEBUT) => gx > debut || gy > debut;
/** The south road's nodes, and the stretch from `RIDEAU_DEPUIS` (gx + gy) that the curtain hides. */
const ROUTE_SUD: readonly Point[] = SORTIES.find((s) => s.fin[0] === 12)?.branches[0] ?? [];
const RIDEAU_DEPUIS = 60;
/** How far beside the road a curtain mass stands, cells: the nearest of these that fits. */
const FLANCS_RIDEAU = [1.6, 2, 2.4, 3] as const;
/** A curtain foot stands this far in front of its node (toward the screen's bottom), cells: the crown, drawn above the foot, then covers the node. */
const DEVANT_RIDEAU = 1.8;

type OkMasse = (x: number, y: number, echelle: number, routes?: typeof ROUTES) => boolean;

/**
 * The curtain: a mass beside every other node of the road's last stretch and one past its end,
 * sides alternating, species all different. Its foot keeps clear of the road (the nearest side and
 * distance that fit), its crown covers it.
 */
function rideauDeRoute(ok: OkMasse): Masse[] {
  const dernier = ROUTE_SUD.at(-1);
  const avant = ROUTE_SUD.at(-2);
  if (!dernier || !avant) return [];
  const bout: Point = [dernier[0] + (dernier[0] - avant[0]), dernier[1] + (dernier[1] - avant[1])];
  const points = [...ROUTE_SUD.filter(([gx, gy]) => gx + gy >= RIDEAU_DEPUIS), bout].filter(
    (_, k, tous) => k % 2 === 0 || k === tous.length - 1,
  );
  return points.flatMap(([gx, gy], k): Masse[] => {
    const echelle = k === points.length - 1 ? 1.2 : 1;
    const nom = ESPECES_LISIERE[(k * 5 + 1) % ESPECES_LISIERE.length] ?? "melangee";
    const pied = pieds(ok, [gx, gy], k % 2 === 0 ? 1 : -1, echelle);
    return pied ? [{ nom, x: pied[0], y: pied[1], echelle, flip: k % 2 === 1 }] : [];
  });
}

/** A foot beside a road node, on the preferred side first, the nearest distance that keeps clear of the road and fits. */
function pieds(ok: OkMasse, [gx, gy]: Point, pref: number, echelle: number): Point | null {
  for (const d of FLANCS_RIDEAU) {
    for (const cote of [pref, -pref]) {
      const g: Point = [
        gx + (cote * d) / Math.SQRT2 + DEVANT_RIDEAU,
        gy - (cote * d) / Math.SQRT2 + DEVANT_RIDEAU,
      ];
      const [x, y] = ecranXY(g);
      const loin = ROUTES.every(
        ([rx, ry]) => Math.hypot(g[0] - rx, g[1] - ry) >= DEGAGE_ROUTE + 0.2,
      );
      if (loin && ok(x, y, echelle, [])) return [x, y];
    }
  }
  return null;
}

/** Whether a map point lies under a mass's crown (an ellipse over its canvas). */
const sousCouronne = (x: number, y: number, m: Masse) => {
  const [w, h] = [TOILE_FORET.w * m.echelle, TOILE_FORET.h * m.echelle];
  return ((x - m.x) / (0.45 * w)) ** 2 + ((y - (m.y - 0.5 * h)) / (0.45 * h)) ** 2 < 1;
};

/**
 * Fills what the lattice left bare past the painted ground's edge: every point of a 1.5 cell
 * lattice under no crown gets a mass centred on it, of the first species with no twin within 6 cells.
 */
function combler(ok: OkMasse, deja: readonly Masse[]): Masse[] {
  const tous = [...deja];
  const ajouts: Masse[] = [];
  for (let gy = 36; gy <= FOND_LISIERE; gy += 1.5) {
    for (let gx = 14; gx <= FOND_LISIERE; gx += 1.5) {
      if ((gx <= LISIERE_DEBUT && gy <= LISIERE_DEBUT) || Math.abs(gx - gy) > 20) continue;
      const [px, py] = ecranXY([gx, gy]);
      if (tous.some((m) => sousCouronne(px, py, m))) continue;
      const echelle = classeLisiere(gx + gy);
      const [x, y] = [px, py + 0.5 * TOILE_FORET.h * echelle];
      const [fx, fy] = grille(x, y);
      const nom = ESPECES_LISIERE.find((n) =>
        tous.every((m) => {
          const [mx, my] = grille(m.x, m.y);
          return m.nom !== n || Math.max(Math.abs(mx - fx), Math.abs(my - fy)) >= 6;
        }),
      );
      if (!nom || !ok(x, y, echelle)) continue;
      const m: Masse = { nom, x, y, echelle, flip: tous.length % 2 === 1 };
      tous.push(m);
      ajouts.push(m);
    }
  }
  return ajouts;
}

function lisiereSud(ok: OkMasse): Masse[] {
  const rideau = rideauDeRoute(ok);
  const pres = rideau.map((f) => ({ nom: f.nom, g: grille(f.x, f.y) }));
  const out: Masse[] = [];
  const n = Math.floor((FOND_LISIERE - 14) / PAS_LISIERE) + 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const hasard = mulberry32(90001 + j * 104729 + i * 7919);
      const gx = 14 + (i + (hasard() - 0.5) * 0.2) * PAS_LISIERE;
      const gy = 14 + (j + (hasard() - 0.5) * 0.2) * PAS_LISIERE;
      if (!dansLisiere(gx, gy) || Math.abs(gx - gy) > 20) continue;
      const nom = ESPECES_LISIERE[(i + 2 * j) % ESPECES_LISIERE.length] ?? "melangee";
      // Nothing stands against a curtain mass, and no twin of one within 6 cells.
      const loin = (p: (typeof pres)[number]) =>
        Math.max(Math.abs(p.g[0] - gx), Math.abs(p.g[1] - gy)) >= (p.nom === nom ? 6 : 2.5);
      if (!pres.every(loin)) continue;
      const [x, y] = ecranXY([gx, gy]);
      const echelle = classeLisiere(gx + gy);
      if (ok(x, y, echelle)) out.push({ nom, x, y, echelle, flip: (i + j) % 2 === 1 });
    }
  }
  const base = [...out, ...rideau];
  return [...base, ...combler(ok, base)];
}

/**
 * The ring: a jittered lattice over the painted terrain, kept where it stands past the clearing and
 * within `PORTEE_ANNEAU` of the island (a screen at the zoom floor never shows further). A coarse
 * noise switches whole patches on or off, so the woods come in groups with dark gaps between them
 * and never one carpet. Light kinds near the glade, dense ones deeper; no two lattice neighbours alike.
 */
function anneau(
  dist: (x: number, y: number) => number,
  clair: number,
  ok: (x: number, y: number, echelle: number) => boolean,
): Masse[] {
  const out: Masse[] = [];
  const T = TERRAIN;
  for (let j = 0; j * PAS_ANNEAU[1] < T.h; j++) {
    for (let i = 0; i * PAS_ANNEAU[0] < T.w; i++) {
      const hasard = mulberry32(31337 + j * 104729 + i * 7919);
      const [x, y] = [
        T.x + (i + 0.5 * (j % 2) + (hasard() - 0.5) * 0.7) * PAS_ANNEAU[0],
        T.y + (j + (hasard() - 0.5) * 0.7) * PAS_ANNEAU[1],
      ];
      const d = dist(x, y);
      if (d < clair + RECUL_ANNEAU || d > PORTEE_ANNEAU || !boisee(i, j) || hasard() > 0.85)
        continue;
      const echelle = 0.9 + 0.2 * hasard();
      const nom = especeAnneau(d - clair < 90, hasard(), out.at(-1)?.nom);
      if (ok(x, y, echelle)) out.push({ nom, x, y, echelle });
    }
  }
  return out;
}

/** Whether the 3 x 3 patch of the lattice holding cell (i, j) is wooded: its own hash says. */
const boisee = (i: number, j: number): boolean =>
  mulberry32(777 + Math.floor(j / 3) * 15485863 + Math.floor(i / 3) * 32452843)() <= PART_BOISEE;

/** Light kinds near the glade, dense ones deeper; never the same as the one before. */
function especeAnneau(pres: boolean, tirage: number, avant: NomForet | undefined): NomForet {
  const liste: readonly NomForet[] = pres
    ? ["bouleaux", "feuillus", "melangee"]
    : ["dense", "melangee", "feuillus"];
  const tire = liste[Math.floor(tirage * liste.length)] ?? "feuillus";
  return tire === avant ? (liste.find((m) => m !== avant) ?? tire) : tire;
}

/** The border along the painted terrain's edge: a wall at the back, gaps in front. */
function bordure(ok: (x: number, y: number, echelle: number) => boolean): Masse[] {
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
      const echelle = 1.3 * (0.9 + 0.2 * hasard());
      const nom = hasard() < 0.65 ? "bord_coniferes" : "bord_crete";
      if (ok(x, y, echelle)) out.push({ nom, x, y, echelle });
    }
  }
  return out;
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
  // The south corner, off the island, each prop against an edge of a painted plot (docs/designs/village-loop/loupes/bc/route_tuiles.json). Every one repeats a prop 6 cells or more away on the island, so mirrored.
  { nom: "charrette_1", case: [20, 21], pied: [20.5, 21.6], palier: 4, hors: true, flip: true },
  {
    nom: "bottes_de_foin_1",
    case: [26, 19],
    pied: [26.4, 19.9],
    palier: 4,
    hors: true,
    flip: true,
  },
  { nom: "tonneaux_2", case: [22, 15], pied: [22.1, 15.4], palier: 4, hors: true, flip: true },
  { nom: "caisses_2", case: [26, 13], pied: [26.9, 13.6], palier: 4, hors: true, flip: true },
  { nom: "cloture_1", case: [29, 25], pied: [29.5, 25.5], palier: 4, hors: true, flip: true },
  {
    nom: "bottes_de_foin_2",
    case: [27, 23],
    pied: [27.1, 23.2],
    palier: 4,
    hors: true,
    flip: true,
  },
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
