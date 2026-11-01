// What a building's last stage wears (T03, fierte.ts): warm windows lit all night, a banner the app
// draws from the top of the painting (oxblood cloth, gold trim, a gold finial), and at the highest
// rank a small glint on the finial. All still drawings, posed like the fire (FeuxDessines.tsx) in
// the sprite's own conversion, so a building in front still covers them. The one animated node is
// a legendary glint's twinkle, on ECLATS_ANIMES buildings and during a wave only. No tap, never
// read aloud (the map is hidden from the screen reader).

import { type ReactNode, useContext } from "react";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import { useTour } from "./familles";
import { accrochesDe } from "./feux";
import {
  avecBanniere,
  BANNIERE_H,
  BANNIERE_L,
  balancement,
  boiteBanniere,
  dernierStade,
  inclinaisonBanniere,
  sommetDp,
} from "./fierte";
import { HorlogeContext, reflet } from "./horloge";
import { type Ambiance, type Biome, biomes, type SpriteIso, type Stade, vieDe } from "./isoSpec";
import { boiteFenetres, coinsFenetre, graine, VeilleContext } from "./veilleuses";

const OPACITE_FENETRES = 0.8;
// The banner in a 100 x 112 box: the pole from the foot (fierte.ts PIED) up to the finial, and a
// swallow-tailed cloth flying to the right from it.
const TISSU = "M14 16L94 22L78 38L94 56L14 58Z";
const FINIAL: readonly [number, number] = [12, 9];
// The glint: a 2 dp pale point (no cross, H2-08) centred on the finial, in its own box of ECLAT dp.
const ECLAT = 14;
/** How much the glint swells at the height of its twinkle. */
const SCINTILLE = 0.9;

const ABSOLU = { position: "absolute" } as const;

export function Fierte({
  code,
  stade,
  s,
  corps,
  biome,
  ambiance = "nuit",
  legendaire,
  anime,
  tissu = null,
  banniere = true,
}: {
  code: BuildingCode;
  stade: Stade;
  s: SpriteIso;
  corps: Rect;
  biome: Biome;
  ambiance?: Ambiance;
  /** At its highest rank: a glint on the finial. */
  legendaire: boolean;
  /** One of the glints that twinkle in a wave. */
  anime: boolean;
  /** The crest's colour (fierte.ts tissuBlason), else the biome's cloth. */
  tissu?: string | null;
  /** Flies the pole and cloth (fierte.ts `bannieres`); false keeps the lit windows only. */
  banniere?: boolean;
}) {
  const horloge = useContext(HorlogeContext);
  const veille = useContext(VeilleContext);
  if (!dernierStade(code, stade)) return null;
  const c = biomes[biome].fierte;
  const a = accrochesDe(code, stade);
  const k = corps.w / s.size[0];
  const haut = banniere && avecBanniere(code, stade) ? sommetDp(s, corps) : null;
  const b = haut ? boiteBanniere(haut) : null;
  const finial: readonly [number, number] | null = b
    ? [b.x + (FINIAL[0] / 100) * BANNIERE_L, b.y + (FINIAL[1] / 112) * BANNIERE_H]
    : null;
  return (
    <>
      {a && a.fenetres.length > 0 && vieDe(ambiance).lueurFeux ? (
        <Fenetres
          boite={boiteFenetres(a)}
          coins={a.fenetres.map(coinsFenetre)}
          corps={corps}
          k={k}
          couleur={rawColors[c.fenetre]}
          testID={`iso-vitres-${code}`}
        />
      ) : null}
      {b ? (
        <Flotte
          boite={b}
          battements={balancement(code)}
          horloge={horloge}
          testID={`iso-banniere-${code}`}
        >
          <Line
            x1={12}
            y1={112}
            x2={12}
            y2={FINIAL[1]}
            stroke={rawColors[c.encre]}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <Line
            x1={12}
            y1={110}
            x2={12}
            y2={FINIAL[1]}
            stroke={rawColors[c.hampe]}
            strokeWidth={5}
          />
          <Path
            d={TISSU}
            fill={tissu ?? rawColors[c.tissu]}
            stroke={rawColors[c.lisere]}
            strokeWidth={5}
            strokeLinejoin="round"
          />
          <Circle
            cx={FINIAL[0]}
            cy={FINIAL[1]}
            r={7}
            fill={rawColors[c.lisere]}
            stroke={rawColors[c.encre]}
            strokeWidth={2.5}
          />
        </Flotte>
      ) : null}
      {/* No fixed star on the mast (anim-10): the glint shows only while it twinkles. */}
      {finial && legendaire && anime && horloge && veille ? (
        <Scintille
          centre={finial}
          couleur={rawColors.isoJourLavis}
          delai={graine(code) / 10000}
          horloge={horloge}
          testID={`iso-eclat-anime-${code}`}
        />
      ) : null}
    </>
  );
}

