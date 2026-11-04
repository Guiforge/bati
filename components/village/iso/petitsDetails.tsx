// The map's small lives, drawn as inked SVG and moved by the ambient clock (horloge.ts), one
// animated node each, only transform and opacity, never a tap target nor read aloud:
//  - Oiseaux: a flock of crows crossing once a wave (mounted after the camera layer, so it flies
//    over the map without panning); small dark ink birds, each with its own wing beat (a vertical
//    squash with its own rate and phase), not a drawing per wing.
//  - Lucioles: ten warm points (amber and cream) near the canal and the trees, clear of every
//    building (in the camera layer), in two groups, a node each, that beat out of step and drift
//    a little. shortcut: two groups, not a node each, for the ceiling of animated nodes.
//  - Rongeur: a rat running along the path in some waves (mounted in the depth order by IsoCarte).
// At rest, unfocused or with reduced motion the clock rests on a cycle boundary: all are hidden.

import { Fragment, useContext } from "react";
import Animated, {
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import { OiseauxPeints, SourisPeintes } from "./Alentours";
import { AlentoursContext } from "./alentours";
import { COTE, ecranXY } from "./carteDemo";
import { Grain } from "./Effets";
import { FORMES_GRAIN } from "./effets";
import { useTour } from "./familles";
import { LumieresContext } from "./fige";
import { type Depart, HorlogeContext } from "./horloge";
import { type Ambiance, type Biome, biomes, vieDe } from "./isoSpec";
import { AnimauxContext } from "./useMarcheurs";
import {
  battementCorbeau,
  CORBEAUX,
  corbeau,
  courseRat,
  lucioles,
  lueurLucioles,
  RAT,
  remousCorbeau,
  VOL_DESSIN_H,
  VOL_DESSIN_L,
  VOL_H,
  VOL_L,
  volCorbeaux,
  ZONE_LUCIOLES,
} from "./vivant";

/** Ink and a warm dark ink, two tones: small dark birds, no pale rim. */
const ENCRES = [
  rawColors.isoPoussiereEncre,
  rawColors.isoPierreChaudeSombre,
  rawColors.isoPoussiereEncre,
  rawColors.isoPierreChaudeSombre,
] as const;
const HORS_CHAMP = { opacity: 0, transform: [{ translateX: -VOL_L }, { translateY: 0 }] };
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** One crow: its path is redrawn with its own wing beat (a rate and phase each), inside the flock's one Svg. */
function UnCorbeau({
  i,
  horloge,
  depart,
  width,
  height,
}: {
  i: number;
  horloge: SharedValue<number> | null;
  depart: SharedValue<Depart> | null;
  width: number;
  height: number;
}) {
  const c = CORBEAUX[i];
  const [cx, cy, k] = c ?? [0, 0, 1];
  const props = useAnimatedProps(() => {
    if (!horloge || !depart) return { d: corbeau(cx, cy, k) };
    const v = volCorbeaux(horloge.get(), depart.get(), width, height);
    return { d: corbeau(cx, cy + remousCorbeau(v.p, i), k, battementCorbeau(v.p, i)) };
  });
  // A faint pale rim keeps a dark bird readable over the dark forest.
  return (
    <AnimatedPath
      fill={ENCRES[i]}
      stroke={rawColors.isoJourLavis}
      strokeOpacity={0.35}
      strokeWidth={0.8}
      animatedProps={props}
    />
  );
}

type ProprietesOiseaux = {
  biome?: Biome;
  /** The light of the map: the gulls fly by day only (isoSpec.json `oiseaux`, audit T43 round 1). */
  ambiance?: Ambiance;
  /** The frame's size, dp. */
  width: number;
  height: number;
  horloge: SharedValue<number> | null;
  depart: SharedValue<Depart> | null;
};

/** The flock: the painted birds when the `animaux` layer is on (alentours.ts), else the drawn V. */
export function Oiseaux(p: ProprietesOiseaux) {
  const { animaux } = useContext(AlentoursContext);
  if (!vieDe(p.ambiance ?? "nuit").oiseaux) return null;
  return animaux ? <OiseauxPeints {...p} /> : <OiseauxDessines {...p} />;
}

function OiseauxDessines({ ambiance = "nuit", width, height, horloge, depart }: ProprietesOiseaux) {
  const style = useAnimatedStyle(() => {
    if (!horloge || !depart) return HORS_CHAMP;
    const v = volCorbeaux(horloge.get(), depart.get(), width, height);
    return {
      opacity: v.opacite,
      transform: [{ translateX: v.x }, { translateY: v.y }, { scaleX: v.sens }],
    };
  });
  if (!vieDe(ambiance).oiseaux) return null;
  return (
    <Animated.View
      pointerEvents="none"
      testID="iso-oiseaux"
      style={[{ position: "absolute", left: 0, top: 0, width: VOL_L, height: VOL_H }, style]}
    >
      <Svg width={VOL_L} height={VOL_H} viewBox={`0 0 ${VOL_DESSIN_L} ${VOL_DESSIN_H}`}>
        {CORBEAUX.map(([x, y], i) => (
          <UnCorbeau
            key={`${x},${y}`}
            i={i}
            horloge={horloge}
            depart={depart}
            width={width}
            height={height}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

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

/** The rat's drawing box, dp, facing right. */
const RAT_L = 29;
const RAT_H = 14.5;

/** The rat's run: the painted mice when the `animaux` layer is on (alentours.ts), else the drawn rat. */
export function Rongeur({ biome = "defaut", lumiere }: { biome?: Biome; lumiere?: Ambiance }) {
  const { animaux } = useContext(AlentoursContext);
  return animaux ? <SourisPeintes lumiere={lumiere} /> : <RatDessine biome={biome} />;
}

function RatDessine({ biome = "defaut" }: { biome?: Biome }) {
  const horloge = useContext(HorlogeContext);
  const animaux = useContext(AnimauxContext);
  const b = biomes[biome].vivant;
  // The rat's wave, planned with the animals' (useMarcheurs.ts): none in a wave without a rat.
  const bete = animaux?.betes.find((x) => x.nom === "rat");
  const c0 = animaux?.c0 ?? 0;
  // The rat's feet, on the row's near edge of the path, where its box is posed at the run's start.
  const [ax, ay] = ecranXY([RAT.gx0, RAT.gy + RAT.decalage]);
  const style = useAnimatedStyle(() => {
    if (!horloge || !bete) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    const r = courseRat(horloge.get() - c0, bete.vie, bete.segments);
    return {
      opacity: r.opacite,
      transform: [
        { translateX: (r.g - RAT.gx0) * (COTE / 2) },
        { translateY: (r.g - RAT.gx0) * (COTE / 4) },
        { scaleX: r.sens },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="iso-rongeur"
      style={[
        {
          position: "absolute",
          left: ax - RAT_L / 2,
          top: ay - RAT_H + 1,
          width: RAT_L,
          height: RAT_H,
        },
        style,
      ]}
    >
      <Svg width={RAT_L} height={RAT_H} viewBox="0 0 18 9">
        <Path
          d="M4.4 6Q1.8 6.6 0.8 3.4"
          fill="none"
          stroke={rawColors[b.ratBord]}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
        <Ellipse
          cx={9}
          cy={6}
          rx={5}
          ry={2.5}
          fill={rawColors[b.rat]}
          stroke={rawColors[b.ratBord]}
          strokeWidth={0.7}
        />
        <Ellipse
          cx={14.4}
          cy={5.4}
          rx={2.7}
          ry={1.7}
          fill={rawColors[b.rat]}
          stroke={rawColors[b.ratBord]}
          strokeWidth={0.7}
        />
        <Circle
          cx={13.4}
          cy={3.8}
          r={1}
          fill={rawColors[b.rat]}
          stroke={rawColors[b.ratBord]}
          strokeWidth={0.6}
        />
      </Svg>
    </Animated.View>
  );
}
