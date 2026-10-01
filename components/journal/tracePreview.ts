import type { LngLat } from "@/src/gps/trace";
import { metresBetween } from "@/src/gps/track";

/**
 * Where a run sits in a square of `size`: the cosine, the scale and the offsets every point is
 * placed with. Null when there is nothing to frame. One function for the line and for the map
 * under it (`traceBounds`), so the two cannot frame the same run differently.
 */
function frameOf(points: readonly LngLat[], size: number, padding: number) {
  if (points.length < 2) return null;

  const lats = points.map(([, lat]) => lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const xs = points.map(([lon]) => lon * kx);
  const minX = Math.min(...xs);
  const minY = Math.min(...lats);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...lats) - minY;

  // A run that never left one spot has no shape to draw. Not an error: a walk whose fixes all
  // landed inside the receiver's noise is a real row, it simply has nothing to say here.
  if (spanX === 0 && spanY === 0) return null;

  const box = size - padding * 2;
  // One scale for both axes, so the drawing is the route and not a route stretched to fill a
  // square. The smaller span is then centred in what is left over.
  const scale = box / Math.max(spanX, spanY);
  const offsetX = padding + (box - spanX * scale) / 2;
  const offsetY = padding + (box - spanY * scale) / 2;
  return { kx, minX, minY, spanY, scale, offsetX, offsetY };
}

/**
 * A run's shape, fitted to a square, as an SVG path.
 *
 * The journal's covers are the quest's art, and the three seeded outings share three pictures:
 * a page of walks was a column of identical thumbnails with the title as the only thing telling
 * them apart. That is the complaint `SessionCard` already records about the gold trophy every row
 * used to draw, one screen further on. A run's own line is the one thing about it that is never
 * the same twice, so it is what a walk is remembered by.
 *
 * Longitude is scaled by `cos(latitude)` before anything else. A degree of longitude is a degree
 * of latitude times that cosine, and at 48° north it is two thirds as wide — without it, every
 * French run is drawn a third too wide and an out-and-back up a hill reads as a diagonal.
 * The cosine is taken at the run's own middle, which over the few kilometres a thumbnail covers
 * is exact enough that no pixel moves.
 *
 * Pure, and given `size` rather than reading a layout: the caller draws it into a `viewBox`, so
 * this never needs to know the density it lands on.
 */
export function traceToPath(
  segments: readonly (readonly LngLat[])[],
  size: number,
  padding = 4,
): string | null {
  const frame = frameOf(segments.flat(), size, padding);
  if (frame === null) return null;
  const { kx, minX, minY, spanY, scale, offsetX, offsetY } = frame;

  // One `M` per segment, never a single chain.
  //
  // A segment is a stretch the reducer was willing to credit, and the space between two of them
  // is a tunnel, a dead battery or a phone that lost the sky. Drawing straight through it is the
  // exact failure `src/gps/trace.ts` documents at the top of its own file: the picture then tells
  // the hero they went through the hill. The caller does the breaking, because `breaksRun` is the
  // one rule that decides it and this file is a renderer.
  return segments
    .filter((segment) => segment.length > 0)
    .map((segment) =>
      segment
        .map(([lon, lat], i) => {
          const x = offsetX + (lon * kx - minX) * scale;
          // SVG's y grows downwards and latitude grows north, so the axis is flipped here rather
          // than by a transform on the element: a path nobody has to read a matrix to understand.
          const y = offsetY + (spanY - (lat - minY)) * scale;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" "),
    )
    .join(" ");
}

/**
 * The ground a square of `size` shows around the run, as `[west, south, east, north]`, for the
 * static map drawn under `traceToPath`'s line (`src/gps/mapThumb.ts`).
 *
 * The square, not the run's own box: MapLibre fits the bounds it is given to the whole image, and
 * the line is fitted inside `padding` and centred on its short axis. Handing it the square the
 * line was drawn in makes both use one scale and one centre, so the line lands on its roads.
 * Web Mercator and the cosine above agree to well under a pixel over the few kilometres a
 * thumbnail spans.
 */
export function traceBounds(
  segments: readonly (readonly LngLat[])[],
  size: number,
  padding = 4,
): [number, number, number, number] | null {
  const frame = frameOf(segments.flat(), size, padding);
  if (frame === null) return null;
  const { kx, minX, minY, spanY, scale, offsetX, offsetY } = frame;
  // Invert the placement at the square's corners: x = offsetX + (lon * kx - minX) * scale.
  const west = (minX - offsetX / scale) / kx;
  const east = (minX + (size - offsetX) / scale) / kx;
  // y = offsetY + (spanY - (lat - minY)) * scale, so y = 0 is the north edge.
  const north = minY + spanY + offsetY / scale;
  const south = minY + spanY - (size - offsetY) / scale;
  return [west, south, east, north];
}

/**
 * The margin a thumbnail leaves around its line, a tenth of its side. Four pixels at any size
 * pressed a 64 dp line against its frame until it read as cropped. The map under the line is
 * framed with the same margin (`src/gps/mapThumb.ts`), so both ask this.
 */
export function thumbPadding(size: number): number {
  return Math.round(size / 10);
}

/** Where a picture of a run from the front door stops showing the door. */
export const HIDDEN_ENDS_M = 200;

/**
 * The run without its first and last `metres`, for a picture someone else will see.
 *
 * A walk starts and ends where the hero lives, and a map under the full line says exactly where
 * that is. Strava hides the same stretch for the same reason. Measured along the line, so a loop
 * that leaves the door and comes back loses the street in front of it at both ends. A run shorter
 * than twice the margin keeps nothing, which draws no line rather than a dot on a house.
 */
export function trimEnds(
  segments: readonly (readonly LngLat[])[],
  metres: number,
): (readonly LngLat[])[] {
  const along = (a: LngLat, b: LngLat) =>
    metresBetween({ lon: a[0], lat: a[1] }, { lon: b[0], lat: b[1] });
  const points = segments.flatMap((segment, s) => segment.map((p) => ({ p, s })));
  let start = 0;
  for (let gone = 0; start < points.length - 1 && gone < metres; start++) {
    gone += along(points[start]?.p ?? [0, 0], points[start + 1]?.p ?? [0, 0]);
  }
  let end = points.length - 1;
  for (let gone = 0; end > start && gone < metres; end--) {
    gone += along(points[end]?.p ?? [0, 0], points[end - 1]?.p ?? [0, 0]);
  }
  const kept = points.slice(start, end + 1);
  // Back into the segments they came from, so a gap stays a gap.
  const out: LngLat[][] = [];
  let current = -1;
  for (const { p, s } of kept) {
    if (s !== current) {
      out.push([]);
      current = s;
    }
    out[out.length - 1]?.push(p);
  }
  return out.filter((segment) => segment.length > 1);
}
