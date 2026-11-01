// A building ready to evolve (L6-T13, VI-29): a fixed hammer above it, inked (dark outline on a
// bone head, so it never relies on a colour), drawn at rest and with reduced motion; and, during a
// wave only, a soft warm halo over the sprite that breathes (E2: a radial fade, 2.5 s a breath so
// it is out at every 5 s cycle boundary; one animated node, VeilleContext says a wave is on).

import { useContext } from "react";
import { View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import { useTour } from "./familles";
import { boiteMarteau } from "./fierte";
import { HorlogeContext } from "./horloge";
import type { SpriteIso, Stade } from "./isoSpec";
import { Marteau } from "./Marteau";
import { ReclamablesContext } from "./reclame";
import { VeilleContext } from "./veilleuses";

const OPACITE_LUEUR = 0.55;
/** One breath of the halo, ms: two to a 5 s cycle. */
const SOUFFLE_MS = 2500;

export function Reclame({
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
  const etat = useContext(ReclamablesContext);
  const horloge = useContext(HorlogeContext);
  const veille = useContext(VeilleContext);
  if (!etat?.tous.has(code)) return null;
  const b = boiteMarteau(code, stade, s, corps);
  return (
    <>
      {etat.animes.has(code) && horloge && veille ? (
        <Lueur code={code} corps={corps} horloge={horloge} />
      ) : null}
      <View
        pointerEvents="none"
        testID={`iso-marteau-${code}`}
        style={{
          position: "absolute",
          left: b.x,
          top: b.y,
          width: b.w,
          height: b.h,
        }}
      >
        <Marteau d={b.w} />
      </View>
    </>
  );
}

function Lueur({
  code,
  corps,
  horloge,
}: {
  code: BuildingCode;
  corps: Rect;
  horloge: SharedValue<number>;
}) {
  const tour = useTour("signal");
  const style = useAnimatedStyle(() => {
    const c = tour(horloge.get());
    // 0 at every breath's start (so at rest), 1 at its middle.
    const souffle = 0.5 - 0.5 * Math.cos((2 * Math.PI * c) / SOUFFLE_MS);
    return { opacity: souffle * OPACITE_LUEUR, transform: [{ scale: 0.94 + 0.08 * souffle }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-lueur-${code}`}
      style={[
        { position: "absolute", left: corps.x, top: corps.y, width: corps.w, height: corps.h },
        style,
      ]}
    >
      <Svg width={corps.w} height={corps.h} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={`halo-${code}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={rawColors.isoLueur} stopOpacity={0.9} />
            <Stop offset="0.6" stopColor={rawColors.isoLueur} stopOpacity={0.35} />
            <Stop offset="1" stopColor={rawColors.isoLueur} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={50} cy={55} rx={48} ry={44} fill={`url(#halo-${code})`} />
      </Svg>
    </Animated.View>
  );
}
