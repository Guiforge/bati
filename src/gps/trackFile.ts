import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { LocationFix } from "@/modules/bati-location";
import { reportError } from "@/src/reportError";
import { toGpx } from "./gpx";
import { accept, EMPTY } from "./track";

/**
 * The recorded track, on disk.
 *
 * Written during the run rather than at the end, because the run is the part where the app can
 * be killed: an OEM task killer, a low-memory kill, or a hero swiping the app away all lose
 * whatever only ever lived in memory. A rewrite of the whole file every flush rather than an
 * append — 45 minutes at 1 Hz is about 250 kB, which is nothing to write every thirty seconds,
 * and a whole-file write can never leave a half-line behind for the parser to choke on.
 *
 * ponytail: rewrite-in-full, fine to a few hours of tracking. If a session ever runs long enough
 * for the rewrite to show up in a frame time, switch to an append handle and own the crash
 * recovery that comes with it.
 */
const DIR = "gps-tracks";

function tracksDir(): Directory {
  const dir = new Directory(Paths.document, DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function trackFileFor(startedAt: number): File {
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new File(tracksDir(), `bati-${stamp}.gpx`);
}

/** Overwrites the file with everything recorded so far. Safe to call as often as you like. */
export function flushTrack(file: File, fixes: readonly LocationFix[], distanceM: number): void {
  try {
    if (!file.exists) file.create({ intermediates: true, overwrite: true });
    file.write(toGpx(fixes, { name: file.name, totalDistanceM: distanceM }));
  } catch (error) {
    // Losing the trace is the whole failure this function exists to prevent, so it is never
    // swallowed: a run that silently wrote nothing is worse than one that says it could not.
    reportError("gps.flushTrack", error);
  }
}

/** Hands the file to the share sheet, which is how it reaches Strava or a laptop. */
export async function shareTrack(file: File): Promise<void> {
  // Thrown, not returned: a button that does nothing at all reads as broken, and the caller has
  // a message for a GPX that could not be handed over.
  if (!(await Sharing.isAvailableAsync())) throw new Error("No share sheet available");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/gpx+xml",
    dialogTitle: file.name,
    UTI: "public.xml",
  });
}

/**
 * A finished run, as a GPX in the share sheet.
 *
 * The one door for the recap and the share screen. The name comes from the first fix, so it says
 * when the outing happened and re-exporting the same one overwrites its own file instead of
 * littering. The distance in its header is measured from the file's own fixes, the way the panel
 * measured them: a GPX describes what is inside it, so a batch that never reached the table must
 * not be in its header either.
 */
export async function exportTrack(fixes: readonly LocationFix[]): Promise<void> {
  const first = fixes[0];
  if (!first) return;
  const file = trackFileFor(first.t);
  flushTrack(file, fixes, fixes.reduce(accept, EMPTY).distanceM);
  await shareTrack(file);
}
