import { Image } from "expo-image";
import { memo, useEffect, useState } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import {
  cachedMapThumb,
  MAP_THUMB_CROP,
  MapSnapshotTimeout,
  mapThumbFor,
  releaseMapThumb,
} from "@/src/gps/mapThumb";
import type { LngLat } from "@/src/gps/trace";
import { reportError, reportEvent } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";
import { thumbPadding, traceToPath } from "./tracePreview";

/** Where the map under a line stands: none to draw, still coming, or on screen. */
export type MapState = "none" | "pending" | "ready";

/**
 * The run's ground as a picture, when the hero turned the map on and the caller says which run it
 * is. `uri` is null until it is drawn, and for good while the map is off: nothing is fetched then.
 * `pending` says a picture is on its way, which a caller that sends the view needs to wait for.
 */
function useMapThumb(
  uuid: string | undefined,
  segments: readonly (readonly LngLat[])[],
  size: number,
  urgent: boolean,
): { uri: string | null; pending: boolean } {
  const tiles = useSettingsStore((s) => s.mapTilesEnabled);
  const key = tiles && uuid ? `${uuid}-${size}` : null;
  // Filed under the run it belongs to. The journal recycles its rows, so this state outlives a
  // change of `uuid`, and a bare uri would paint the previous run's ground under the next run's
  // line until the queue reached it.
  const [drawn, setDrawn] = useState<{ key: string; uri: string | null } | null>(null);

  useEffect(() => {
    if (!key || !uuid) return;
    let live = true;
    mapThumbFor(uuid, segments, size, urgent)
      .then((uri) => {
        if (live) setDrawn({ key, uri });
      })
      .catch((error: unknown) =>
        error instanceof MapSnapshotTimeout
          ? reportEvent("journal.mapThumb", error.message)
          : reportError("journal.mapThumb", error),
      );
    return () => {
      live = false;
      // Scrolled away or recycled to another run before its turn: the queued job fetches nothing.
      releaseMapThumb(uuid, size);
    };
  }, [key, uuid, segments, size, urgent]);

  if (!key || !uuid) return { uri: null, pending: false };
  if (drawn?.key === key) return { uri: drawn.uri, pending: false };
  // Already on disk: painted on the first frame, without waiting for the effect.
  const cached = cachedMapThumb(uuid, size);
  return { uri: cached, pending: cached === null };
}

/**
 * One run's line, at thumbnail size.
 *
 * Gold, like the trace on the recap map (`app/recap.tsx`) and the trophy this replaces: the
 * journal has one colour for "you did this" and a second one here would be a new vocabulary for
 * no new meaning. The three ways out are told apart by the row's title and its distance, not by
 * a colour a reader would have to learn.
 *
 * `react-native-svg` rather than a map: a virtualized list cannot mount a map per row. With the
 * map turned on, the ground arrives as a still picture under the line instead (`mapKey`).
 */
export const TraceThumb = memo(function TraceThumb({
  segments,
  size,
  mapKey,
  onMapState,
}: {
  /** One entry per unbroken stretch. A list row that has only the line passes `[points]`. */
  segments: readonly (readonly LngLat[])[];
  size: number;
  /**
   * The session's uuid, to draw the map under the line (`src/gps/mapThumb.ts`). Without it the
   * line is drawn alone, on whatever the caller put behind it.
   */
  mapKey?: string;
  /**
   * Told whether the map is there yet. The share screen captures this view as a picture, and a
   * capture taken while the map is still drawing, or fading in, sends the line alone under a map
   * credit. "ready" means displayed, not only downloaded.
   */
  onMapState?: (state: MapState) => void;
}) {
  // A caller waiting on the map (`onMapState`) is a hero waiting on a send button: first in line.
  const { uri: map, pending } = useMapThumb(mapKey, segments, size, onMapState !== undefined);
  const [shown, setShown] = useState<string | null>(null);
  const state: MapState = map
    ? shown === map
      ? "ready"
      : "pending"
    : pending
      ? "pending"
      : "none";
  useEffect(() => {
    onMapState?.(state);
  }, [state, onMapState]);

  const d = traceToPath(segments, size, thumbPadding(size));
  if (d === null) return null;

  // The box is there whether the map is or not: a node mounted for one state only re-parents
  // whatever measures against it (AGENTS.md, issue #29).
  return (
    <View style={{ width: size, height: size, overflow: "hidden" }}>
      {map ? (
        <Image
          source={{ uri: map }}
          style={{ position: "absolute", top: 0, width: size, height: size + MAP_THUMB_CROP }}
          accessible={false}
          // No fade where the view is captured: "displayed" would otherwise be half transparent.
          transition={onMapState ? 0 : 150}
          onDisplay={() => setShown(map)}
        />
      ) : null}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden>
        <Path
          d={d}
          stroke={rawColors.resourceGold}
          strokeWidth={size > 100 ? 3.5 : 2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
});
