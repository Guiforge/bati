import type { LocationFix } from "@/modules/bati-location";
import { breaksRun } from "./track";

/**
 * The stored fixes, as the two things a map needs: a line to draw and a box to frame it in.
 *
 * Pure, so the shape of a run is testable without a phone, a tile or a renderer — which matters
 * more here than usual, because nothing in this file has ever been seen on a device.
 *
 * It calls `breaksRun` rather than owning a threshold of its own: `accept` refuses to count what
 * that rule rejects, and a picture that then draws a straight line across the gap tells the hero
 * they ran through it. The reducer and the trace break the run in the same places or they are two
 * answers to one question, which is what happened the day the reducer learned about holes in time
 * and this file only knew about jumps in space.
 */

/** `[longitude, latitude]`, MapLibre's order — never the other way round. */
export type LngLat = [number, number];

export type Trace = {
  /** One `LineString` per segment, split where the reducer refused a jump. */
  line: GeoJSON.Feature<GeoJSON.MultiLineString>;
  /** `[west, south, east, north]`, which is what `Camera`'s `bounds` prop takes. */
  bounds: [number, number, number, number] | null;
  start: LngLat | null;
  end: LngLat | null;
};

/**
 * Half the smallest box the camera is asked to frame, in degrees — about 5 m of latitude.
 *
 * A hero who starts a session and stops on the spot leaves one point, or several within a metre
 * of each other, and a zero-area bounding box is not a viewport: it asks the camera to fit
 * nothing, which is a division by zero somewhere in `fitBounds`. Widening the box is the answer
 * that needs no special case in the screen.
 */
const MIN_HALF_SPAN_DEG = 0.00005;

export function toTrace(fixes: readonly LocationFix[]): Trace {
  const segments: LngLat[][] = [];
  let current: LngLat[] = [];
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  let previousAt: number | null = null;
  for (const fix of fixes) {
    if (breaksRun(fix, previousAt) && current.length > 0) {
      segments.push(current);
      current = [];
    }
    previousAt = fix.t;
    current.push([fix.lon, fix.lat]);
    west = Math.min(west, fix.lon);
    east = Math.max(east, fix.lon);
    south = Math.min(south, fix.lat);
    north = Math.max(north, fix.lat);
  }
  if (current.length > 0) segments.push(current);

  const first = fixes[0];
  const last = fixes.at(-1);

  return {
    line: {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiLineString", coordinates: segments },
    },
    bounds: first
      ? [
          Math.min(west, east - MIN_HALF_SPAN_DEG * 2),
          Math.min(south, north - MIN_HALF_SPAN_DEG * 2),
          Math.max(east, west + MIN_HALF_SPAN_DEG * 2),
          Math.max(north, south + MIN_HALF_SPAN_DEG * 2),
        ]
      : null,
    start: first ? [first.lon, first.lat] : null,
    end: last ? [last.lon, last.lat] : null,
  };
}
