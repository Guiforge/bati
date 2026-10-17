import { metresBetween } from "./track";

/**
 * Recognising, on the phone, that an outing follows a route the hero already did. Pure: the
 * history read is `routeCandidates` in `db/gps.ts`, the drawing is the live map and the recap.
 * Nothing here is stored or sent; a shape is a past outing's points, thinned.
 *
 * "Route ghost" and not "ghost": `ghost` already means what the hero did on a movement last time.
 */

export type RoutePoint = { lat: number; lon: number };
export type RouteShape = { id: string; performedAt: Date; points: RoutePoint[] };
export type RouteGhostLine = { id: string; line: GeoJSON.Feature<GeoJSON.LineString> };

export const ROUTE = {
  stride: 5, // every 5th stored fix
  startM: 200, // first fixes this close start together
  cellM: 50, // corridor cell
  share: 0.85, // of sampled points inside the corridor
  liveMinM: 400, // credited metres before the live map looks for a route
  candidates: 20, // newest outings ever loaded, whatever the history
  sample: 300, // points a share is computed on, evenly picked
  minPoints: 10, // a shape shorter than this is never a route
} as const;

type Grid = { dLat: number; dLon: number; cells: Set<number> };
const KEY = 4_194_304; // 2^22: unique while |j| < 2^21, which a 50 m grid never reaches

/** Built once per shape: a candidate is tested every five seconds on the live map. */
const grids = new WeakMap<readonly RoutePoint[], Grid>();

const cellKey = (i: number, j: number) => i * KEY + j;

/**
 * The cells a shape covers, on a grid anchored at its own first latitude. Every segment is
 * densified at half a cell, so a ride's 40 m gaps and a tunnel's gap leave no hole.
 */
function gridOf(points: readonly RoutePoint[]): Grid {
  const known = grids.get(points);
  if (known) return known;
  const dLat = ROUTE.cellM / 111_320;
  const dLon = dLat / Math.cos(((points[0]?.lat ?? 0) * Math.PI) / 180);
  const cells = new Set<number>();
  const add = (lat: number, lon: number) =>
    cells.add(cellKey(Math.floor(lat / dLat), Math.floor(lon / dLon)));
  let prev: RoutePoint | undefined;
  for (let n = 0; n < points.length; n++) {
    const p = points[n];
    if (!p) continue;
    add(p.lat, p.lon);
    if (prev) {
      const steps = Math.ceil(Math.hypot((p.lat - prev.lat) / dLat, (p.lon - prev.lon) / dLon) * 2);
      for (let s = 1; s < steps; s++) {
        add(
          prev.lat + ((p.lat - prev.lat) * s) / steps,
          prev.lon + ((p.lon - prev.lon) * s) / steps,
        );
      }
    }
    prev = p;
  }
  const grid = { dLat, dLon, cells };
  grids.set(points, grid);
  return grid;
}

/** In one of the 3 x 3 cells around a covered one: guaranteed under 50 m, never past 100 m. */
function near(grid: Grid, p: RoutePoint): boolean {
  const i = Math.floor(p.lat / grid.dLat);
  const j = Math.floor(p.lon / grid.dLon);
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) if (grid.cells.has(cellKey(i + di, j + dj))) return true;
  }
  return false;
}

/** The part of `points` (at most `ROUTE.sample` of them, evenly picked) that lies near `of`. */
function shareNear(points: readonly RoutePoint[], of: readonly RoutePoint[]): number {
  const n = points.length;
  if (n === 0) return 0;
  const grid = gridOf(of);
  const taken = Math.min(n, ROUTE.sample);
  let hits = 0;
  for (let k = 0; k < taken; k++) {
    const p = points[Math.floor((k * n) / taken)];
    if (p && near(grid, p)) hits++;
  }
  return hits / taken;
}

export function startsTogether(a: RoutePoint, b: RoutePoint): boolean {
  return metresBetween(a, b) <= ROUTE.startM;
}

/** Every `ROUTE.stride`th point, from the first. Today's fixes go through it before matching. */
export function strided<T>(points: readonly T[]): T[] {
  return points.filter((_, i) => i % ROUTE.stride === 0);
}

/**
 * The newest candidate today follows, or null; `candidates` newest first. `live`: today is
 * partial, so only today-in-shape is tested. `done`: the shape must follow today too, which
 * refuses half of a loop, or a long run that shares its first kilometres with a short one.
 * Direction is ignored: a ghost is a line.
 */
export function routeGhostOf(
  today: readonly RoutePoint[],
  candidates: readonly RouteShape[],
  mode: "live" | "done",
): RouteShape | null {
  if (today.length < ROUTE.minPoints) return null;
  for (const c of candidates) {
    if (c.points.length < ROUTE.minPoints) continue;
    if (shareNear(today, c.points) < ROUTE.share) continue;
    if (mode === "done" && shareNear(c.points, today) < ROUTE.share) continue;
    return c;
  }
  return null;
}

/**
 * When the live map may draw a past route. Never during a walk-run: the coach paces it by talking,
 * and a past route is the first step towards a past time.
 * ponytail: the running oath of A-04 does not exist yet (db/oaths.ts has no running metric; its
 * `leagues` oath is a lifetime distance, not a pace). A-04 adds its check here, in this one place.
 */
export function routeGhostAllowed(view: { routeGhost: boolean; walkRun: boolean }): boolean {
  return view.routeGhost && !view.walkRun;
}

export function toGhostLine(shape: RouteShape | null): RouteGhostLine | null {
  if (!shape) return null;
  return {
    id: shape.id,
    line: {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: shape.points.map((p) => [p.lon, p.lat]) },
    },
  };
}
