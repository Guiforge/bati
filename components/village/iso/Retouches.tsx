// Repaints by the app (AUDIT-DA 39): a painted block that came out saturated blue against the
// warm stone of the rest is covered by flat polygons of warm stone, a little translucent so the
// painted grain and its ink show through. Still, no node. The real fix is a repaint (lot 7);
// shortcut: one block, in sprite pixels of the night sprite, until that repaint lands.

import Svg, { Polygon } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import type { SpriteIso, Stade } from "./isoSpec";
import { RETOUCHES } from "./retouches";

const OPACITE_RETOUCHE = 0.65;

export function Retouches({
  code,
  stade,
  s,
  corps,
}: {
  code: BuildingCode;
  stade: Stade;
  s: SpriteIso;
  corps: Rect;
}) {
  const formes = RETOUCHES[`${code}_${stade}`];
  if (!formes) return null;
  return (
    <Svg
      pointerEvents="none"
      testID={`iso-retouche-${code}`}
      width={corps.w}
      height={corps.h}
      viewBox={`0 0 ${s.size[0]} ${s.size[1]}`}
      style={{ position: "absolute", left: corps.x, top: corps.y }}
    >
      {formes.map((f) => (
        <Polygon
          key={f.points}
          points={f.points}
          fill={rawColors[f.teinte]}
          fillOpacity={OPACITE_RETOUCHE}
        />
      ))}
    </Svg>
  );
}
