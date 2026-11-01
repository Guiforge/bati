// How the lisiere's pieces are chosen (L4-T08a): run by the generator test only
// (`UPDATE_LISIERE=1 npx jest iso-lisiere` writes constants/isoLisiere.json); the app reads the
// JSON through lisiere.ts and never calls this, so the choice costs nothing at start-up.

import { type BuildingCode, buildingCodes } from "@/db/schema";
import { type Case, emplacements, paliers, type Sol, sol, TAILLE } from "./isoLayout";
import { type PieceLisiere, RAYON } from "./lisiere";
import { MAQUETTES } from "./maquettes";
import { enveloppe, type Point, zoneOmbre } from "./ombres";
import { casesSousOmbre, DECORS, varianteDecor } from "./pieces";

/** The full island (tier 12) is the whole grid, so the lisiere also stands this far outside it. */
const BORD = RAYON;

const cle = ([gx, gy]: Case) => `${gx},${gy}`;
const hash = ([gx, gy]: Case, sel: number) =>
  (Math.imul(gx + 64, 73856093) ^ Math.imul(gy + 64, 19349663) ^ Math.imul(sel, 83492791)) >>> 0;
const unite = (c: Case, sel: number) => (hash(c, sel) % 1000) / 1000;

/**
 * The thickets: the lisiere is three groves and a thin scatter between them, not an even sowing
 * (audit T43 round 1). Centres in cells, on the sides the lisiere shows (gx + gy >= TAILLE - 2).
 */
export const BOSQUETS: readonly Case[] = [
  [22, 9],
  [13, 22],
  [16, 14],
];
/** Inside this many cells of a grove's centre a cell is part of it; the edge thins out over one more. */
export const RAYON_BOSQUET = 3.2;
const distBosquet = ([gx, gy]: Case) =>
  Math.min(...BOSQUETS.map(([bx, by]) => Math.hypot(gx - bx, gy - by)));

/** The decor kind for a cell: a grove is trees and bushes, the scatter between is mostly rocks and lone trees. */
const kindDe = (c: Case): Sol => {
  const r = unite(c, 2);
  if (distBosquet(c) <= RAYON_BOSQUET) return r < 0.5 ? "arbre" : r < 0.95 ? "bosquet" : "rochers";
  return r < 0.4 ? "arbre" : r < 0.6 ? "bosquet" : "rochers";
};
/** Thick in a grove, thin elsewhere (was 0.9 in front and 0.5 behind, everywhere). */
const densite = (c: Case) => {
  const d = distBosquet(c);
  return d <= RAYON_BOSQUET ? 1 : d <= RAYON_BOSQUET + 1 ? 0.45 : 0.12;
};

const paires = (plat: readonly number[]): Point[] =>
  plat.flatMap((x, i) => (i % 2 === 0 ? [[x, plat[i + 1] ?? 0] as const] : []));

/** Separating axis test between two convex polygons; touching is not overlapping. */
function chevauche(a: readonly Point[], b: readonly Point[]): boolean {
  for (const poly of [a, b])
    for (const [i, p] of poly.entries()) {
      const q = poly[(i + 1) % poly.length] ?? p;
      const proj = (s: readonly Point[]) =>
        s.map((v) => (q[1] - p[1]) * v[0] + (p[0] - q[0]) * v[1]);
      const [pa, pb] = [proj(a), proj(b)];
      if (Math.max(...pa) <= Math.min(...pb) + 1e-9 || Math.max(...pb) <= Math.min(...pa) + 1e-9)
        return false;
    }
  return true;
}

/** The cells a decor's shadow really covers, own cell included (the hulls against each cell's square). */
function sousOmbre(cleImage: string, [gx, gy]: Case): Case[] {
  const polys = (MAQUETTES[cleImage]?.ombre ?? []).map((o) =>
    enveloppe(paires(o).map(([x, y]): Point => [gx + x, gy + y])),
  );
  return casesSousOmbre(polys).filter(([x, y]) =>
    polys.some((poly) =>
      chevauche(poly, [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
      ]),
    ),
  );
}

const surLaGrille = ([gx, gy]: Case) => gx >= 0 && gy >= 0 && gx < TAILLE && gy < TAILLE;
const grille = (): Case[] =>
  Array.from({ length: TAILLE * TAILLE }, (_, i): Case => [i % TAILLE, Math.floor(i / TAILLE)]);

