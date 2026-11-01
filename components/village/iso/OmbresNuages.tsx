// The two cloud shadows (bible §5, E5: anim-13, M4-05, T4-07): soft dark patches of the bible's
// shadow at 18 % that drift across the whole map with the wind, by day only, so the map at rest
// keeps a slow, large motion beside its small lives. They ride the map's one clock (horloge.ts)
// and are laid over the sprites, in the camera layer: a soft gradient with no edge reads as a
// shadow passing over roofs and ground alike (IsoCarte keeps its depth order to itself). One
// animated node each, transform only; each is drawn into a small bitmap and enlarged by the GPU
// (the ring's trick, revelation.ts `ECHELLE_BITMAP`): a blur loses nothing. Not mounted at night,
// with reduced motion or in the frozen mode.

import { useContext } from "react";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import { HAUTEUR, LARGEUR } from "./carteDemo";
import { useMouvementReduit } from "./fige";
import { HorlogeContext } from "./horloge";
import type { Ambiance } from "./isoSpec";
import { NUAGES, nuageA } from "./vivant";

/** The bitmap's share of the drawn size: the shadow is a blur, a quarter is plenty. */
const ECHELLE = 0.25;
/** Each lobe at its heart; where the two lobes overlap the patch reaches about the bible's 18 %. */
const OPACITE = 0.13;

export function OmbresNuages({ lumiere = "nuit" }: { lumiere?: Ambiance }) {
  const reduit = useMouvementReduit();
  if (reduit || lumiere !== "jour") return null;
  return (
    <>
      {NUAGES.map((n, i) => (
        <Nuage key={n.decalage} i={i} />
      ))}
    </>
  );
}

function Nuage({ i }: { i: number }) {
  const horloge = useContext(HorlogeContext);
  const n = NUAGES[i] ?? NUAGES[0];
  const w = 2 * n.rx;
  const h = 2 * n.ry;
  const style = useAnimatedStyle(() => {
    const p = nuageA(horloge ? horloge.get() : 0, i, LARGEUR);
    return { transform: [{ translateX: p.x }, { translateY: p.y }, { scale: 1 / ECHELLE }] };
  });
  const id = `iso-nuage-degrade-${i}`;
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-nuage-${i}`}
      style={[
        {
          position: "absolute",
          // The small box is centred on the patch's start (x 0); the scale grows it about its middle.
          left: -(w * ECHELLE) / 2,
          top: n.y * HAUTEUR - (h * ECHELLE) / 2,
          width: w * ECHELLE,
          height: h * ECHELLE,
        },
        style,
      ]}
    >
      <Svg width={w * ECHELLE} height={h * ECHELLE} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={rawColors.isoOmbreNuage} stopOpacity={OPACITE} />
            <Stop offset="0.55" stopColor={rawColors.isoOmbreNuage} stopOpacity={OPACITE * 0.75} />
            <Stop offset="1" stopColor={rawColors.isoOmbreNuage} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Two lobes, so the patch is a cloud's loose shape and not an oval. */}
        <Ellipse cx={w * 0.42} cy={h * 0.55} rx={w * 0.42} ry={h * 0.45} fill={`url(#${id})`} />
        <Ellipse cx={w * 0.66} cy={h * 0.42} rx={w * 0.32} ry={h * 0.4} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}
