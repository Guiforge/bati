import { StaticMapImageManager } from "@maplibre/maplibre-react-native";
import { Directory, File, Paths } from "expo-file-system";
import { thumbPadding, traceBounds } from "@/components/journal/tracePreview";
import { mapStyle } from "@/constants/mapStyle";
import { isNetworkBlocked } from "@/modules/bati-location";
import { useSettingsStore } from "@/stores/settings";
import type { LngLat } from "./trace";

/**
 * The basemap under a run's line, as a PNG on disk, drawn once per run and size.
 *
 * A virtualized list cannot mount a MapLibre view per row (`TraceThumb`), but MapLibre's
 * snapshotter renders one off screen into a bitmap, and a bitmap is just an image to a list.
 * Only the ground: the line stays the SVG it always was, laid on top, so it keeps the app's gold
 * and its breaks wherever the snapshot came from.
 *
 * Cached in `Paths.cache`, keyed by the session's uuid and the size. The OS may clear it, and the
 * next row that needs it draws it again. Bump `VERSION` when `constants/mapStyle.ts` changes, or
 * every old picture keeps the old style.
 *
 * Asked only while `mapTilesEnabled` is on, checked again when each queued job runs. It reaches
 * the same host the recap does, for the same ground.
 */
const VERSION = 3;
const DIR = "map-thumbs";
/**
 * Extra ground drawn under the square, in dp, for the caller to crop away.
 *
 * MapLibre's snapshotter always paints the sources' attribution in its bottom corner (`logo:
 * false` drops only the logo), and on a run's thumbnail that badge lands on the line. The picture
 * is drawn this much taller and shown top-aligned in its square, so the badge falls outside it.
 * The credit itself is not lost: every surface that shows these pictures prints `MAP_ATTRIBUTION`.
 */
export const MAP_THUMB_CROP = 28;
/** The snapshotter never rejects when tiles fail (it only logs), so a promise could hang forever. */
const TIMEOUT_MS = 20_000;

/** One snapshot at a time: a page of history asking for twelve at once is twelve GL contexts. */
let queue: Promise<unknown> = Promise.resolve();
/** Rows that scroll back into view while their picture is still drawing join the same promise. */
const pending = new Map<string, Promise<string | null>>();
/**
 * The pictures some mounted row is waiting for. A row that scrolls away before its turn takes its
 * key out (`releaseMapThumb`), and its job then fetches nothing: a fling over fifty runs queued
 * fifty snapshots, fifty tile fetches, for rows already gone.
 */
const wanted = new Set<string>();

const keyOf = (uuid: string, size: number) => `${uuid}-${size}-v${VERSION}`;

let folder: Directory | null = null;
/**
 * The names of the pictures on disk, read once. `cachedMapThumb` runs in a row's render, and two
 * native `exists` calls per row per render was disk work on the JS thread during a scroll.
 */
let onDisk: Set<string> | null = null;

function cacheFolder(): Directory {
  if (folder) return folder;
  const dir = new Directory(Paths.cache, DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  onDisk = new Set();
  for (const entry of dir.list()) {
    if (!(entry instanceof File)) continue;
    // A picture drawn under an older style is never shown again: it goes, rather than staying in
    // the cache folder for the OS to find one day.
    if (entry.name.endsWith(`-v${VERSION}.png`)) onDisk.add(entry.name);
    else entry.delete();
  }
  folder = dir;
  return dir;
}

/** The cached picture, if one was already drawn. Synchronous, so a row can paint it on mount. */
export function cachedMapThumb(uuid: string, size: number): string | null {
  const dir = cacheFolder();
  const name = `${keyOf(uuid, size)}.png`;
  return onDisk?.has(name) ? new File(dir, name).uri : null;
}

/** The row asking for this picture is gone. Its job, if still waiting, will not fetch. */
export function releaseMapThumb(uuid: string, size: number): void {
  wanted.delete(keyOf(uuid, size));
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Map snapshot timed out")), TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * The run's ground, drawn if it is not on disk yet. Null when there is nothing to frame, or when
 * the phone refuses Bati the network: a snapshot taken then is the background colour alone, and
 * caching it would keep a blank square after the network came back.
 *
 * ponytail: a snapshot taken while offline without the per-app block (airplane mode) is cached
 * blank all the same; the snapshotter does not say whether a tile arrived. Clearing the app's
 * cache redraws it. A tile-loaded check is the fix if heroes report empty squares.
 *
 * ponytail: no cap on the folder. A list thumbnail is a few tens of KB, so a thousand outings is
 * a few tens of MB, in `Paths.cache` where Android reclaims space under pressure. An LRU by
 * modification time is the fix if a hero's storage report ever shows it.
 */
export function mapThumbFor(
  uuid: string,
  segments: readonly (readonly LngLat[])[],
  size: number,
  /**
   * Jumps the queue: the share screen's one picture, which a hero is waiting on with the send
   * button held, must not wait behind a journal's worth of thumbnails still mounted on its tab.
   */
  urgent = false,
): Promise<string | null> {
  const key = keyOf(uuid, size);
  const cached = cachedMapThumb(uuid, size);
  if (cached) return Promise.resolve(cached);

  wanted.add(key);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const square = traceBounds(segments, size, thumbPadding(size));
  if (square === null) return Promise.resolve(null);
  // The square's ground, extended south by the cropped strip. Linear in latitude, which Web
  // Mercator is to well under a pixel over the few kilometres a run spans.
  const [west, south, east, north] = square;
  const bounds: typeof square = [
    west,
    south - ((north - south) * MAP_THUMB_CROP) / size,
    east,
    north,
  ];
  if (isNetworkBlocked()) return Promise.resolve(null);

  const job = (urgent ? Promise.resolve() : queue.catch(() => undefined))
    .then(async () => {
      // Asked again when the job's turn comes, not only when it was queued: a hero who scrolled a
      // long history and then switched the map off in Settings said no to every request still
      // waiting here.
      if (!useSettingsStore.getState().mapTilesEnabled || isNetworkBlocked()) return null;
      if (!wanted.has(key)) return null;
      const uri = await withTimeout(
        StaticMapImageManager.createImage({
          bounds,
          mapStyle,
          width: size,
          height: size + MAP_THUMB_CROP,
          output: "file",
          logo: false,
        }),
      );
      const target = new File(cacheFolder(), `${key}.png`);
      await new File(uri).move(target);
      onDisk?.add(target.name);
      return target.uri;
    })
    .finally(() => {
      pending.delete(key);
      wanted.delete(key);
    });

  if (!urgent) queue = job;
  pending.set(key, job);
  return job;
}
