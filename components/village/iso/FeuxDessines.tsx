// The fire the app draws over a building's sprite (L5-T03, DECISIONS 29/10): an inked flame on
// each hearth with a warm glow on the ground under it, and pale inked smoke rising from each
// chimney and from the campfire. Posed from the attach-point index (feux.ts) with the sprite's own
// conversion (the sprite's rect and scale). No tap, no screen reader (the map is hidden from it).
//
// Animation: transform and opacity on the ambient clock only. One animated node per hearth (flame
// and glow share a box, which scales about the flame's base) and two per plume. A Svg is a bitmap
// at its size: the flame box is a few dozen dp, a puff about 8. A map without a clock, or at rest,
// shows the rest pose: a lit flame, puffs mid-climb.

import { useContext } from "react";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Ellipse, Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import { useDump } from "./dumpSprites";
import { Grain } from "./Effets";
import { FORMES_GRAIN } from "./effets";
import {
  type AccrochesStade,
  accrochesDe,
  FLAMME_REPOS,
  FUMEE_LARGEUR,
  type Fumee,
  flamme,
  fumee,
  geometrieFlamme,
  plume,
  sourceFumee,
  VOLUTE,
  variante,
} from "./feux";
import { LumieresContext } from "./fige";
import { HorlogeContext } from "./horloge";
import { type Ambiance, type Biome, biomes, type SpriteIso, type Stade, vieDe } from "./isoSpec";
import { flareOnde, ondeDe, RevelationContext } from "./revelation";

// Three uneven tongues (a low one on the left, a middle one, the tallest leaning right) in a
// 100 x 170 box, base at the bottom; the top 20 units are left to the sparks.
const LANGUES =
  "M44 170C14 168 4 142 12 118C16 106 24 100 22 84C34 92 36 104 38 112C36 84 46 62 56 44C58 56 62 60 66 66C68 52 74 40 80 26C82 52 94 74 92 108C91 144 76 168 44 170Z";
const COEUR =
  "M46 170C32 168 30 150 38 134C42 126 46 116 50 104C58 120 66 130 62 150C60 164 54 170 46 170Z";
// Embers that barely leave the flame (inked flakes, no bare dot): x, y, radius.
const ETINCELLES = [
  [72, 12, 3.4],
  [90, 22, 2.4],
  [34, 30, 2.6],
] as const;

// The ground glow (T30): small, soft and irregular. [share of the radius, opacity, dx share, ry
// share] of five faint stacked bands, widest first, each a little off-centre, so the edge fades.
const BANDES_LUEUR = [
  [0.8, 0.03, 0.05, 0.42],
  [0.64, 0.035, -0.04, 0.52],
  [0.48, 0.04, 0.03, 0.45],
  [0.34, 0.045, -0.02, 0.5],
  [0.2, 0.05, 0.01, 0.48],
] as const;

const ABSOLU = { position: "absolute" } as const;
// The three kinds of smoke in their 100 x 64 box: a round cloud of three lobes, a thin straight
// ribbon, a leaning curl. Each with the curl drawn inside it.
const FORMES_FUMEE = {
  ronde: VOLUTE,
  fine: "M46 62C40 52 54 44 48 34C43 24 54 16 50 3C58 14 54 26 56 36C58 46 52 54 55 62Z",
  volute:
    "M14 60C6 46 26 44 34 38C42 32 34 20 48 14C62 8 84 12 86 28C88 40 70 38 66 34C72 44 58 54 46 58C36 62 24 64 14 60Z",
} as const;
const BOUCLES_FUMEE = {
  ronde: "M36 46C38 34 54 32 56 42C57 48 50 52 46 48",
  fine: "M49 50C47 42 53 38 50 30",
  volute: "M52 26C62 22 72 28 66 34",
} as const;

