// Pure bounds of the iso map's camera (pan, pinch, double-tap). Worklets: the gestures call them
// on the UI thread, so they close over nothing but their arguments.

import type { Vue } from "./carteDemo";

/** The island's box in dp at zoom 1; `ileCentree` makes it relative to the map's centre. */
export type Ile = { x0: number; x1: number; y0: number; y1: number };

export type Limites = {
  /** Relative to the map's centre, the camera's pivot. */
  ile: Ile;
  /** The area the camera looks through, in dp. */
  w: number;
  h: number;
  zmin: number;
  zmax: number;
};

/**
 * The share of the area the island always keeps in view (L6-T17): its edge may be dragged until a
 * half of the area, or all of the island when it is narrower, is left, so the forest beyond its rim
 * can be looked at. The rim goes `1 - PART_ILE` of the way across: 50 % (was 75 %: a frame of bare
 * world, audit of 31/10). monde.ts `etendue` reads the same constant to size what is painted.
 */
export const PART_ILE = 0.5;

/**
 * The box the pan bounds keep in view: the middle half of the island's box (a quarter of its width
 * and height inset on each side). The island is a diamond, not its box: a corner of the box holds
 * no land, so bounds on the whole box let the frame rest on bare forest (qa-audit1, 31/10). Any
 * point of the middle half of a diamond is on it, so keeping part of this box in view keeps land.
 */
export function ileJouable(ile: Ile): Ile {
  const [dx, dy] = [(ile.x1 - ile.x0) / 4, (ile.y1 - ile.y0) / 4];
  return { x0: ile.x0 + dx, x1: ile.x1 - dx, y0: ile.y0 + dy, y1: ile.y1 - dy };
}

/**
 * The camera's limits, the one place they are made (useCameraIso and the tests call it): the
 * island's box `ile` (map dp, from its top left), the map's size, the area `w` x `h`, the game's zoom
 * floor `zoom.min` (never above `zoom.cadre`, the framing, so the whole island can always be seen).
 */
export function limitesDe(
  ile: Ile,
  carte: { largeur: number; hauteur: number },
  aire: { w: number; h: number },
  zoom: { min: number; max: number; cadre: number },
): Limites {
  return {
    ile: ileJouable(ileCentree(ile, carte.largeur, carte.hauteur)),
    w: aire.w,
    h: aire.h,
    zmin: Math.min(zoom.min, zoom.cadre),
    zmax: zoom.max,
  };
}

/** Shifts for which the island, scaled by `zoom`, keeps `PART_ILE` of the area (or all of itself) in view. */
function axe(lo: number, hi: number, zoom: number, taille: number): [number, number] {
  "worklet";
  const q = Math.min(PART_ILE * taille, zoom * (hi - lo));
  return [q - taille / 2 - zoom * hi, taille / 2 - q - zoom * lo];
}

/** The pan range at `zoom`: a piece of the island, a quarter of the area at least, always stays in view. */
export function bornesPan(zoom: number, l: Limites) {
  "worklet";
  const [xMin, xMax] = axe(l.ile.x0, l.ile.x1, zoom, l.w);
  const [yMin, yMax] = axe(l.ile.y0, l.ile.y1, zoom, l.h);
  return { xMin, xMax, yMin, yMax };
}

/** `v` with its zoom held in [zmin, zmax] and its pan brought back into the range at that zoom. */
export function ramener(v: Vue, l: Limites): Vue {
  "worklet";
  const zoom = Math.min(l.zmax, Math.max(l.zmin, v.zoom));
  const b = bornesPan(zoom, l);
  return {
    zoom,
    x: Math.min(b.xMax, Math.max(b.xMin, v.x)),
    y: Math.min(b.yMax, Math.max(b.yMin, v.y)),
  };
}

/** An island box moved to be relative to a map of `largeur` x `hauteur` dp. */
export function ileCentree(ile: Ile, largeur: number, hauteur: number): Ile {
  return {
    x0: ile.x0 - largeur / 2,
    x1: ile.x1 - largeur / 2,
    y0: ile.y0 - hauteur / 2,
    y1: ile.y1 - hauteur / 2,
  };
}

/**
 * `v` zoomed by `k` about `focal` (dp from the area's centre, e.g. the point between two fingers):
 * the map point under it stays under it. `k` is applied after the zoom bound, so a pinch against
 * the bound does not drag the map along; `ramener` then holds the island in view.
 */
export function zoomerAutour(v: Vue, focal: { x: number; y: number }, k: number, l: Limites): Vue {
  "worklet";
  const zoom = Math.min(l.zmax, Math.max(l.zmin, v.zoom * k));
  const reel = zoom / v.zoom;
  return ramener(
    { zoom, x: focal.x - (focal.x - v.x) * reel, y: focal.y - (focal.y - v.y) * reel },
    l,
  );
}

/**
 * A point of the area (dp from its top left, as a tap reports it) to the map's own dp: undoes the
 * camera, a scale about the map's centre then a shift, the map being centred in the area.
 */
export function carteDepuisEcran(
  p: readonly [x: number, y: number],
  v: Vue,
  aire: { w: number; h: number },
  carte: { largeur: number; hauteur: number },
): [number, number] {
  "worklet";
  return [
    (p[0] - aire.w / 2 - v.x) / v.zoom + carte.largeur / 2,
    (p[1] - aire.h / 2 - v.y) / v.zoom + carte.hauteur / 2,
  ];
}

/** The inverse of `carteDepuisEcran`: a map point (dp) to the area, where the camera shows it. */
export function ecranDepuisCarte(
  p: readonly [x: number, y: number],
  v: Vue,
  aire: { w: number; h: number },
  carte: { largeur: number; hauteur: number },
): [number, number] {
  return [
    (p[0] - carte.largeur / 2) * v.zoom + aire.w / 2 + v.x,
    (p[1] - carte.hauteur / 2) * v.zoom + aire.h / 2 + v.y,
  ];
}

/**
 * The view to keep when the area changes size (a rotation, a title that grows). The camera pivots
 * on the area's centre, so the same `v` still looks at the same point of the map: it is only held
 * inside the new limits. A view never touched (still the old framing) takes the new framing, so an
 * untouched island still fits once turned.
 */
export function vueApresRedimension(v: Vue, ancienCadre: Vue, nouveauCadre: Vue, l: Limites): Vue {
  const intacte =
    Math.abs(v.zoom - ancienCadre.zoom) < 1e-3 &&
    Math.abs(v.x - ancienCadre.x) < 0.5 &&
    Math.abs(v.y - ancienCadre.y) < 0.5;
  return intacte ? nouveauCadre : ramener(v, l);
}
