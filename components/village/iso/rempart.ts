// castle_wall's wall sections (FIN-DIS, isoLayout.json `rempart`): one cell each, outside the
// gatehouse's footprint. Painted (F4): each cell gets the piece its neighbours on the line ask for
// (`piecePan`), a palisade at `rough`, a crenellated stone wall from `solid` on, one image a cell
// (scripts/iso/rempart_champs.py). The app's own drawing stays as a fallback behind
// `PANS_VECTORIELS`: flat inked shapes in the style of the camp's things (accessoires.ts), three
// tones and an ink line, drawn by stretch (isoLayout.ts `troncons`: a straight run), one Svg each.
// Either way a stretch is one element of the depth order. Pure and fixed per stretch, visible
// cells and stage: computed once.

import type { BuildingCode } from "@/db/schema";
import { ecranXY, type Rect, Z_DP } from "./carteDemo";
import { type Case, emplacements, rempart, troncons } from "./isoLayout";
import type { Stade } from "./isoSpec";
import type { Masque } from "./masque";
import { LUNE, ombreVolumes, type Point } from "./ombres";
import { MASQUES_PANS } from "./rempartMasques";
import { hasard } from "./solVarie";

/** Off: the painted pieces. On: the app's drawing of FIN-DIS, kept as a fallback (`dessinPans`). */
export const PANS_VECTORIELS: boolean = false;

/**
 * One layer of a stretch, back to front: its tops, its lit (+gy) faces, its shaded (+gx) faces,
 * each filled and inked in one path, then the joints drawn on them. A layer's shapes never cover
 * one another in the wrong order: the merlons and the stakes are spaced for it, and a face another
 * box of the stretch stands against is left out. A pillar, taller, is a layer of its own.
 */
export type Couche = { id: string; haut: string; clair: string; sombre: string; joints: string };

/** A stretch's drawing: its layers in dp inside `rect`, and every face (map dp) for the tap mask. */
export type PanDessin = {
  rect: Rect;
  couches: readonly Couche[];
  faces: readonly (readonly Point[])[];
};

type Boite = readonly [x0: number, x1: number, y0: number, y1: number, z0: number, z1: number];
type Faces = { haut: Point[][]; clair: Point[][]; sombre: Point[][]; joints: Point[][] };

const GRAINE = 29;
/** The stone wall: height (units), thickness (cells), its merlons' height, length and step (cells). */
const PIERRE = { h: 1.15, t: 0.36, merlon: 0.24, long: 0.14, pas: 0.42 } as const;
/** The palisade: height (units), stake step (cells), stake half-width and tip (dp). Stakes never overlap. */
const PIEUX = { h: 0.85, pas: 0.18, demi: 2.1, pointe: 3.6 } as const;
/** A free end (by the gate, the river or the wall walk) stands on a pillar this much taller. */
const PILIER = 1.3;

const cle = ([gx, gy]: Case) => `${gx},${gy}`;
const PANS = new Set(rempart.map(cle));
/** The wall's line: its sections, the gatehouse and the watchtower, which the sections join. */
const LIGNE = new Set([
  ...PANS,
  ...[...emplacements.castle_wall.cases, ...emplacements.watchtower.cases].map(cle),
]);

/** The directions a section runs to, toward its neighbours on the line: -gx, +gx, -gy, +gy. */
function liens([gx, gy]: Case) {
  const l = {
    ox: LIGNE.has(cle([gx - 1, gy])),
    ex: LIGNE.has(cle([gx + 1, gy])),
    oy: LIGNE.has(cle([gx, gy - 1])),
    ey: LIGNE.has(cle([gx, gy + 1])),
  };
  return { ...l, bout: Number(l.ox) + Number(l.ex) + Number(l.oy) + Number(l.ey) <= 1 };
}

const ecranZ = (gx: number, gy: number, z: number): Point => {
  const [x, y] = ecranXY([gx, gy]);
  return [x, y - z * Z_DP];
};

