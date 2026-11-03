// The magic layer of a high rank, drawn in code (cards: windmill, observatory): rings turning round
// a ground point, a soft beam, a 15 % breath hidden on a zone, fireflies, constellations. All of it
// reads the map's one clock (HorlogeContext) and loops nothing itself; with reduced motion, or
// without a clock, every piece stands still. Nothing here is tappable or counted.

import { type ReactNode, useContext } from "react";
import { View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, G, Path, Polygon, Polyline } from "react-native-svg";
import type { Magie, Point } from "@/constants/buildingData";
import { rawColors } from "@/constants/rawColors";
import { useMouvementReduit } from "./fige";
import { HorlogeContext } from "./horloge";
import {
  angleAnneau,
  deriveLuciole,
  MARQUE_DP,
  MARQUES_GLYPHE,
  NB_MARQUES,
  PERIODE_EXTERIEUR_MS,
  PERIODE_INTERIEUR_MS,
  souffleZone,
} from "./magie";

const ANGLE_FIXE = 0;
const centre = (p: Point, t: number) =>
  ({ position: "absolute", left: p[0] - t / 2, top: p[1] - t / 2, width: t, height: t }) as const;

/** A node that turns on the clock, or stands still. */
function Tourne({
  horloge,
  periode,
  sens,
  style,
  children,
}: {
  horloge: SharedValue<number> | null;
  periode: number;
  sens: 1 | -1;
  style: object;
  children: ReactNode;
}) {
  const anime = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${horloge ? angleAnneau(horloge.get(), periode, sens) : ANGLE_FIXE}deg` },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[style, anime]}>
      {children}
    </Animated.View>
  );
}

/** One ring with its marks, in a box of 2 x `rayon`. */
function Anneau({
  rayon,
  nbMarques,
  decalage,
}: {
  rayon: number;
  nbMarques: number;
  decalage: number;
}) {
  const cote = 2 * rayon + MARQUE_DP;
  const c = cote / 2;
  return (
    <Svg width={cote} height={cote}>
      <Circle
        cx={c}
        cy={c}
        r={rayon}
        fill="none"
        stroke={rawColors.isoRune}
        strokeOpacity={0.7}
        strokeWidth={1}
      />
      {Array.from({ length: nbMarques }, (_, i) => {
        const a = (2 * Math.PI * i) / nbMarques;
        const forme = MARQUES_GLYPHE[(i + decalage) % MARQUES_GLYPHE.length];
        const x = c + rayon * Math.sin(a) - MARQUE_DP / 2;
        const y = c - rayon * Math.cos(a) - MARQUE_DP / 2;
        const echelle = MARQUE_DP / 10;
        return (
          <Path
            // biome-ignore lint/suspicious/noArrayIndexKey: marks are positional and never reordered
            key={i}
            d={forme}
            fill={rawColors.isoEclat}
            fillOpacity={0.9}
            transform={`translate(${x} ${y}) scale(${echelle}) rotate(${(a * 180) / Math.PI} 5 5)`}
          />
        );
      })}
    </Svg>
  );
}

/** Rings flat on the ground round `at`: the outer one turns one way in 8 s, the inner one the other way in 12 s. */
function Glyphe({
  at,
  rayon,
  sens,
  horloge,
}: {
  at: Point;
  rayon: number;
  sens: 1 | -1;
  horloge: SharedValue<number> | null;
}) {
  const interieur = rayon * 0.62;
  const cote = (r: number) => 2 * r + MARQUE_DP;
  return (
    // The ground is seen from an angle: the whole figure is flattened.
    <View
      pointerEvents="none"
      testID="batiment-glyphe"
      style={[centre(at, cote(rayon)), { transform: [{ scaleY: 0.5 }] }]}
    >
      <Tourne
        horloge={horloge}
        periode={PERIODE_EXTERIEUR_MS}
        sens={sens}
        style={centre([cote(rayon) / 2, cote(rayon) / 2], cote(rayon))}
      >
        <Anneau rayon={rayon} nbMarques={NB_MARQUES} decalage={0} />
      </Tourne>
      <Tourne
        horloge={horloge}
        periode={PERIODE_INTERIEUR_MS}
        sens={sens === 1 ? -1 : 1}
        style={centre([cote(rayon) / 2, cote(rayon) / 2], cote(interieur))}
      >
        <Anneau rayon={interieur} nbMarques={6} decalage={2} />
      </Tourne>
    </View>
  );
}

/** A soft beam: two colours along its height, a slow breath on the clock. */
function Faisceau({
  at,
  haut,
  horloge,
}: {
  at: Point;
  haut: number;
  horloge: SharedValue<number> | null;
}) {
  const bas = 7;
  const large = 18;
  const anime = useAnimatedStyle(() => ({
    opacity: horloge ? 0.75 + 0.25 * Math.sin((2 * Math.PI * (horloge.get() % 5000)) / 5000) : 0.85,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-faisceau"
      style={[
        {
          position: "absolute",
          left: at[0] - large / 2,
          top: at[1] - haut,
          width: large,
          height: haut,
        },
        anime,
      ]}
    >
      <Svg width={large} height={haut}>
        {/* Two colours, warm at the foot and cool above, laid as two stacked shapes. */}
        <Polygon
          points={`${(large - bas) / 2},${haut} ${(large + bas) / 2},${haut} ${(large + bas) / 2 + 3},${haut / 2} ${(large - bas) / 2 - 3},${haut / 2}`}
          fill={rawColors.isoLueur}
          fillOpacity={0.4}
        />
        <Polygon
          points={`${(large - bas) / 2 - 3},${haut / 2} ${(large + bas) / 2 + 3},${haut / 2} ${large},0 0,0`}
          fill={rawColors.isoRune}
          fillOpacity={0.22}
        />
      </Svg>
    </Animated.View>
  );
}

/** A disc that breathes 15 % on the clock, hidden outside its zone. */
function Souffle({
  zone,
  at,
  horloge,
}: {
  zone: readonly [number, number, number, number];
  at: Point;
  horloge: SharedValue<number> | null;
}) {
  const d = 26;
  const anime = useAnimatedStyle(() => ({
    transform: [{ scale: horloge ? souffleZone(horloge.get()) : 1 }],
  }));
  return (
    <View
      pointerEvents="none"
      testID="batiment-souffle"
      style={{
        position: "absolute",
        left: zone[0],
        top: zone[1],
        width: zone[2],
        height: zone[3],
        overflow: "hidden",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: at[0] - zone[0] - d / 2,
            top: at[1] - zone[1] - d / 2,
            width: d,
            height: d,
            borderRadius: d,
            backgroundColor: rawColors.isoEclat,
            opacity: 0.55,
          },
          anime,
        ]}
      />
    </View>
  );
}

const LUCIOLE_DP = 3;

function Luciole({
  at,
  i,
  horloge,
}: {
  at: Point;
  i: number;
  horloge: SharedValue<number> | null;
}) {
  const anime = useAnimatedStyle(() => {
    const d = horloge ? deriveLuciole(horloge.get(), i) : { x: 0, y: 0, o: 0.8 };
    return { opacity: d.o, transform: [{ translateX: d.x }, { translateY: d.y }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-luciole"
      style={[
        {
          ...centre(at, LUCIOLE_DP),
          borderRadius: LUCIOLE_DP,
          backgroundColor: rawColors.isoEclat,
        },
        anime,
      ]}
    />
  );
}

/** Stars joined by thin lines over the whole box; a crest is a closed outline. */
function Constellations({
  groupes,
  boite,
}: {
  groupes: NonNullable<Magie["constellations"]>;
  boite: { w: number; h: number };
}) {
  return (
    <View
      pointerEvents="none"
      testID="batiment-constellation"
      style={{ position: "absolute", left: 0, top: 0, width: boite.w, height: boite.h }}
    >
      <Svg width={boite.w} height={boite.h}>
        {groupes.map((g) => {
          const pts = g.points.map((p) => `${p[0]},${p[1]}`).join(" ");
          return (
            <G key={pts}>
              {g.blason ? (
                <Polygon
                  points={pts}
                  fill="none"
                  stroke={rawColors.isoEclat}
                  strokeOpacity={0.5}
                  strokeWidth={0.6}
                />
              ) : (
                <Polyline
                  points={pts}
                  fill="none"
                  stroke={rawColors.isoEclat}
                  strokeOpacity={0.4}
                  strokeWidth={0.6}
                />
              )}
              {g.points.map((p) => (
                <Circle
                  key={`${p[0]}-${p[1]}`}
                  cx={p[0]}
                  cy={p[1]}
                  r={1}
                  fill={rawColors.isoEclat}
                />
              ))}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

/** The rings, on the ground: they go behind the body. */
export function MagieSol({ magie, px }: { magie: Magie; px: (o: Point) => Point }) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const h = reduit ? null : horloge;
  return (
    <>
      {magie.glyphes?.map((g) => (
        <Glyphe
          key={`${g.at[0]}-${g.at[1]}`}
          at={px(g.at)}
          rayon={g.rayon}
          sens={g.sens}
          horloge={h}
        />
      ))}
    </>
  );
}

/** The breath by day; the night adds the beam, the fireflies and the constellations. */
export function MagieCiel({
  magie,
  px,
  nuit,
  boite,
}: {
  magie: Magie;
  px: (o: Point) => Point;
  nuit: boolean;
  boite: { w: number; h: number };
}) {
  const horloge = useContext(HorlogeContext);
  const reduit = useMouvementReduit();
  const h = reduit ? null : horloge;
  const { souffle, faisceau, lucioles, constellations } = magie;
  // dp per canvas px: the zone is a rectangle of the canvas.
  const k = px([1, 0])[0] - px([0, 0])[0];
  return (
    <>
      {souffle ? (
        <Souffle
          zone={[
            ...px([souffle.zone[0], souffle.zone[1]]),
            souffle.zone[2] * k,
            souffle.zone[3] * k,
          ]}
          at={px(souffle.at)}
          horloge={h}
        />
      ) : null}
      {nuit && faisceau ? <Faisceau at={px(faisceau.at)} haut={faisceau.haut} horloge={h} /> : null}
      {nuit
        ? lucioles?.map((p, i) => <Luciole key={`${p[0]}-${p[1]}`} at={px(p)} i={i} horloge={h} />)
        : null}
      {nuit && constellations ? (
        <Constellations
          groupes={constellations.map((g) => ({ ...g, points: g.points.map(px) }))}
          boite={boite}
        />
      ) : null}
    </>
  );
}
