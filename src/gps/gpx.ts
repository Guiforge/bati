import type { LocationFix } from "@/modules/bati-location";
import { breaksRun } from "./track";

/**
 * A track, as GPX 1.1.
 *
 * Pure on purpose: the file writing lives with its caller, and the format — which is the part
 * that decides whether Strava, Garmin Connect or Komoot accept the file at all — is testable
 * without a device.
 *
 * Four details are what imports actually fail on, so they are the four this function is careful
 * about (docs/designs/gps-without-google.md, Export):
 *
 * 1. Every `trkpt` carries a `time`. A file without them imports as a shape with no pace.
 * 2. The child order is fixed by the XSD: `ele`, then `time`, then `extensions`. Out of order is
 *    invalid GPX, and the strict importers say so while the lenient ones quietly drop fields.
 * 3. The extension prefix is `gpxtpx`, not the `ns3` some exporters emit from a default-namespace
 *    binding — Garmin reads the prefix, not the URI it is bound to.
 * 4. Coordinates are plain decimals with no exponent. A longitude near zero rendered as `1e-7`
 *    parses as text and lands the track in the Gulf of Guinea.
 */
export type TrackMeta = {
  name: string;
  /** Bati's own idea of the distance, in metres — the sum the app kept while recording. */
  totalDistanceM?: number;
};

const GPX_OPEN =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<gpx version="1.1" creator="Bati" xmlns="http://www.topografix.com/GPX/1/1" ' +
  'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">';

/** Six decimals is ~0.1 m at this latitude, and never renders in exponent form. */
function coord(value: number): string {
  return value.toFixed(6);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function point(fix: LocationFix): string {
  const parts = [`    <trkpt lat="${coord(fix.lat)}" lon="${coord(fix.lon)}">`];
  // Order is the XSD's, not ours.
  if (fix.ele !== null) parts.push(`      <ele>${fix.ele.toFixed(1)}</ele>`);
  parts.push(`      <time>${new Date(fix.t).toISOString()}</time>`);
  if (fix.speed !== null) {
    parts.push(
      "      <extensions><gpxtpx:TrackPointExtension>" +
        `<gpxtpx:speed>${fix.speed.toFixed(2)}</gpxtpx:speed>` +
        "</gpxtpx:TrackPointExtension></extensions>",
    );
  }
  parts.push("    </trkpt>");
  return parts.join("\n");
}

export function toGpx(fixes: readonly LocationFix[], meta: TrackMeta): string {
  const distance =
    meta.totalDistanceM === undefined
      ? ""
      : `\n    <desc>Bati distance: ${Math.round(meta.totalDistanceM)} m</desc>`;
  // One <trkseg> per stretch the reducer was willing to count, split on the same rule the map
  // draws with. A single segment across a ten-minute tunnel is a claim, in every app that opens
  // this file, that the hero walked through the hill.
  const segments: string[][] = [];
  let current: string[] = [];
  let previousAt: number | null = null;
  for (const fix of fixes) {
    if (breaksRun(fix, previousAt) && current.length > 0) {
      segments.push(current);
      current = [];
    }
    current.push(point(fix));
    previousAt = fix.t;
  }
  if (current.length > 0) segments.push(current);

  return [
    GPX_OPEN,
    "  <trk>",
    `    <name>${escapeXml(meta.name)}</name>${distance}`,
    ...segments.flatMap((seg) => ["    <trkseg>", ...seg, "    </trkseg>"]),
    "  </trk>",
    "</gpx>",
    "",
  ].join("\n");
}
