// What a building site adds to the map (L6-T02, T02b): the scaffold, a static image right after
// the building in the depth order (so the villagers in front of it pass in front, those behind it
// behind), and one animated node of dust at its foot. The old stage stands under the scaffold (the
// map keeps drawing it); a building that was not there has a static heap of stones on its plot
// instead, so the site is never empty. At each blow of the first villager a puff of inked dust (the
// volute of the chimney smoke, L5-T03) bursts with a chip of stone and is gone before the next
// blow; the parent unmounts all of it when the site is over, so nothing stays on the rest map.

import { useContext, useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse, Path, Polygon } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { COTE, ecranXY, losange, pose } from "./carteDemo";
import {
  bouffee,
  COUPS,
  echafaudageDe,
  POP_MS,
  POUSSIERE_DEBUT_MS,
  POUSSIERE_DUREE_MS,
  pop,
} from "./chantier";
import { useMouvementReduit } from "./fige";
import { emplacements } from "./isoLayout";
import { MAQUETTES } from "./maquettes";
import { Planche } from "./PlancheCarte";
import { RevelationContext } from "./revelation";

const LARGEUR_POUSSIERE = COTE * 1.5;
const HAUTEUR_POUSSIERE = COTE * 0.75;
// Soft puffs low on the ground in a 150 x 75 box: cx, cy, rx, ry. No ink line, no curl: plain fill.
const BOUFFEES = [
  [30, 58, 24, 11],
  [58, 52, 20, 12],
  [92, 56, 26, 12],
  [118, 60, 18, 9],
  [74, 64, 22, 8],
] as const;
// The chip of stone a blow throws up: three shards round the impact, in the same box.
const ECLATS = ["M75 58L69 40L79 52Z", "M80 60L98 46L86 60Z", "M70 62L52 52L68 58Z"];

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

/** The scaffold; `neuf` (a building that was not there) lays the heap of stones under it. */
export function Echafaudage({ code, neuf }: { code: BuildingCode; neuf: boolean }) {
  const s = MAQUETTES[echafaudageDe(code)];
  return (
    <>
      {neuf ? <Tas code={code} /> : null}
      <Planche s={s} rect={s ? pose(code, s) : null} testID={`iso-echafaudage-${code}`} />
    </>
  );
}

/** The plot of a building not yet there: beaten earth and a heap of stones, static. */
function Tas({ code }: { code: BuildingCode }) {
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

export function Poussiere({ code }: { code: BuildingCode }) {
  // The first villager's blows, counted linearly from its first one: one unit per strike.
  const u = useSharedValue(0);
  const reduit = useMouvementReduit();
  useEffect(() => {
    // Reduced motion: the dust never rises (u stays 0, the puff is invisible).
    if (reduit) return;
    u.set(
      withDelay(
        POUSSIERE_DEBUT_MS,
        withTiming(COUPS, { duration: POUSSIERE_DUREE_MS, easing: Easing.linear }),
      ),
    );
  }, [u, reduit]);
  const style = useAnimatedStyle(() => {
    const b = bouffee(u.get());
    return { opacity: b.opacite, transform: [{ translateY: b.y }, { scale: b.echelle }] };
  });
  const { coin, emprise } = emplacements[code];
  // The foot of the footprint: its front corner, where the villagers strike.
  const [x, y] = ecranXY([coin[0] + emprise[0], coin[1] + emprise[1]]);
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-poussiere-${code}`}
      style={[
        {
          position: "absolute",
          left: x - LARGEUR_POUSSIERE / 2,
          top: y - HAUTEUR_POUSSIERE,
          width: LARGEUR_POUSSIERE,
          height: HAUTEUR_POUSSIERE,
          transformOrigin: [LARGEUR_POUSSIERE / 2, HAUTEUR_POUSSIERE, 0],
        },
        style,
      ]}
    >
      <Svg width={LARGEUR_POUSSIERE} height={HAUTEUR_POUSSIERE} viewBox="0 0 150 75">
        {BOUFFEES.map(([cx, cy, rx, ry]) => (
          <Ellipse
            key={cx}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={rawColors.isoPoussiere}
            fillOpacity={0.85}
          />
        ))}
        {ECLATS.map((d) => (
          <Path
            key={d}
            d={d}
            fill={rawColors.isoRock}
            stroke={rawColors.isoInk}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * The puff that closes a site, `delai` ms after its mount (the reveal's impact). E5 (anim-32, H4-05):
 * every lobe and a bigger swell, and by day the bible's wood, darker than the sunlit ground.
 */
export function PopFin({ code, delai = 0 }: { code: BuildingCode; delai?: number }) {
  const t = useSharedValue(0);
  const reduit = useMouvementReduit();
  const jour = useContext(RevelationContext)?.jour === true;
  useEffect(() => {
    if (reduit) return;
    t.set(withDelay(delai, withTiming(1, { duration: POP_MS, easing: Easing.linear })));
  }, [t, reduit, delai]);
  const style = useAnimatedStyle(() => {
    const p = pop(t.get());
    return { opacity: p.opacite, transform: [{ translateY: p.y }, { scale: p.echelle }] };
  });
  const { coin, emprise } = emplacements[code];
  const [x, y] = ecranXY([coin[0] + emprise[0], coin[1] + emprise[1]]);
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-poussiere-pop-${code}`}
      style={[
        {
          position: "absolute",
          left: x - LARGEUR_POUSSIERE / 2,
          top: y - HAUTEUR_POUSSIERE,
          width: LARGEUR_POUSSIERE,
          height: HAUTEUR_POUSSIERE,
          transformOrigin: [LARGEUR_POUSSIERE / 2, HAUTEUR_POUSSIERE, 0],
        },
        style,
      ]}
    >
      <Svg width={LARGEUR_POUSSIERE} height={HAUTEUR_POUSSIERE} viewBox="0 0 150 75">
        {BOUFFEES.map(([cx, cy, rx, ry]) => (
          <Ellipse
            key={cx}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={jour ? rawColors.isoPoussiereJour : rawColors.isoPoussiere}
            fillOpacity={0.85}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