/** The boxes of a section's run, in grid units: one along gx, one along gy, as its links ask. */
function corps(c: Case, h: number, t: number): Boite[] {
  const [gx, gy] = c;
  const l = liens(c);
  const a = 0.5 - t / 2;
  const b = 0.5 + t / 2;
  const boites: Boite[] = [];
  if (l.ox || l.ex) boites.push([gx + (l.ox ? 0 : a), gx + (l.ex ? 1 : b), gy + a, gy + b, 0, h]);
  if (l.oy || l.ey) boites.push([gx + a, gx + b, gy + (l.oy ? 0 : a), gy + (l.ey ? 1 : b), 0, h]);
  return boites;
}

/** The pillar at a free end: a little wider than the wall, `PILIER` times its height. */
function pilier([gx, gy]: Case, h: number, t: number): Boite {
  const a = 0.5 - t * 0.62;
  const b = 0.5 + t * 0.62;
  return [gx + a, gx + b, gy + a, gy + b, 0, h * PILIER];
}

/**
 * Adds a box's visible faces: the top, the +gy face (lit) and the +gx face (shaded), less a face
 * that `cache` says another box of the stretch stands against.
 */
function ajoute(
  f: Faces,
  [x0, x1, y0, y1, z0, z1]: Boite,
  cache: { x?: boolean; y?: boolean } = {},
) {
  f.haut.push([ecranZ(x0, y0, z1), ecranZ(x1, y0, z1), ecranZ(x1, y1, z1), ecranZ(x0, y1, z1)]);
  if (!cache.y)
    f.clair.push([ecranZ(x0, y1, z0), ecranZ(x1, y1, z0), ecranZ(x1, y1, z1), ecranZ(x0, y1, z1)]);
  if (!cache.x)
    f.sombre.push([ecranZ(x1, y0, z0), ecranZ(x1, y1, z0), ecranZ(x1, y1, z1), ecranZ(x1, y0, z1)]);
}

/** The merlons along the top of a run, on its middle line, clear of the pillar's square. */
function merlons([x0, x1, y0, y1, , z1]: Boite, evite: Boite | null): Boite[] {
  const le = x1 - x0 >= y1 - y0;
  const [d0, d1] = le ? [x0, x1] : [y0, y1];
  const [m0, m1] = le ? [y0, y1] : [x0, x1];
  const [p0, p1] = evite ? (le ? [evite[0], evite[1]] : [evite[2], evite[3]]) : [0, 0];
  const w = (m1 - m0) * 0.7;
  const m = (m0 + m1) / 2;
  const out: Boite[] = [];
  for (let s = d0 + 0.06; s + PIERRE.long <= d1 - 0.02; s += PIERRE.pas) {
    const [a, b] = [s, s + PIERRE.long];
    if (evite && b > p0 - 0.04 && a < p1 + 0.04) continue;
    out.push(
      le
        ? [a, b, m - w / 2, m + w / 2, z1, z1 + PIERRE.merlon]
        : [m - w / 2, m + w / 2, a, b, z1, z1 + PIERRE.merlon],
    );
  }
  return out;
}

/** A run's courses: a line at mid-height along each long face, staggered joints above and below. */
function joints([x0, x1, y0, y1, , z1]: Boite): Point[][] {
  const z = z1 * 0.5;
  const lignes: Point[][] = [];
  if (x1 - x0 > PIERRE.t) {
    lignes.push([ecranZ(x0, y1, z), ecranZ(x1, y1, z)]);
    for (let x = x0 + 0.22; x < x1 - 0.1; x += 0.3)
      lignes.push(
        [ecranZ(x, y1, 0), ecranZ(x, y1, z)],
        [ecranZ(x + 0.15, y1, z), ecranZ(x + 0.15, y1, z1)],
      );
  }
  if (y1 - y0 > PIERRE.t) {
    lignes.push([ecranZ(x1, y0, z), ecranZ(x1, y1, z)]);
    for (let y = y0 + 0.22; y < y1 - 0.1; y += 0.3)
      lignes.push(
        [ecranZ(x1, y, 0), ecranZ(x1, y, z)],
        [ecranZ(x1, y + 0.15, z), ecranZ(x1, y + 0.15, z1)],
      );
  }
  return lignes;
}

