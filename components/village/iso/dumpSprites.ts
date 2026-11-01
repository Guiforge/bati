// The sprite dump (dev-iso `?dump=<name>`): every sprite the map draws, in screen pixels at the
// captured camera, for scripts/iso/loupe_checks.py and loupe_crop.py (format in loupe_checks.py's
// header). Dev route only: without the param no collector is provided, `useDump` reads a null
// context and returns, and nothing here runs.
//
// How it works: each drawing site (Planche, the painted surroundings, the wall, the statue, the
// flames, the world's forest tiles) tells the collector its box in the space it draws in, as a
// plain string (an effect, no re-render); app/dev-iso.tsx reads the camera once the map has settled
// and calls `construireDump`. The pure part (ids, projection) is below and is what the test covers.

import { createContext, useContext, useEffect, useId } from "react";
import { COTE, HAUTEUR, LARGEUR } from "./carteDemo";
import type { SpriteIso } from "./isoSpec";
import { MAQUETTES } from "./maquettes";

/**
 * One sprite as its drawing site sees it. Map sprites are in map dp (the space of `ecranXY`), a
 * `screenFixed` one in dp from the top left of the map area (it does not move with the camera).
 */
export type EntreeDump = {
  /** Asset-derived and stable: two uses of one asset share it. */
  id: string;
  /** Free label of the drawing layer (building, decor, forest, field, prop, wall, flame, ...). */
  layer: string;
  x: number;
  y: number;
  w: number;
  h: number;
  flip: boolean;
  /** The foot, in the same space as the box: the point that stands on `tileI, tileJ`. */
  pied: readonly [x: number, y: number];
  /** Flames only: the id of the hearth, brazier, torch or lantern that holds it. */
  container?: string;
  screenFixed?: boolean;
};

/** What the collector holds: a registration key (React's useId + index) to the entry as JSON. */
export type Collecteur = Map<string, string>;

export const DumpContext = createContext<Collecteur | null>(null);

/**
 * Registers sprites while mounted. The thunk runs only when a collector is provided, so a map
 * without `?dump=` pays one context read per sprite and builds nothing.
 */
export function useDump(entrees: () => EntreeDump | readonly (EntreeDump | null)[] | null) {
  const collecteur = useContext(DumpContext);
  const uid = useId();
  const liste = collecteur ? entrees() : null;
  const cle = liste ? JSON.stringify(liste) : null;
  useEffect(() => {
    if (!collecteur || cle === null) return;
    const lues: (EntreeDump | null)[] = [JSON.parse(cle)].flat();
    const cles = lues.flatMap((e, k) => (e ? [[`${uid}:${k}`, JSON.stringify(e)] as const] : []));
    for (const [k, v] of cles) collecteur.set(k, v);
    return () => {
      for (const [k] of cles) collecteur.delete(k);
    };
  }, [collecteur, uid, cle]);
}

// --- Ids -----------------------------------------------------------------------------------------

/** `forge/solid.nuit.webp` and `forge/solid.webp` are one asset to a dump: `forge/solid`. */
export const idAsset = (cle: string): string =>
  cle.replace(/\.webp$/, "").replace(/\.(nuit|jour)$/, "");

let parImage: Map<number, string> | undefined;
/** The id of a sprite's image, by reverse lookup in the mock-up index; null when it is not in it. */
export function nomAsset(image: number): string | null {
  if (!parImage) {
    parImage = new Map();
    for (const [cle, s] of Object.entries(MAQUETTES))
      if (!parImage.has(s.image)) parImage.set(s.image, idAsset(cle));
  }
  return parImage.get(image) ?? null;
}

/** The layer a `Planche` belongs to, from its testID. */
export function coucheDe(testID: string): string {
  const t = testID.replace(/^iso-/, "");
  if (/^(maquette|ailes)/.test(t)) return "building";
  if (/^(piece|lisiere|chute)/.test(t)) return "decor";
  if (/^figurine/.test(t)) return "prop";
  if (/^animal/.test(t)) return "animal";
  if (/^(marcheur|habitant)/.test(t)) return "villager";
  if (/^echafaudage/.test(t)) return "scaffold";
  return "sprite";
}

/** The id when the image is not in the index: the testID without its coordinates, never an asset number. */
const idSecours = (testID: string) => testID.replace(/^iso-/, "").replace(/(-\d+)+$/, "");

type Boite = { x: number; y: number; w: number; h: number };

/** What `Planche` tells the collector; null for what is not drawn (hidden, or a darkening overlay of another entry). */
export function entreePlanche(p: {
  s: SpriteIso | undefined;
  rect: Boite | null;
  /** The rect on the map when `rect` is local to a parent node. */
  ancre?: Boite;
  miroir: boolean;
  /** Drawn at this share of its size about its anchor. */
  reduit: number;
  invisible: boolean;
  testID: string;
}): EntreeDump | null {
  const { s, miroir, reduit, testID } = p;
  const r = p.ancre ?? p.rect;
  if (!s || !r || p.invisible || testID.startsWith("iso-assombri")) return null;
  const [ax, ay] = [r.x + (s.anchor[0] * r.w) / s.size[0], r.y + (s.anchor[1] * r.h) / s.size[1]];
  return {
    id: nomAsset(s.image) ?? idSecours(testID),
    layer: coucheDe(testID),
    x: ax + (r.x - ax) * reduit,
    y: ay + (r.y - ay) * reduit,
    w: r.w * reduit,
    h: r.h * reduit,
    flip: miroir,
    pied: [ax, ay],
  };
}