/** The banner's box, tilting slowly about the pole's foot on the clock; the drawing inside is still. */
function Flotte({
  boite,
  battements,
  horloge,
  testID,
  children,
}: {
  boite: Rect;
  battements: number;
  horloge: SharedValue<number> | null;
  testID: string;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${horloge ? inclinaisonBanniere(horloge.get(), battements) : 0}rad` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: boite.x, top: boite.y, width: boite.w, height: boite.h },
        { transformOrigin: [(12 / 100) * boite.w, boite.h] },
        style,
      ]}
    >
      <Svg width={boite.w} height={boite.h} viewBox="0 0 100 112">
        {children}
      </Svg>
    </Animated.View>
  );
}

const carre = ([x, y]: readonly [number, number]) => ({
  left: x - ECLAT / 2,
  top: y - ECLAT / 2,
  width: ECLAT,
  height: ECLAT,
});

function Etoile({ couleur }: { couleur: string }) {
  return (
    <Svg width={ECLAT} height={ECLAT} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={7} fill={couleur} />
    </Svg>
  );
}

/** The glint twinkling on the clock: it swells and turns a little, back to its still pose at every cycle boundary. */
function Scintille({
  centre,
  couleur,
  delai,
  horloge,
  testID,
}: {
  centre: readonly [number, number];
  couleur: string;
  delai: number;
  horloge: SharedValue<number>;
  testID: string;
}) {
  const tour = useTour("signal");
  const style = useAnimatedStyle(() => {
    const { opacite } = reflet(tour(horloge.get()), delai);
    return {
      opacity: 0.4 * opacite,
      transform: [{ scale: 1 + SCINTILLE * opacite }],
    };
  });
  return (
    <Animated.View pointerEvents="none" testID={testID} style={[ABSOLU, carre(centre), style]}>
      <Etoile couleur={couleur} />
    </Animated.View>
  );
}

/** A last stage's windows, lit and still (the wave's blinking ones, VeillesDessinees.tsx, play over them). */
function Fenetres({
  boite,
  coins,
  corps,
  k,
  couleur,
  testID,
}: {
  boite: { x: number; y: number; w: number; h: number };
  coins: readonly (readonly (readonly [number, number])[])[];
  corps: Rect;
  k: number;
  couleur: string;
  testID: string;
}) {
  const [w, h] = [boite.w * k, boite.h * k];
  return (
    <Svg
      pointerEvents="none"
      testID={testID}
      width={w}
      height={h}
      viewBox={`${boite.x} ${boite.y} ${boite.w} ${boite.h}`}
      style={[ABSOLU, { left: corps.x + boite.x * k, top: corps.y + boite.y * k }]}
    >
      {coins.map((p) => (
        <Polygon
          key={p.join()}
          points={p.map((q) => q.join(",")).join(" ")}
          fill={couleur}
          fillOpacity={OPACITE_FENETRES}
        />
      ))}
    </Svg>
  );
}
