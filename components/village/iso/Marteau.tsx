// The "ready to evolve" hammer: over a ready building on the map (Reclame.tsx) and before the name
// in its bubble (Bulle.tsx). Its own file so the bubble does not pull the map's modules in.

import Svg, { Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";

/** A hammer: bone head and handle, ink outline. */
export function Marteau({ d }: { d: number }) {
  return (
    <Svg width={d} height={d} viewBox="0 0 24 24">
      <Path
        d="M3 5 L14 5 L14 11 L3 11 Z M8.5 11 L11 11 L11 22 L8.5 22 Z"
        fill={rawColors.text}
        stroke={rawColors.bgDark}
        strokeWidth={1.6}
        strokeLinejoin="round"
        transform="rotate(35 12 12)"
      />
    </Svg>
  );
}