const vide = (): Faces => ({ haut: [], clair: [], sombre: [], joints: [] });

/** A pillar's faces, with a merlon on each corner. */
function tour(p: Boite): Faces {
  const f = vide();
  ajoute(f, p);
  const [x0, x1, y0, y1, , z1] = p;
  const k = (x1 - x0) * 0.3;
  for (const [u, v] of [
    [x0, y0],
    [x1 - k, y0],
    [x0, y1 - k],
    [x1 - k, y1 - k],
  ] as const)
    ajoute(f, [u, u + k, v, v + k, z1, z1 + PIERRE.merlon]);
  return f;
}

/**
 * The stone stretch, its layers back to front: the pillars at its back end, the run, the pillars
 * at its front end. `dans` says which cells of the line are drawn here: a face against one is hidden.
 */
function pierre(cases: readonly Case[], dans: (c: Case) => boolean): Faces[] {
  const run = vide();
  const avant: Faces[] = [];
  const apres: Faces[] = [];
  for (const c of cases) {
    const l = liens(c);
    const p = l.bout ? pilier(c, PIERRE.h, PIERRE.t) : null;
    const cache = { x: dans([c[0] + 1, c[1]]), y: dans([c[0], c[1] + 1]) };
    for (const b of corps(c, PIERRE.h, PIERRE.t)) {
      ajoute(run, b, cache);
      run.joints.push(...joints(b));
      for (const m of merlons(b, p)) ajoute(run, m);
    }
    // The run lies in front of a pillar when it leaves it toward +gx or +gy.
    if (p) (l.ex || l.ey ? avant : apres).push(tour(p));
  }
  return [...avant, run, ...apres];
}

/** The stakes' feet along a section's line, in grid units, each with its height. */
function pieds(c: Case): [Point, number][] {
  const [gx, gy] = c;
  const l = liens(c);
  const pts: Point[] = [[gx + 0.5, gy + 0.5]];
  const bras = (dx: number, dy: number) => {
    for (let s = PIEUX.pas; s <= 0.5 + 1e-9; s += PIEUX.pas)
      pts.push([gx + 0.5 + dx * s, gy + 0.5 + dy * s]);
  };
  if (l.ox) bras(-1, 0);
  if (l.ex) bras(1, 0);
  if (l.oy) bras(0, -1);
  if (l.ey) bras(0, 1);
  return pts.map((p, i): [Point, number] => {
    const centre = p[0] === gx + 0.5 && p[1] === gy + 0.5;
    const h = PIEUX.h * (0.92 + 0.16 * hasard(gx * 7 + i, gy, 3, GRAINE));
    return [p, centre && l.bout ? PIEUX.h * PILIER : h];
  });
}

