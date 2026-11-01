// The stream (T22): one continuous band drawn by the app where blender's canal pieces stood cell by
// cell, each with its own ink bank and a seam at every edge. Its centre line runs through the water
// cells of the master grid and meanders a little inside them (a slow sine whose phase is a hash of
// the grid, no randomness), its width wavers (AUDIT-DA 3: wide enough to read at the lowest zoom,
// with an ink line on the water in the ground tile), and a darker bank (BERGE, two faint wider copies)
// melts it into the lawn. At the bridge and the cascade, which keep their painted images, the line is
// centred and as wide as their channel. Pure; Tuile draws `ruisseauDe(visible)` in every ground tile.

import { type Case, sol as grilleMaitre, type Sol } from "./isoLayout";
import type { Point } from "./ombres";
import { cheminRuban, lisse, ruban } from "./ruban";
import { hasard } from "./solVarie";

type Grille = readonly (readonly Sol[])[];

const EAU: ReadonlySet<Sol | undefined> = new Set<Sol | undefined>(["eau", "pont", "cascade"]);
const GRAINE = 13;
/** How far the line strays from a cell's centre, in cells, and over how many cells it swings back. */
const AMPLITUDE = 0.25;
const PERIODE = 5;
/** Half the water's width, in cells: its mean, how much it wavers and over how many cells. */
const DEMI = 0.2;
const ECART = 0.03;
const PERIODE_LARGEUR = 4.3;
/** Half the painted channel of the bridge and the cascade (their banks stand at 0.12 and 0.88 of the cell). */
const DEMI_PEINT = 0.36;
/** How much narrower the lighter heart is than the water, in cells. */
const COEUR = 0.08;
/** Points of the smoothed line per cell. */
const PAS = 6;
/** The bank: how far past the water each step reaches, in cells, and its opacity, the outer fainter. */
export const BERGE = [
  { pas: 0.2, opacite: 0.4 },
  { pas: 0.1, opacite: 0.75 },
] as const;

/**
 * The water cells as one chain, from one end to the other (4-neighbours).
 * shortcut: one chain without forks or loops, as on the master grid (one canal along gx 2); a fork
 * would need the stream drawn as several chains meeting, the day a layout has one.
 */
export function chaineEau(grille: Grille = grilleMaitre): Case[] {
  const eau = (x: number, y: number) => EAU.has(grille[y]?.[x]);
  const voisins = ([x, y]: Case): Case[] =>
    (
      [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const
    ).filter(([a, b]) => eau(a, b));
  const cases = grille.flatMap((l, y) => l.flatMap((_, x): Case[] => (eau(x, y) ? [[x, y]] : [])));
  const debut = cases.find((c) => voisins(c).length <= 1);
  if (!debut) return [];
  const vus = new Set<string>();
  const chaine: Case[] = [];
  for (let c: Case | undefined = debut; c; ) {
    vus.add(c.join(","));
    chaine.push(c);
    c = voisins(c).find((v) => !vus.has(v.join(",")));
  }
  return chaine;
}

type Trace = { centres: Point[]; demis: number[]; dirs: Point[] };

/** The centre line's node and half-width on each cell of the chain, and the chain's direction there. */
function trace(chaine: readonly Case[], grille: Grille): Trace {
  const fixe = chaine.map(([x, y]) => grille[y]?.[x] !== "eau");
  const [x0, y0] = chaine[0] ?? [0, 0];
  const phase = 2 * Math.PI * hasard(x0, y0, 70, GRAINE);
  const phaseL = 2 * Math.PI * hasard(x0, y0, 71, GRAINE);
  const dirs = chaine.map((c, i): Point => {
    const a = chaine[i - 1] ?? c;
    const b = chaine[i + 1] ?? c;
    const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / n, (b[1] - a[1]) / n];
  });
  // The swing fades to nothing over two cells towards a painted cell, so the line meets it centred.
  const enveloppe = (i: number) =>
    Math.min(1, ...fixe.flatMap((f, j) => (f ? [Math.abs(i - j) / 2] : [])));
  const centres = chaine.map(([x, y], i): Point => {
    const [dx, dy] = dirs[i] ?? [0, 1];
    const o = AMPLITUDE * Math.sin((2 * Math.PI * i) / PERIODE + phase) * enveloppe(i);
    return [x + 0.5 - dy * o, y + 0.5 + dx * o];
  });
  const demis = chaine.map((_, i) =>
    fixe[i] ? DEMI_PEINT : DEMI + ECART * Math.sin((2 * Math.PI * i) / PERIODE_LARGEUR + phaseL),
  );
  return { centres, demis, dirs };
}

/** One run of consecutive cells [k, m] of the chain as its smoothed line, cut square at its two cell edges. */
function troncon({ centres, demis, dirs }: Trace, k: number, m: number) {
  const bout = (i: number, s: -1 | 1): Point => {
    const [x, y] = centres[i] ?? [0, 0];
    const [dx, dy] = dirs[i] ?? [0, 1];
    return [x + s * 0.5 * dx, y + s * 0.5 * dy];
  };
  const pts = [bout(k, -1), ...centres.slice(k, m + 1), bout(m, 1)];
  const h = [demis[k] ?? DEMI, ...demis.slice(k, m + 1), demis[m] ?? DEMI];
  // The half-width rides the same spline as the line, as a point on the x axis.
  return {
    ligne: lisse(pts, PAS),
    demis: lisse(
      h.map((v): Point => [v, 0]),
      PAS,
    ).map(([v]) => v),
  };
}

export type Ruisseau = {
  /** The water's outline, one subpath per stretch on the island. */
  eau: string;
  /** The bank's outlines, one per BERGE step. */
  berge: readonly string[];
  /** A narrower band along the middle, lighter: the water's depth. */
  coeur: string;
};

const preparer = (grille: Grille) => {
  const chaine = chaineEau(grille);
  return { chaine, t: trace(chaine, grille) };
};
const MAITRE = preparer(grilleMaitre);

/**
 * The stream on an island: the chain cut into the stretches whose cells are all on it (a cell
 * still off the island draws nothing there), each with its bank. Once per island, not per tile.
 */
export function ruisseauDe(
  visible: readonly (readonly boolean[])[],
  grille: Grille = grilleMaitre,
): Ruisseau {
  const { chaine, t } = grille === grilleMaitre ? MAITRE : preparer(grille);
  const troncons: ReturnType<typeof troncon>[] = [];
  let k = -1;
  chaine.forEach(([x, y], i) => {
    const vu = visible[y]?.[x] === true;
    if (vu && k < 0) k = i;
    if (k >= 0 && (!vu || i === chaine.length - 1)) {
      troncons.push(troncon(t, k, vu ? i : i - 1));
      k = -1;
    }
  });
  const contour = (plus: number) =>
    cheminRuban(
      troncons.map(({ ligne, demis }) =>
        ruban(
          ligne,
          demis.map((h) => h + plus),
        ),
      ),
    );
  return { eau: contour(0), berge: BERGE.map(({ pas }) => contour(pas)), coeur: contour(-COEUR) };
}

/** The stream's centre on a chain cell, in grid units (a glint rides it); the cell's centre elsewhere. */
export function centreEau([gx, gy]: Case): Point {
  const i = MAITRE.chaine.findIndex(([x, y]) => x === gx && y === gy);
  return MAITRE.t.centres[i] ?? [gx + 0.5, gy + 0.5];
}
