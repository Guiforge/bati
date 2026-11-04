// The plot of a building that was not there before its growth (L6-T02): beaten earth and a heap of
// stones, static, shown by the growth layer (IsoCroissance) in the old stage's place. The scaffold
// and the dust are the layer's own now (moment.ts); the villagers who struck the site are gone.

import Svg, { Polygon } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { COTE, ecranXY, losange } from "./carteDemo";
import { emplacements } from "./isoLayout";

// A heap of stones on a new building's plot: x, y from the plot's centre and half-width, as
// shares of COTE.
const PIERRES = [
  [-0.18, 0.04, 0.12],
  [0.14, 0.06, 0.11],
  [-0.02, 0.12, 0.13],
  [0, -0.04, 0.1],
] as const;

/** A stone: an irregular hexagon of half-width `r` centred on `x, y`. */
const pierre = (x: number, y: number, r: number) =>
  (
    [
      [-r, 0],
      [-r * 0.5, -r * 0.6],
      [r * 0.6, -r * 0.55],
      [r, -r * 0.05],
      [r * 0.5, r * 0.5],
      [-r * 0.6, r * 0.45],
    ] as const
  )
    .map(([dx, dy]) => `${x + dx},${y + dy}`)
    .join(" ");

/** The plot of a building not yet there: beaten earth and a heap of stones, static. */
export function Tas({ code }: { code: BuildingCode }) {
  const { coin, emprise } = emplacements[code];
  const [gx, gy] = coin;
  const [w, h] = emprise;
  const [x0] = ecranXY([gx, gy + h]);
  const [x1] = ecranXY([gx + w, gy]);
  const [, y0] = ecranXY([gx, gy]);
  const [, y1] = ecranXY([gx + w, gy + h]);
  const [cx, cy] = ecranXY([gx + w / 2, gy + h / 2]);
  const sol = Array.from({ length: w * h }, (_, i) =>
    losange([gx + (i % w), gy + Math.floor(i / w)]),
  );
  return (
    <Svg
      pointerEvents="none"
      testID={`iso-tas-${code}`}
      width={x1 - x0}
      height={y1 - y0}
      viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`}
      style={{ position: "absolute", left: x0, top: y0 }}
    >
      {sol.map((p) => (
        <Polygon key={p} points={p} fill={rawColors.isoTerre} />
      ))}
      {PIERRES.map(([dx, dy, r]) => (
        <Polygon
          key={`${dx},${dy}`}
          points={pierre(cx + dx * COTE, cy + dy * COTE, r * COTE)}
          fill={rawColors.isoRock}
          stroke={rawColors.isoInk}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
