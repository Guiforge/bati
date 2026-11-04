// The map's small lives, drawn as inked SVG and moved by the ambient clock (horloge.ts), one
// animated node each, only transform and opacity, never a tap target nor read aloud:
//  - Lucioles: ten warm points (amber and cream) near the canal and the trees, clear of every
//    building (in the camera layer), in two groups, a node each, that beat out of step and drift
//    a little. shortcut: two groups, not a node each, for the ceiling of animated nodes.
// The painted creatures (mice, cat, birds, dragon) are Creatures.tsx's. At rest, unfocused or with
// reduced motion the clock rests on a cycle boundary: the fireflies are hidden.

import { Fragment, useContext } from "react";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Ellipse } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import { ecranXY } from "./carteDemo";
import { Grain } from "./Effets";
import { FORMES_GRAIN } from "./effets";
import { useTour } from "./familles";
import { LumieresContext } from "./fige";
import { HorlogeContext } from "./horloge";
import { type Ambiance, type Biome, vieDe } from "./isoSpec";
import { lucioles, lueurLucioles, ZONE_LUCIOLES } from "./vivant";

/** The patch the fireflies hover over, as a box on the map: the zone's four corners, padded. */
const PAD = 6;
const ZONE = (() => {
  const { gx, gy } = ZONE_LUCIOLES;
  const coins = [
    ecranXY([gx[0], gy[0]]),
    ecranXY([gx[1], gy[0]]),
    ecranXY([gx[0], gy[1]]),
    ecranXY([gx[1], gy[1]]),
  ];
  const xs = coins.map((p) => p[0]);
  const ys = coins.map((p) => p[1]);
  const x = Math.min(...xs) - PAD;
  const y = Math.min(...ys) - PAD;
  return { x, y, w: Math.max(...xs) + PAD - x, h: Math.max(...ys) + PAD - y };
})();

export function Lucioles({
  visible,
  ambiance = "nuit",
}: {
  ambiance?: Ambiance;
  /** The island's cells: a firefly hovers only over a cell the island shows. */
  visible: readonly (readonly boolean[])[];
  /** Still passed by the maps; the fireflies' tones are no longer the biome's. */
  biome?: Biome;
}) {
  const lumieres = useContext(LumieresContext);
  if (!lumieres || !vieDe(ambiance).lucioles) return null;
  const points = lucioles(visible);
  return (
    <>
      {TEINTES_LUCIOLES.map((teinte, groupe) => (
        <GroupeLucioles
          key={teinte}
          groupe={groupe}
          points={points.filter((p) => p.groupe === groupe)}
          couleur={rawColors[teinte]}
        />
      ))}
    </>
  );
}

/** One warm tone a group: amber, then cream. Fireflies are a warm light in the dark like the windows, not a cold one (biome `luciole` no longer read). */
const TEINTES_LUCIOLES = ["isoLueur", "isoEclat"] as const;

/** A group of fireflies: one node, its own beat (vivant.ts `lueurLucioles`), a soft halo round each point. */
function GroupeLucioles({
  groupe,
  points,
  couleur,
}: {
  groupe: number;
  points: ReturnType<typeof lucioles>;
  couleur: string;
}) {
  const horloge = useContext(HorlogeContext);
  const tour = useTour("lucioles");
  const style = useAnimatedStyle(() => {
    if (!horloge) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    const l = lueurLucioles(tour(horloge.get()), groupe);
    return { opacity: l.opacite, transform: [{ translateX: l.dx }, { translateY: l.dy }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={groupe === 0 ? "iso-lucioles" : `iso-lucioles-${groupe}`}
      style={[
        { position: "absolute", left: ZONE.x, top: ZONE.y, width: ZONE.w, height: ZONE.h },
        style,
      ]}
    >
      <Svg width={ZONE.w} height={ZONE.h}>
        {points.map((p) => {
          const [x, y] = ecranXY([p.gx, p.gy]);
          return (
            <Fragment key={`${p.gx}-${p.gy}`}>
              <Ellipse
                cx={x - ZONE.x}
                cy={y - ZONE.y}
                rx={p.r * 2.6}
                ry={p.r * 2.6}
                fill={couleur}
                fillOpacity={0.22}
              />
              <Grain
                d={FORMES_GRAIN.lucioles}
                x={x - ZONE.x}
                y={y - ZONE.y}
                r={p.r}
                couleur={couleur}
                trait={0.6}
              />
            </Fragment>
          );
        })}
      </Svg>
    </Animated.View>
  );
}
