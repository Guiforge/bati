// Which water cells get a glint, and the half-length of one. The glint layers are mounted after
// the last water piece (IsoCarteDemo.tsx `Reflets`), so a cell a later sprite covers must not get
// one: it would show on a roof (L5-T09b, seen on the farm).

import type { BuildingCode } from "@/db/schema";
import {
  COTE,
  type ElementCarte,
  ecranXY,
  pose,
  posePiece,
  type Rect,
  spriteDe,
} from "./carteDemo";
import { type Case, sol } from "./isoLayout";
import type { Stade } from "./isoSpec";
import { MAQUETTES } from "./maquettes";
import { hasard } from "./solVarie";
import { opaque } from "./tapBatiment";

/** Half the length of a water glint, in dp (it stays on its cell's diagonal). */
export const REFLET_LONG = COTE * 0.12;
/** How far around a point the building mask is read, in dp. */
const MARGE = COTE * 0.08;
/** How far a glint slides each way along that diagonal, in dp. */
export const REFLET_COURSE = COTE * 0.15;

/** One glint in two is kept, picked by a hash of its cell: sparse, never a regular run along the stream. */
const GARDE = 0.5;
/** `premiere`: a band's first cell always keeps it, so each of the five layers has a glint. */
const garde = (c: Case, premiere: boolean) => premiere || hasard(c[0], c[1], 90, 13) < GARDE;

/**
 * Where a cell's glint sits off the stream's centre (grid units: across it, along it) and how long
 * it is (a factor of REFLET_LONG), all from a hash of the cell.
 */
export const traitReflet = (c: Case) => ({
  dx: (hasard(c[0], c[1], 91, 13) - 0.5) * 0.24,
  dy: (hasard(c[0], c[1], 92, 13) - 0.5) * 0.7,
  long: 0.5 + hasard(c[0], c[1], 93, 13),
});

const estEau = (e: ElementCarte) =>
  e.type === "piece" &&
  !e.piece.decor &&
  !!MAQUETTES[e.piece.cle] &&
  sol[e.piece.case[1]]?.[e.piece.case[0]] === "eau";

const dans = (r: Rect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/**
 * Whether view `e` draws something at map point (x, y): a building by its tap mask (read at the
 * image's own pixels: its box is mostly empty air), any other piece by its box. The mask is coarse
 * (8 px cells), so it is read a little around the point too. A view without an image covers nothing.
 */
export function couvre(
  e: ElementCarte,
  x: number,
  y: number,
  stade: (code: BuildingCode) => Stade,
): boolean {
  if (e.type === "batiment") {
    const s = spriteDe(e.code, stade(e.code));
    if (!s?.masque) return false;
    const r = pose(e.code, s);
    const { masque } = s;
    return [
      [0, 0],
      [-MARGE, 0],
      [MARGE, 0],
      [0, -MARGE],
      [0, MARGE],
    ].some(
      ([dx = 0, dy = 0]) =>
        dans(r, x + dx, y + dy) &&
        opaque(masque, ((x + dx - r.x) / r.w) * s.size[0], ((y + dy - r.y) / r.h) * s.size[1]),
    );
  }
  // A wall section stands on dry land, never over a glint (rempart.ts).
  if (e.type === "pan") return false;
  const m = e.type === "lisiere" ? undefined : MAQUETTES[e.piece.cle];
  if (!m) return false;
  // A decor's box is mostly air at its sides and its foot: only its middle counts as covering.
  const r = posePiece(e.piece.case, m);
  return dans({ x: r.x + r.w * 0.2, y: r.y, w: r.w * 0.6, h: r.h * 0.8 }, x, y);
}

/** The points a cell's glint passes over: its middle and the two thirds of its slide, on the diagonal. */
export const pointsReflet = (c: Case): [number, number][] => {
  const [x, y] = ecranXY(c);
  return [-0.25, 0, 0.25].map((k) => {
    const t = k * (REFLET_LONG + REFLET_COURSE);
    return [x - t, y + COTE / 4 + t / 2];
  });
};

const casesPonts = (vues: readonly ElementCarte[]) =>
  new Set(
    vues.flatMap((e) =>
      e.type === "piece" && e.piece.cle.includes("pont") ? [e.piece.case.join(",")] : [],
    ),
  );

/** Animated layers of glints, one per band of the canal. */
export const DELAIS = 5;
export type CoucheReflets = { k: number; cases: readonly Case[] };

/** The glint of the water view `i` of a band ending at `fin`: its cell if kept, not under a bridge, not covered. */
function gardee(
  vues: readonly ElementCarte[],
  i: number,
  bande: readonly number[],
  fin: number,
  ponts: ReadonlySet<string>,
  cache: (e: ElementCarte, x: number, y: number) => boolean,
): Case | undefined {
  const e = vues[i];
  if (e?.type !== "piece") return undefined;
  const c = e.piece.case;
  if (!garde(c, i === bande[0]) || ponts.has(`${c[0]},${c[1] + 1}`)) return undefined;
  const entre = vues.slice(i + 1, fin + 1).filter((v) => !estEau(v));
  return pointsReflet(c).some(([x, y]) => entre.some((v) => cache(v, x, y))) ? undefined : c;
}

/**
 * The water cells that get a glint, in DELAIS bands of the canal in depth order. A band's layer is
 * mounted right after its last water piece (the map files it under that piece's cell), so only
 * what is sorted between a cell and its layer can hide under a glint: a cell loses its glint when
 * a view drawn in that stretch (`cache(view, x, y)`, `couvre` on the map) covers its track, and
 * when a bridge follows it (the deck covers it). Everything sorted after the layer is drawn over it.
 */
export function refletsPar(
  vues: readonly ElementCarte[],
  cache: (e: ElementCarte, x: number, y: number) => boolean,
): ReadonlyMap<string, CoucheReflets> {
  const ponts = casesPonts(vues);
  const eaux = vues.flatMap((e, i) => (e.type === "piece" && estEau(e) ? [i] : []));
  const taille = Math.max(1, Math.ceil(eaux.length / DELAIS));
  const out = new Map<string, CoucheReflets>();
  for (let k = 0; k * taille < eaux.length; k++) {
    const bande = eaux.slice(k * taille, (k + 1) * taille);
    const fin = bande.at(-1) ?? 0;
    const cases = bande
      .map((i) => gardee(vues, i, bande, fin, ponts, cache))
      .filter((c): c is Case => c !== undefined);
    const dernier = vues[fin];
    if (dernier?.type === "piece") out.set(dernier.piece.case.join(","), { k, cases });
  }
  return out;
}
