// Levels of detail of the iso map's sprites (L3-T06). Glide decodes a view-sized bitmap, which the
// camera then scales: sharp at zoom 1, soft above. Each level asks for a decode as large as the
// zoom it covers, capped at the source file, and is applied once the zoom has stopped inside it.

import { createContext } from "react";
import { HAUTEUR, LARGEUR, type Rect, ZOOM_MAX } from "./carteDemo";

/** Upper zoom bound of each level; the last is the camera's ceiling. Level 0 is the framing of a full village (zoom about 0.43). */
export const PALIERS_ZOOM: readonly number[] = [0.6, 1, 1.75, ZOOM_MAX];

/** A level is left only once the zoom is this far (relative) past its bound, so a pinch near a bound does not flip it. */
export const HYSTERESIS = 0.06;

/**
 * The zoom each level decodes for: its upper bound plus the hysteresis (the level stays active that
 * far past it), so levels 0 and 1 are never soft. Level 2 decodes the whole village and stops at its
 * bound to stay under 60 MiB: 5.7 % soft in its last stretch. The top one stops short of the
 * camera's ceiling: the densest screenful at 2.667 times the view size measures 80 MiB, at 2.2
 * under 60 (82 % as sharp). Level 3 stays soft above 2.2, up to the camera's 2.667.
 */
export const DECODE_ZOOM: readonly number[] = [0.6 * (1 + HYSTERESIS), 1 + HYSTERESIS, 1.75, 2.2];

const HAUT = PALIERS_ZOOM.length - 1;

/** The map area, in map dp, where sprites get the top level; null below it (every sprite does). */
export type Zone = Rect | null;
export type Detail = { palier: number; zone: Zone };

/** The level the sprites are decoded for; 0 until the camera says otherwise. */
export const PalierContext = createContext<Detail>({ palier: 0, zone: null });

/**
 * Dev probe (app/dev-iso.tsx only): told the size each sprite actually loaded at, the uri it asked
 * for and the one expo-image reports having loaded. Null in the village tab, where `Planche`
 * then registers no `onLoad`.
 */
export type Sonde = (id: string, w: number, h: number, demande: string, charge: string) => void;
export const SondeContext = createContext<Sonde | null>(null);

/**
 * The level for a zoom. During a pinch the level stays `courant`: it changes only once the zoom
 * rests, so a gesture re-renders nothing and decodes nothing.
 */
export function palierDe(zoom: number, courant: number, geste: boolean): number {
  "worklet";
  if (geste) return courant;
  const bas = PALIERS_ZOOM[courant - 1];
  const haut = PALIERS_ZOOM[courant];
  // Still inside the current level widened by the hysteresis: keep it.
  if (
    haut !== undefined &&
    zoom <= haut * (1 + HYSTERESIS) &&
    (bas === undefined || zoom > bas * (1 - HYSTERESIS))
  )
    return courant;
  const i = PALIERS_ZOOM.findIndex((z) => zoom <= z + 1e-6);
  return i < 0 ? PALIERS_ZOOM.length - 1 : i;
}

/** The decode size in px of a sprite shown `w` x `h` dp at a level, never above the source's own size. */
export function tailleDecode(
  palier: number,
  w: number,
  h: number,
  source: readonly [number, number],
  densite: number,
): { width: number; height: number } {
  const f = (DECODE_ZOOM[palier] ?? 1) * densite;
  const k = Math.min(1, source[0] / (w * f), source[1] / (h * f));
  return { width: Math.round(w * f * k), height: Math.round(h * f * k) };
}

/**
 * Memory caps the top level to what is on screen (the whole village at the top level is over 100
 * MiB). The zone is 1.25 viewports on each axis, centred on a bucket of a quarter viewport, so
 * it moves, and React re-renders, once per quarter-viewport of panning, not per frame.
 */
export function zoneDe(
  palier: number,
  ix: number,
  iy: number,
  zoom: number,
  w: number,
  h: number,
): Zone {
  "worklet";
  if (palier < HAUT) return null;
  const lw = w / zoom;
  const lh = h / zoom;
  return {
    x: (ix * lw) / 4 - 0.625 * lw,
    y: (iy * lh) / 4 - 0.625 * lh,
    w: 1.25 * lw,
    h: 1.25 * lh,
  };
}

/**
 * The camera's level and zone bucket as one number, so the UI thread compares numbers: it changes
 * only when the level or the bucket does. Buckets count from 0 at the map's centre, offset by 500.
 */
export function cleDetail(
  zoom: number,
  x: number,
  y: number,
  w: number,
  h: number,
  courant: number,
) {
  "worklet";
  const palier = palierDe(zoom, courant, false);
  if (palier < HAUT) return palier * 1e6;
  const ix = Math.round((LARGEUR / 2 - x / zoom) / (w / zoom / 4));
  const iy = Math.round((HAUTEUR / 2 - y / zoom) / (h / zoom / 4));
  return palier * 1e6 + (ix + 500) * 1e3 + (iy + 500);
}

/** What `cleDetail` stands for, at the zoom the camera has now. */
export function detailDe(cle: number, zoom: number, w: number, h: number): Detail {
  const palier = Math.floor(cle / 1e6);
  const ix = Math.floor((cle % 1e6) / 1e3) - 500;
  const iy = (cle % 1e3) - 500;
  return { palier, zone: zoneDe(palier, ix, iy, zoom, w, h) };
}

/** The level one sprite gets: the top level only where the zone reaches it, the plain decode elsewhere (off screen). */
export function palierPour(palier: number, zone: Zone, r: Rect): number {
  if (palier < HAUT) return palier;
  // Zone not known yet: the level below, which fits the memory budget for the whole village.
  if (!zone) return palier - 1;
  const dedans =
    r.x < zone.x + zone.w && r.x + r.w > zone.x && r.y < zone.y + zone.h && r.y + r.h > zone.y;
  return dedans ? palier : 1;
}
