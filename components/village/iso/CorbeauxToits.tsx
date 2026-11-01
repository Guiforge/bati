// A crow on a roof (L5-T10, logic in corbeaux.ts). Perched it is a still inked drawing in a plain
// view: no animated node, nothing read from the clock. A touch of the map that lands near it
// (horloge.ts `EffroiContext`) mounts one animated node, the flight, for DUREE_ENVOL_MS; then the
// crow is gone until a touch lands far from its roof. It is mounted in the depth order right after
// the building it stands on, so it is drawn just above that roof (IsoCarteDemo.tsx).

import { useContext, useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path, Polygon } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import {
  DUREE_ENVOL_MS,
  envolCorbeau,
  POSE_H,
  POSE_L,
  perchoirDe,
  peutEnvoler,
  sensEnvol,
  toucheProche,
  VOL_CORBEAU_DESSIN_H,
  VOL_CORBEAU_DESSIN_L,
  VOL_CORBEAU_H,
  VOL_CORBEAU_L,
} from "./corbeaux";
import { EffroiContext, HorlogeContext } from "./horloge";
import { type Ambiance, type Biome, biomes, type Stade, vieDe } from "./isoSpec";
import { jourDe } from "./marcheurs";
import { OmbreContact } from "./OmbreContact";
import { corbeau, hasard } from "./vivant";

/** The flying crow's drawing: the flock's gull V, alone. */
const VOL_D = corbeau(VOL_CORBEAU_DESSIN_L / 2, VOL_CORBEAU_DESSIN_H * 0.65, 0.9);

type Etat = "pose" | "parti" | { c0: number; sens: 1 | -1 };

export function CorbeauToit({
  code,
  stade,
  masque = false,
  ambiance = "nuit",
  lumiere = "nuit",
  biome = "defaut",
}: {
  code: BuildingCode;
  stade: Stade;
  /** Its building is hidden while a growth plays: so is the crow. */
  masque?: boolean;
  ambiance?: Ambiance;
  /** The light of the map: a crow takes wing by day only (corbeaux.ts `peutEnvoler`). */
  lumiere?: Ambiance;
  biome?: Biome;
}) {
  const horloge = useContext(HorlogeContext);
  const effroi = useContext(EffroiContext);
  const [etat, setEtat] = useState<Etat>("pose");
  const [jour] = useState(() => jourDe(Date.now(), new Date().getTimezoneOffset()));
  const perchoir = vieDe(ambiance).corbeaux ? perchoirDe(code, stade, ambiance) : null;
  const px = perchoir?.x ?? 0;
  const py = perchoir?.y ?? 0;
  const present = perchoir !== null;
  const envolPossible = peutEnvoler(lumiere);

  // The reaction reads shared values and plain numbers only; the two handlers hold the state.
  const effaroucher = (c0: number, sens: 1 | -1) =>
    setEtat((e) => (e === "pose" ? { c0, sens } : e));
  const revenir = () => setEtat((e) => (e === "parti" ? "pose" : e));
  useAnimatedReaction(
    () => effroi?.get().n ?? 0,
    (n, avant) => {
      if (!effroi || !horloge || !present || !envolPossible || n === (avant ?? 0)) return;
      const e = effroi.get();
      // A touch left from before this mount is no news.
      if (horloge.get() - e.c0 > DUREE_ENVOL_MS) return;
      if (toucheProche(px, py, e.x, e.y)) scheduleOnRN(effaroucher, e.c0, sensEnvol(px, e.x));
      else scheduleOnRN(revenir);
    },
  );
  // The flight ends on its own: the node is unmounted, the crow is gone.
  const envol = typeof etat === "object";
  useEffect(() => {
    if (!envol) return;
    const fin = setTimeout(() => setEtat("parti"), DUREE_ENVOL_MS + 50);
    return () => clearTimeout(fin);
  }, [envol]);

  if (!perchoir || masque || etat === "parti") return null;
  const place = {
    position: "absolute",
    left: perchoir.x - (envol ? VOL_CORBEAU_L : POSE_L) / 2,
    top: perchoir.y - (envol ? VOL_CORBEAU_H : POSE_H),
  } as const;
  const b = biomes[biome].vivant;
  if (typeof etat === "object" && horloge)
    return (
      <Envol
        code={code}
        c0={etat.c0}
        sens={etat.sens}
        place={place}
        horloge={horloge}
        fill={rawColors[b.corbeau]}
        bord={rawColors[b.corbeauBord]}
      />
    );
  // Which way it faces: the seed of the day (a crow does not turn round between two visits).
  const face = hasard(jour, 11 + code.length) < 0.5 ? 1 : -1;
  const fill = rawColors[b.corbeau];
  const bord = rawColors[b.corbeauBord];
  return (
    <>
      {/* AUDIT-DA 24: a contact shadow on the ridge; a flying crow has none (polish: it fades as it rises). */}
      <OmbreContact x={perchoir.x} y={perchoir.y} largeur={POSE_L} />
      <View
        pointerEvents="none"
        testID={`iso-corbeau-pose-${code}`}
        style={[place, { width: POSE_L, height: POSE_H, transform: [{ scaleX: face }] }]}
      >
        {/* Inked flat shapes, the flock's colours; the cold edge keeps it readable on a dark roof. */}
        <Svg width={POSE_L} height={POSE_H} viewBox="0 0 14 10">
          <Path d="M1.6 5.4L-0.2 8.2L3.4 7.6Z" fill={fill} stroke={bord} strokeWidth={0.5} />
          <Ellipse cx={6} cy={5.8} rx={4.3} ry={2.7} fill={fill} stroke={bord} strokeWidth={0.5} />
          <Circle cx={10} cy={3.4} r={1.9} fill={fill} stroke={bord} strokeWidth={0.5} />
          <Polygon points="11.6,2.8 14,3.7 11.6,4.4" fill={fill} stroke={bord} strokeWidth={0.4} />
          <Path d="M5.4 8.3V9.8M7.2 8.3V9.8" stroke={bord} strokeWidth={0.6} />
        </Svg>
      </View>
    </>
  );
}

/** The flight: the one animated node a crow ever costs, mounted for its length only. */
function Envol({
  code,
  c0,
  sens,
  place,
  horloge,
  fill,
  bord,
}: {
  code: BuildingCode;
  c0: number;
  sens: 1 | -1;
  place: { position: "absolute"; left: number; top: number };
  horloge: SharedValue<number>;
  fill: string;
  bord: string;
}) {
  const style = useAnimatedStyle(() => {
    const v = envolCorbeau(horloge.get() - c0, sens);
    return {
      opacity: v.opacite,
      transform: [{ translateX: v.dx }, { translateY: v.dy }, { scaleY: v.battement }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-corbeau-envol-${code}`}
      style={[place, { width: VOL_CORBEAU_L, height: VOL_CORBEAU_H }, style]}
    >
      <Svg
        width={VOL_CORBEAU_L}
        height={VOL_CORBEAU_H}
        viewBox={`0 0 ${VOL_CORBEAU_DESSIN_L} ${VOL_CORBEAU_DESSIN_H}`}
      >
        <Path d={VOL_D} fill={fill} stroke={bord} strokeWidth={0.8} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}
