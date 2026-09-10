import { memo } from "react";
import Svg, { Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { LngLat } from "@/src/gps/trace";
import { traceToPath } from "./tracePreview";

/**
 * One run's line, at thumbnail size.
 *
 * Gold, like the trace on the recap map (`app/recap.tsx`) and the trophy this replaces: the
 * journal has one colour for "you did this" and a second one here would be a new vocabulary for
 * no new meaning. The three ways out are told apart by the row's title and its distance, not by
 * a colour a reader would have to learn.
 *
 * `react-native-svg` rather than a map: a virtualized list cannot mount a map per row, and the
 * shape of a run needs no tiles under it.
 */
export const TraceThumb = memo(function TraceThumb({
  points,
  size,
}: {
  points: readonly LngLat[];
  size: number;
}) {
  const d = traceToPath(points, size);
  if (d === null) return null;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden>
      <Path
        d={d}
        stroke={rawColors.resourceGold}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
});