/** Footprint cells of the grid, by building: a plot not yet shown may carry a piece (tier 2 round). */
const EMPRISES = new Map<string, BuildingCode>(
  buildingCodes.flatMap((code) =>
    emplacements[code].cases.map((c): [string, BuildingCode] => [cle(c), code]),
  ),
);
/** Cells a piece may stand on while they are not yet shown: grass and the plots and paths to come. */
const sePose = ([gx, gy]: Case) =>
  !surLaGrille([gx, gy]) ||
  sol[gy]?.[gx] === "herbe" ||
  sol[gy]?.[gx] === "chemin" ||
  EMPRISES.has(cle([gx, gy]));

/** Water, bridges and decor of the grid, and every footprint and path: no shadow falls on them. */
function casesPrises(): Set<string> {
  const pris = new Set<string>(EMPRISES.keys());
  for (const [gx, gy] of grille()) if (sol[gy]?.[gx] !== "herbe") pris.add(cle([gx, gy]));
  return pris;
}

/** The ground a building (at any stage) or a decor of the grid darkens. */
function casesOmbrees(cles: readonly string[]): Set<string> {
  const ombrees = new Set<string>();
  for (const code of buildingCodes)
    for (const c of casesSousOmbre([zoneOmbre(code)])) ombrees.add(cle(c));
  for (const c of grille()) {
    const kind = sol[c[1]]?.[c[0]];
    const image = kind && DECORS.includes(kind) ? varianteDecor(kind, c, cles) : undefined;
    if (image) for (const z of sousOmbre(image, c)) ombrees.add(cle(z));
  }
  return ombrees;
}

/** The cells a piece's shadow reaches besides its own, null when one is taken. */
function ombreLibre(image: string, c: Case, pris: ReadonlySet<string>): Case[] | null {
  const zone = sousOmbre(image, c).filter((z) => cle(z) !== cle(c));
  return zone.some((z) => pris.has(cle(z))) ? null : zone;
}

/**
 * Every cell that carries a lisiere piece, in scan order, for the images `cles` knows. A cell
 * is off the grid or one of its cells that join after tier 1, plain grass, off every footprint,
 * path and water cell, off any building's or decor's shadow, and its own shadow reaches none of
 * those nor an earlier piece.
 */
export function choisir(cles: readonly string[]): PieceLisiere[] {
  const pris = casesPrises();
  const interdites = casesOmbrees(cles);
  const posees = new Set<string>();
  const pieces: PieceLisiere[] = [];
  for (let gy = -BORD; gy < TAILLE + BORD; gy++)
    for (let gx = -BORD; gx < TAILLE + BORD; gx++) {
      const c: Case = [gx, gy];
      const kind = kindDe(c);
      const image = candidate(c, posees, interdites) ? varianteDecor(kind, c, cles) : undefined;
      if (!image) continue;
      const zone = ombreLibre(image, c, pris);
      if (!zone) continue;
      // `decor/arbre_a.nuit.webp` -> family `decor`, name `arbre_a`.
      const [famille = "", reste = ""] = image.split("/");
      pieces.push({
        famille,
        nom: reste.slice(0, reste.indexOf(".")),
        cle: image,
        miroir: false,
        case: c,
        decor: true,
        kind,
        batiment: EMPRISES.get(cle(c)),
      });
      pris.add(cle(c)); // a later shadow may not fall on it
      posees.add(cle(c));
      for (const z of zone) interdites.add(cle(z)); // nor a later piece stand in this one's
    }
  return pieces;
}

/**
 * Whether a cell may carry a piece: not water, bridge or grid decor; free of an earlier piece and
 * of a shadow; off the always-island cells; drawn by the hash. A building's shadow bars a plain
 * grass cell only: a plot or path not shown yet has none drawn, and the piece goes before it shows.
 */
const candidate = (c: Case, posees: ReadonlySet<string>, interdites: ReadonlySet<string>) =>
  !(surLaGrille(c) && (paliers[c[1]]?.[c[0]] ?? 1) <= 1) &&
  sePose(c) &&
  !posees.has(cle(c)) &&
  (!interdites.has(cle(c)) || EMPRISES.has(cle(c)) || sol[c[1]]?.[c[0]] === "chemin") &&
  unite(c, 1) < densite(c);