/** The flames and smoke of one building's stage, posed on its sprite (`corps` is the sprite's rect). */
export function Feux({
  code,
  stade,
  s,
  corps,
  biome,
  ambiance = "nuit",
}: {
  code: BuildingCode;
  stade: Stade;
  s: SpriteIso;
  corps: Rect;
  biome: Biome;
  ambiance?: Ambiance;
}) {
  const horloge = useContext(HorlogeContext);
  const revelation = useContext(RevelationContext);
  const a = accrochesDe(code, stade);
  // Dev-iso `?dump=`: the drawn flame is a sprite for the dump, held by this building (its id per
  // building: a drawn flame is not an asset that repeats).
  useDump(() => {
    if (!a?.foyer || !vieDe(ambiance).lueurFeux) return null;
    const g = geometrieFlamme(a.foyer, corps.w / s.size[0]);
    const [x, y] = [corps.x + g.left, corps.y + g.top];
    return {
      id: `flame_${code}`,
      layer: "flame",
      x,
      y,
      w: g.w,
      h: g.h,
      flip: false,
      pied: [x + g.w / 2, y + g.origine],
      container: code,
    };
  });
  if (!a || (!a.foyer && !a.cheminee)) return null;
  const k = corps.w / s.size[0];
  const src = sourceFumee(a, code, k);
  const n = variante(code);
  return (
    <>
      {a.foyer && vieDe(ambiance).lueurFeux ? (
        <Flamme
          foyer={a.foyer}
          corps={corps}
          k={k}
          n={n}
          biome={biome}
          horloge={horloge}
          onde={ondeDe(revelation, code)}
          testID={`iso-flamme-${code}`}
        />
      ) : null}
      {src
        ? plume(code).map((f) => (
            <Volute
              key={`${f.sorte}-${f.phase}`}
              x={corps.x + src[0] * k}
              y={corps.y + src[1] * k}
              f={f}
              biome={biome}
              horloge={horloge}
              testID={`iso-fumee-${code}`}
            />
          ))
        : null}
    </>
  );
}

function Flamme({
  foyer,
  corps,
  k,
  n,
  biome,
  horloge,
  onde,
  testID,
}: {
  foyer: NonNullable<AccrochesStade["foyer"]>;
  corps: Rect;
  k: number;
  n: number;
  biome: Biome;
  horloge: SharedValue<number> | null;
  /** T41: the reveal's golden wave makes this fire flare as it passes. */
  onde?: { t: SharedValue<number>; retard: number };
  testID: string;
}) {
  const g = geometrieFlamme(foyer, k);
  const lumieres = useContext(LumieresContext);
  const { flamme: cFlamme, coeur, lueur, encre } = biomes[biome].feu;
  const style = useAnimatedStyle(() => {
    const f = horloge ? flamme(horloge.get(), n) : FLAMME_REPOS;
    const flare = onde ? flareOnde(onde.t.get(), onde.retard) : 0;
    return { opacity: f.opacite, transform: [{ scaleY: f.echelle * (1 + flare) }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: corps.x + g.left, top: corps.y + g.top, width: g.w, height: g.h },
        { transformOrigin: [g.w / 2, g.origine, 0] },
        style,
      ]}
    >
      <Svg width={g.w} height={g.h} viewBox={`${50 - g.rx} 0 ${2 * g.rx} ${g.hu}`}>
        {/* Many faint flat bands, no gradient: the edge fades in small steps. */}
        {(lumieres ? BANDES_LUEUR : []).map(([echelle, opacite, dx, r]) => (
          <Ellipse
            key={echelle}
            cx={50 + g.rx * dx}
            cy={g.sol}
            rx={g.rx * echelle}
            ry={g.rx * echelle * r}
            fill={rawColors[lueur]}
            fillOpacity={opacite}
          />
        ))}
        <Path
          d={LANGUES}
          fill={rawColors[cFlamme]}
          stroke={rawColors[encre]}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <Path d={COEUR} fill={rawColors[coeur]} />
        {ETINCELLES.map(([x, y, r]) => (
          <Grain
            key={`${x}-${y}`}
            d={FORMES_GRAIN.braise}
            x={x}
            y={y}
            r={r * 1.5}
            couleur={rawColors[coeur]}
            trait={1.4}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** One puff of a plume, centred on `x, y`, climbing on the clock. */
function Volute({
  x,
  y,
  f,
  biome,
  horloge,
  testID,
}: {
  x: number;
  y: number;
  f: Fumee;
  biome: Biome;
  horloge: SharedValue<number> | null;
  testID: string;
}) {
  const { fumee: cFumee, encre } = biomes[biome].feu;
  const style = useAnimatedStyle(() => {
    const m = fumee(horloge ? horloge.get() : 0, f.phase, f.sorte, f.fois, f.force);
    return {
      opacity: m.opacite,
      transform: [{ translateX: m.x }, { translateY: m.y }, { scale: m.echelle }],
    };
  });
  const h = FUMEE_LARGEUR * 0.64;
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: x - FUMEE_LARGEUR / 2, top: y - h, width: FUMEE_LARGEUR, height: h },
        style,
      ]}
    >
      <Svg width={FUMEE_LARGEUR} height={h} viewBox="0 0 100 64">
        <Path
          d={FORMES_FUMEE[f.sorte]}
          fill={rawColors[cFumee]}
          stroke={rawColors[encre]}
          strokeWidth={4.5}
          strokeOpacity={0.95}
          strokeLinejoin="round"
        />
        {/* The curl inside the lobes: what makes it a volute and not a blot. */}
        <Path
          d={BOUCLES_FUMEE[f.sorte]}
          fill="none"
          stroke={rawColors[encre]}
          strokeWidth={3}
          strokeOpacity={0.8}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
