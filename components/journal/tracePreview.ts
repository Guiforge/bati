import type { LngLat } from "@/src/gps/trace";

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
  const points = segments.flat();
  if (points.length < 2) return null;

  const lats = points.map(([, lat]) => lat);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const xs = points.map(([lon]) => lon * kx);
  const ys = lats;

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;

  // A run that never left one spot has no shape to draw. Not an error: a walk whose fixes all
  // landed inside the receiver's noise is a real row, it simply has nothing to say here.
  if (spanX === 0 && spanY === 0) return null;

  const box = size - padding * 2;
  // One scale for both axes, so the drawing is the route and not a route stretched to fill a
  // square. The smaller span is then centred in what is left over.
  const scale = box / Math.max(spanX, spanY);
  const offsetX = padding + (box - spanX * scale) / 2;
  const offsetY = padding + (box - spanY * scale) / 2;

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