/** The palisade: the stakes back to front (lit and shaded halves, cut tips), then two rails in front. */
function palissade(cases: readonly Case[]): Faces[] {
  const pieux = vide();
  const rails = vide();
  const d = PIEUX.demi;
  const tous = cases.flatMap(pieds).sort(([a], [b]) => a[0] + a[1] - (b[0] + b[1]));
  for (const [p, h] of tous) {
    const [x, y] = ecranZ(p[0], p[1], 0);
    const yh = y - h * Z_DP;
    pieux.clair.push([
      [x - d, y],
      [x - d, yh],
      [x, yh],
      [x, y + 0.6],
    ]);
    pieux.sombre.push([
      [x, y + 0.6],
      [x, yh],
      [x + d, yh],
      [x + d, y],
    ]);
    pieux.haut.push([
      [x - d, yh],
      [x, yh - PIEUX.pointe],
      [x + d, yh],
    ]);
  }
  // Two rails along each arm of each section, from its centre to the cell's edge (or to its last
  // stake at a free end), so they run on unbroken from section to section.
  for (const c of cases) {
    const l = liens(c);
    const [cx, cy] = [c[0] + 0.5, c[1] + 0.5];
    for (const [dx, dy, lie] of [
      [-1, 0, l.ox],
      [1, 0, l.ex],
      [0, -1, l.oy],
      [0, 1, l.ey],
    ] as const) {
      if (!lie) continue;
      for (const k of [0.35, 0.7]) {
        const [ax, ay] = ecranZ(cx, cy, PIEUX.h * k);
        const [bx, by] = ecranZ(cx + dx * 0.5, cy + dy * 0.5, PIEUX.h * k);
        rails.sombre.push([
          [ax, ay - 0.8],
          [bx, by - 0.8],
          [bx, by + 0.8],
          [ax, ay + 0.8],
        ]);
      }
    }
  }
  return [pieux, rails];
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const chemin = (polys: readonly (readonly Point[])[], [ox, oy]: Point, ferme = true) =>
  polys
    .map(
      (p) =>
        `${p.map(([x, y], i) => `${i ? "L" : "M"}${r1(x - ox)},${r1(y - oy)}`).join("")}${ferme ? "Z" : ""}`,
    )
    .join("");

/** The dp box round a set of polygons, with a margin for the ink. */
function boiteDe(polys: readonly (readonly Point[])[]): Rect {
  const pts = polys.flat();
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const x = Math.floor(Math.min(...xs)) - 2;
  const y = Math.floor(Math.min(...ys)) - 2;
  return { x, y, w: Math.ceil(Math.max(...xs)) + 2 - x, h: Math.ceil(Math.max(...ys)) + 2 - y };
}

/** The stage a section is drawn at: castle_wall's, whose painted stages are `rough` and `solid`. */
const stadePan = (stade: Stade): "rough" | "solid" => (stade === "rough" ? "rough" : "solid");

const DESSINS = new Map<string, PanDessin>();

/**
 * A stretch's drawing at castle_wall's stage, in dp inside its own box: `cases` are the cells of
 * the stretch the island shows, back to front (see `pansMontres`). Null when there are none.
 */
export function dessinPans(cases: readonly Case[], stade: Stade): PanDessin | null {
  if (cases.length === 0) return null;
  const s = stadePan(stade);
  const k = `${cases.map(cle).join(";")}:${s}`;
  const connu = DESSINS.get(k);
  if (connu) return connu;
  const ici = new Set(cases.map(cle));
  const couches = s === "solid" ? pierre(cases, (c) => ici.has(cle(c))) : palissade(cases);
  const faces = couches.flatMap((f) => [...f.haut, ...f.clair, ...f.sombre]);
  const rect = boiteDe(faces);
  const o: Point = [rect.x, rect.y];
  const dessin: PanDessin = {
    rect,
    // A layer's place in its stretch never changes for a given set of cells: a stable key.
    couches: couches.map((f, n) => ({
      id: `${k}:${n}`,
      haut: chemin(f.haut, o),
      clair: chemin(f.clair, o),
      sombre: chemin(f.sombre, o),
      joints: chemin(f.joints, o, false),
    })),
    faces,
  };
  DESSINS.set(k, dessin);
  return dessin;
}

/** A section's ground shadow under the moon, in grid units, as a building's (carteDemo `ombresDe`). */
export function ombresPan(c: Case, stade: Stade): Point[][] {
  const pierreuse = stadePan(stade) === "solid";
  const [h, t] = pierreuse ? [PIERRE.h + PIERRE.merlon, PIERRE.t] : [PIEUX.h, 0.12];
  const boites = [...corps(c, h, t), ...(liens(c).bout ? [pilier(c, h, t)] : [])];
  return ombreVolumes(
    boites.map(([x0, x1, y0, y1, z0, z1]) => ({
      vertices: [x0, x1].flatMap((x) =>
        [y0, y1].flatMap((y) => [[x, y, z0] as const, [x, y, z1] as const]),
      ),
      emissive: false,
      noShadow: false,
    })),
    LUNE,
  );
}

/** The sections on show: castle_wall stands, and the section's cell is on the island. */
export function pansMontres(
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
): Case[] {
  if (!montres.includes("castle_wall")) return [];
  return rempart.filter(([gx, gy]) => visible[gy]?.[gx] === true);
}

/** The cells of stretch `i` on show, back to front. */
export function montresDuTroncon(
  i: number,
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
): Case[] {
  if (!montres.includes("castle_wall")) return [];
  return (troncons[i] ?? []).filter(([gx, gy]) => visible[gy]?.[gx] === true);
}

const dedans = (poly: readonly Point[], x: number, y: number) => {
  let oui = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] ?? [0, 0];
    const [xj, yj] = poly[j] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) oui = !oui;
  }
  return oui;
};