// --- Projection ----------------------------------------------------------------------------------

export type VueDump = { zoom: number; x: number; y: number };
/** The map area on the screen, dp: its top left (measureInWindow) and its size. */
export type AireDump = { x: number; y: number; w: number; h: number };

/**
 * The camera the checks need. The map is a node of LARGEUR x HAUTEUR dp centred in the area, scaled
 * about its centre by `zoom` then shifted by (x, y) (useCameraIso, navigation.ts `ecranDepuisCarte`),
 * so the corner (i, j) of the grid lands at
 *   x = ((i - j) * COTE / 2 * zoom + area.w / 2 + vue.x + area.x) * dpr
 *   y = ((i + j) * COTE / 4 * zoom + area.h / 2 + vue.y + area.y - HAUTEUR / 2 * zoom) * dpr
 * which is the header's formula with tileW = COTE, tileH = COTE / 2, zoom = vue.zoom * dpr.
 */
export function cameraDump(
  vue: VueDump,
  aire: AireDump,
  dpr: number,
  ecran: { w: number; h: number },
) {
  const zoom = vue.zoom * dpr;
  return {
    zoom,
    tx: (aire.w / 2 + vue.x + aire.x) * dpr,
    ty: (aire.h / 2 + vue.y + aire.y) * dpr - (HAUTEUR / 2) * zoom,
    tileW: COTE,
    tileH: COTE / 2,
    screenW: Math.round(ecran.w * dpr),
    screenH: Math.round(ecran.h * dpr),
  };
}

/** The grid tile under a map point (dp), the inverse of `ecranXY`; a corner belongs to the tile behind it. */
export function tuileDe(x: number, y: number): [number, number] {
  const u = (x - LARGEUR / 2) / COTE;
  const v = (2 * y) / COTE;
  const bas = (n: number) => Math.floor(Math.round(n * 1e6) / 1e6 - 1e-6);
  return [bas(v + u), bas(v - u)];
}

const arrondi = (n: number, d = 10) => Math.round(n * d) / d;

/** A collected entry in screen pixels at `vue`, with the tile its foot stands on and its depth. */
export function versPixels(e: EntreeDump, vue: VueDump, aire: AireDump, dpr: number) {
  const z = vue.zoom;
  // A fixed sprite is in area dp; its foot on the map is where the camera would put it.
  const carte = (p: readonly [number, number]) =>
    e.screenFixed
      ? [
          (p[0] - aire.w / 2 - vue.x) / z + LARGEUR / 2,
          (p[1] - aire.h / 2 - vue.y) / z + HAUTEUR / 2,
        ]
      : p;
  const [ox, oy] = e.screenFixed
    ? [(e.x + aire.x) * dpr, (e.y + aire.y) * dpr]
    : [
        ((e.x - LARGEUR / 2) * z + aire.w / 2 + vue.x + aire.x) * dpr,
        ((e.y - HAUTEUR / 2) * z + aire.h / 2 + vue.y + aire.y) * dpr,
      ];
  const k = e.screenFixed ? dpr : z * dpr;
  const [fx, fy] = carte(e.pied);
  const [tileI, tileJ] = tuileDe(fx ?? 0, fy ?? 0);
  return {
    id: e.id,
    layer: e.layer,
    x: arrondi(ox),
    y: arrondi(oy),
    w: arrondi(e.w * k),
    h: arrondi(e.h * k),
    flip: e.flip,
    tileI,
    tileJ,
    // Depth on the grid (the painter's order), a fixed layer in front of everything.
    z: e.screenFixed ? 1000 : arrondi(((fy ?? 0) * 4) / COTE, 1000),
    ...(e.container ? { container: e.container } : {}),
    ...(e.screenFixed ? { screenFixed: true } : {}),
  };
}

export function construireDump(
  entrees: readonly EntreeDump[],
  vue: VueDump,
  aire: AireDump,
  dpr: number,
  ecran: { w: number; h: number },
) {
  const sprites = entrees
    .map((e) => versPixels(e, vue, aire, dpr))
    .sort((a, b) => a.z - b.z || a.id.localeCompare(b.id) || a.x - b.x);
  return { camera: cameraDump(vue, aire, dpr, ecran), sprites };
}

// --- Out -----------------------------------------------------------------------------------------

/** A logcat line holds about 4000 bytes; the dump is ASCII, so characters are bytes. */
const LIGNE_MAX = 3000;

/** `ISO_DUMP <name> <k>/<n> <chunk>` lines; scripts/iso/loupe_dump_pull.py joins them back. */
export function lignesDump(nom: string, dump: unknown): string[] {
  const json = JSON.stringify(dump);
  const n = Math.ceil(json.length / LIGNE_MAX);
  return Array.from(
    { length: n },
    (_, k) => `ISO_DUMP ${nom} ${k + 1}/${n} ${json.slice(k * LIGNE_MAX, (k + 1) * LIGNE_MAX)}`,
  );
}

/**
 * Writes the dump to logcat, tag ReactNativeJS, level E: `console.error` is the one console call
 * babel.config.js keeps in a release build, and logcat is what plain adb reads from a build that
 * is not debuggable (no run-as). Dev route only.
 */
export function ecrireDump(nom: string, dump: unknown) {
  for (const ligne of lignesDump(nom, dump)) console.error(ligne);
}
