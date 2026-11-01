// The night lights over a building's sprite (L5-T07b): a few windows that light and go out during
// a wave, and a glow at the door while a villager stands at it. Flat shapes with hard edges in the
// hearths' glow colour, drawn right after the sprite inside its Maquette so a building in front
// still covers them. Only the buildings the wave picked mount a node (veilleuses.ts): one for all
// of a building's windows, one for a door glow. Nothing at rest, none for a map without a clock.

import { useContext } from "react";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Ellipse, Polygon } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import { accrochesDe, variante } from "./feux";
import { LumieresContext } from "./fige";
import { HorlogeContext } from "./horloge";
import { type Ambiance, type Biome, biomes, type SpriteIso, type Stade, vieDe } from "./isoSpec";
import { allumeOnde, RevelationContext } from "./revelation";
import { boiteFenetres, coinsFenetre, fenetres, porte, VeilleContext } from "./veilleuses";

const OPACITE_FENETRES = 0.85;
// Door glow: small, irregular, faded pool on the ground (T30). Four stacked bands, widest first,
// each a little off-centre and not quite 2:1, so the edge steps down in many faint stages.
// [scale, opacity, dx, ry share] in sprite px of half-width.
const DEMI_PORTE = 34;
const BANDES_PORTE = [
  [1, 0.04, 3, 0.42],
  [0.8, 0.045, -2, 0.52],
  [0.58, 0.05, 2, 0.46],
  [0.36, 0.06, -1, 0.5],
] as const;

export function Veilles({
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
  const veille = useContext(VeilleContext);
  const revelation = useContext(RevelationContext);
  const lumieres = useContext(LumieresContext);
  const a = accrochesDe(code, stade);
  // F2: by day the map shows the day painting, so no night window needs covering (T38's panes are gone).
  if (!lumieres || !a || !veille || !horloge || !vieDe(ambiance).lueurFeux) return null;
  const k = corps.w / s.size[0];
  const couleur = rawColors[biomes[biome].feu.lueur];
  // T41: during a reveal the wave's lights and door glows are off; the golden wave lights its own windows.
  if (revelation)
    return revelation.allume.has(code) && a.fenetres.length > 0 ? (
      <Fenetres
        boite={boiteFenetres(a)}
        coins={a.fenetres.map(coinsFenetre)}
        corps={corps}
        k={k}
        n={variante(code)}
        couleur={couleur}
        horloge={horloge}
        onde={{ t: revelation.t, retard: revelation.retards.get(code) ?? 0 }}
        testID={`iso-fenetres-${code}`}
      />
    ) : null;
  const visites = veille.portes[code];
  return (
    <>
      {veille.fenetres.has(code) && a.fenetres.length > 0 ? (
        <Fenetres
          boite={boiteFenetres(a)}
          coins={a.fenetres.map(coinsFenetre)}
          corps={corps}
          k={k}
          n={variante(code)}
          couleur={couleur}
          horloge={horloge}
          testID={`iso-fenetres-${code}`}
        />
      ) : null}
      {visites && a.porte ? (
        <Porte
          px={a.porte}
          visites={visites}
          c0={veille.c0}
          corps={corps}
          k={k}
          couleur={couleur}
          horloge={horloge}
          testID={`iso-porte-${code}`}
        />
      ) : null}
    </>
  );
}

function Fenetres({
  boite,
  coins,
  corps,
  k,
  n,
  couleur,
  horloge,
  onde,
  testID,
}: {
  boite: { x: number; y: number; w: number; h: number };
  coins: readonly (readonly (readonly [number, number])[])[];
  corps: Rect;
  k: number;
  n: number;
  couleur: string;
  horloge: SharedValue<number>;
  /** T41: lit by the reveal's golden wave instead of the ambient clock. */
  onde?: { t: SharedValue<number>; retard: number };
  testID: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: onde ? allumeOnde(onde.t.get(), onde.retard) : fenetres(horloge.get(), n),
  }));
  const [w, h] = [boite.w * k, boite.h * k];
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        {
          position: "absolute",
          left: corps.x + boite.x * k,
          top: corps.y + boite.y * k,
          width: w,
          height: h,
        },
        style,
      ]}
    >
      <Svg width={w} height={h} viewBox={`${boite.x} ${boite.y} ${boite.w} ${boite.h}`}>
        {coins.map((c) => (
          <Polygon
            key={c.join()}
            points={c.map((p) => p.join(",")).join(" ")}
            fill={couleur}
            fillOpacity={OPACITE_FENETRES}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Porte({
  px,
  visites,
  c0,
  corps,
  k,
  couleur,
  horloge,
  testID,
}: {
  px: readonly [number, number];
  visites: readonly (readonly [number, number])[];
  c0: number;
  corps: Rect;
  k: number;
  couleur: string;
  horloge: SharedValue<number>;
  testID: string;
}) {
  const style = useAnimatedStyle(() => ({ opacity: porte(horloge.get() - c0, visites) }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        {
          position: "absolute",
          left: corps.x + (px[0] - DEMI_PORTE) * k,
          top: corps.y + (px[1] - DEMI_PORTE / 2) * k,
          width: 2 * DEMI_PORTE * k,
          height: DEMI_PORTE * k,
        },
        style,
      ]}
    >
      <Svg
        width={2 * DEMI_PORTE * k}
        height={DEMI_PORTE * k}
        viewBox={`0 0 ${2 * DEMI_PORTE} ${DEMI_PORTE}`}
      >
        {BANDES_PORTE.map(([e, o, dx, r]) => (
          <Ellipse
            key={e}
            cx={DEMI_PORTE + dx}
            cy={DEMI_PORTE / 2}
            rx={DEMI_PORTE * e}
            ry={DEMI_PORTE * e * r}
            fill={couleur}
            fillOpacity={o}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
