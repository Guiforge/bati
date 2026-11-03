// A light's warm pool on the map: the one drawing of a lamp, a window or a fire (still; the motion
// of it is MouvementBld.tsx). Cut out of BatimentMoteur.tsx so the motion layer can draw it too.

import { useId } from "react";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import type { LightAnchor, Point } from "@/constants/buildingData";
import { rawColors } from "@/constants/rawColors";

/** A warm radial pool centred on a map point: isoLueur at 45 % in the heart, 0 % at the rim. */
export function LueurDouce({
  kind,
  at,
  rayon,
}: {
  kind: LightAnchor["kind"];
  at: Point;
  rayon: number;
}) {
  const id = `lueur-${useId().replaceAll(":", "")}`;
  return (
    <Svg
      pointerEvents="none"
      testID={`batiment-lueur-${kind}`}
      width={rayon * 2}
      height={rayon * 2}
      style={{
        position: "absolute",
        left: at[0] - rayon,
        top: at[1] - rayon,
        width: rayon * 2,
        height: rayon * 2,
      }}
    >
      <Defs>
        <RadialGradient id={id}>
          <Stop offset="0" stopColor={rawColors.isoLueur} stopOpacity={0.45} />
          <Stop offset="1" stopColor={rawColors.isoLueur} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={rayon} cy={rayon} r={rayon} fill={`url(#${id})`} />
    </Svg>
  );
}
