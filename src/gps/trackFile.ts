import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { LocationFix } from "@/modules/bati-location";
import { reportError } from "@/src/reportError";
import { toGpx } from "./gpx";

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

/** One flush per thirty fixes, so a kill costs at most thirty seconds of trace. */
export const FLUSH_EVERY = 30;

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
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/gpx+xml",
    dialogTitle: file.name,
    UTI: "public.xml",
  });
}

/** Every track recorded so far, newest first — a run is useless if it cannot be found again. */
export function listTracks(): File[] {
  const dir = tracksDir();
  if (!dir.exists) return [];
  return dir
    .list()
    .filter((entry): entry is File => entry instanceof File && entry.name.endsWith(".gpx"))
    .sort((a, b) => b.name.localeCompare(a.name));
}