const MASQUES = new WeakMap<PanDessin, Masque>();

/** A stretch's tap mask, one bit per 2 dp of its box (its "sprite px" are dp): set inside a face. */
export function masquePan(d: PanDessin): Masque {
  const connu = MASQUES.get(d);
  if (connu) return connu;
  const m = lireMasque(d);
  MASQUES.set(d, m);
  return m;
}

function lireMasque(d: PanDessin): Masque {
  const pas = 2;
  const w = Math.ceil(d.rect.w / pas);
  const h = Math.ceil(d.rect.h / pas);
  let bits = "";
  for (let r = 0; r < h; r++)
    for (let q = 0; q < w; q += 4) {
      let n = 0;
      for (let b = 0; b < 4; b++) {
        const x = d.rect.x + (q + b + 0.5) * pas;
        const y = d.rect.y + (r + 0.5) * pas;
        if (q + b < w && d.faces.some((f) => dedans(f, x, y))) n |= 8 >> b;
      }
      bits += n.toString(16);
    }
  return { pas, w, h, bits };
}

// --- Painted pieces (F4) -------------------------------------------------------------------------

/** The painted pieces: a run along gx or gy, the corner, a free end with its arm toward +gx, -gx or +gy. */
type PiecePan = "run_gx" | "run_gy" | "corner" | "end" | "end_mgx" | "end_pgy";

/** A piece's canvas (512 x 640 px at S, 8 px a dp), dp, and its anchor on the cell's bottom corner. */
const TOILE_PAN = { w: 64, h: 80, ancre: [32, 72] } as const;

/**
 * The piece a section's cell takes from its neighbours on the line (the gatehouse and the
 * watchtower count): a free end by the side its one arm leaves, a run, or the corner. No section
 * of the plan is a free end leaving toward -gy or a lone cell; either would stand as the corner.
 */
export function piecePan(c: Case): PiecePan {
  const l = liens(c);
  if (l.bout) return l.ex ? "end" : l.ox ? "end_mgx" : l.ey ? "end_pgy" : "corner";
  if (l.ox && l.ex) return "run_gx";
  if (l.oy && l.ey) return "run_gy";
  return "corner";
}

export type PiecePeinte = {
  case: Case;
  /** The image's name in assets/images/village/iso/rempart/, its stage first. */
  nom: keyof typeof MASQUES_PANS;
  /** Where it lies on the map, dp. */
  rect: Rect;
  /** Its tap mask, in the canvas' px (the night has the same alpha). */
  masque: Masque;
};

/** A stretch's painted pieces at castle_wall's stage, in gx + gy order (back to front). */
export function piecesPeintes(cases: readonly Case[], stade: Stade): PiecePeinte[] {
  const s = stadePan(stade);
  const { w, h, ancre } = TOILE_PAN;
  return [...cases]
    .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
    .map((c) => {
      const nom = `${s}_${piecePan(c)}` as const;
      const [x, y] = ecranXY([c[0] + 1, c[1] + 1]);
      return {
        case: c,
        nom,
        rect: { x: x - ancre[0], y: y - ancre[1], w, h },
        masque: MASQUES_PANS[nom],
      };
    });
}
