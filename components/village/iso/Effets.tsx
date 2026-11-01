// The small effects of a trade on a building (T27 point 4, effets.ts): runes over the wizard's
// cone, green motes over the druids' circle, embers at the lair's mouth, a star glint over the
// observatory's dome, sparks at the forge's anvil. Inked, irregular shapes (FIN-MAG), drawn right after the
// sprite so a building in front still covers them. One animated node per building, only the
// buildings the wave picked (VeilleContext.effets), transform and opacity on the ambient clock:
// the group climbs and fades in its own cycle, and is back to nothing at every boundary.
// Nothing at rest, no node for a map without a clock; by day (no warm light) none either.

import { useContext } from "react";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import {
  boiteEffet,
  DECOR_GRAND,
  EFFET_TAILLE,
  EFFETS,
  EffetForceContext,
  effetsJoues,
  effetsPermis,
  FORMES_GRAIN,
  type Forme,
  type GenreEffet,
  montee,
  PARTICULES,
  PARTICULES_BASE,
  PARTICULES_ETOILE,
  PARTICULES_RICHE,
} from "./effets";
import { type Tournante, useTour } from "./familles";
import { dernierStade } from "./fierte";
import { HorlogeContext, reflet } from "./horloge";
import { type Ambiance, type SpriteIso, type Stade, vieDe } from "./isoSpec";
import { ReclamablesContext } from "./reclame";
import { RevelationContext } from "./revelation";
import { graine, VeilleContext } from "./veilleuses";

const ABSOLU = { position: "absolute" } as const;

export function Effets({
  code,
  stade,
  s,
  corps,
  ambiance = "nuit",
}: {
  code: BuildingCode;
  stade: Stade;
  s: SpriteIso;
  corps: Rect;
  ambiance?: Ambiance;
}) {
  const horloge = useContext(HorlogeContext);
  const veille = useContext(VeilleContext);
  const reclames = useContext(ReclamablesContext);
  // T41: the village is quiet while a stage is revealed.
  const revelation = useContext(RevelationContext);
  const force = useContext(EffetForceContext);
  const e = EFFETS[code];
  if (
    revelation ||
    !e ||
    !horloge ||
    !effetsPermis(
      veille ? effetsJoues(veille.effets, force) : undefined,
      reclames?.animes.size ?? 0,
    ).has(code) ||
    !vieDe(ambiance).lueurFeux
  )
    return null;
  const boite = boiteEffet(code, stade, s, corps);
  if (!boite) return null;
  const riche = dernierStade(code, stade);
  const etoile = e.genre === "etoile";
  const grains = etoile
    ? PARTICULES_ETOILE
    : PARTICULES.slice(0, riche ? PARTICULES_RICHE : PARTICULES_BASE);
  const decor = riche && DECOR_GRAND[e.genre]?.map(formeDecor);
  return (
    <Montee
      testID={`iso-effet-${e.siege}-${code}`}
      boite={boite}
      delai={graine(code) / 10000}
      horloge={horloge}
      siege={e.siege}
      hauteur={montee(e.genre, riche)}
    >
      <Svg width={EFFET_TAILLE} height={EFFET_TAILLE} viewBox="0 0 100 100">
        {e.genre !== "braise" && decor}
        {grains.map(([x, y, t], i) => (
          <Particule
            key={`${x},${y}`}
            genre={e.genre}
            x={x}
            y={y}
            t={riche && e.genre === "braise" ? t * 0.7 : t}
            // On a last stage the final spark is gold, what the hero earned (T03).
            couleur={
              riche && i === (etoile ? 0 : PARTICULES_RICHE - 1)
                ? rawColors.resourceGold
                : rawColors[i % 2 ? e.tons[1] : e.tons[0]]
            }
          />
        ))}
        {/* The lair's eyes go over its embers: they must read as eyes. */}
        {e.genre === "braise" && decor}
      </Svg>
    </Montee>
  );
}

/** One shape of a last stage's decor: inked unless it is a faint halo or beam. */
function formeDecor(m: Forme) {
  return m.f === "cercle" && (m.op ?? 1) >= 0.5 ? (
    <Grain
      key={`${m.cx},${m.cy},${m.r}`}
      d={FORMES_GRAIN.lucioles}
      x={m.cx}
      y={m.cy}
      r={m.r}
      couleur={rawColors[m.ton]}
    />
  ) : m.f === "cercle" ? (
    // A faint halo: flat, no ink (it must not outshine what it surrounds).
    <Circle
      key={`${m.cx},${m.cy},${m.r}`}
      cx={m.cx}
      cy={m.cy}
      r={m.r}
      fill={rawColors[m.ton]}
      fillOpacity={m.op ?? 1}
    />
  ) : m.f === "trace" ? (
    <Path
      key={m.d}
      d={m.d}
      stroke={rawColors[m.ton]}
      strokeWidth={m.w}
      strokeLinecap="round"
      fill="none"
    />
  ) : (
    <Path
      key={m.d}
      d={m.d}
      fill={rawColors[m.ton]}
      fillOpacity={m.op}
      // A faint beam takes no ink (it must not outshine its source).
      stroke={m.op >= 0.5 ? rawColors.isoInk : undefined}
      strokeWidth={1}
      strokeLinejoin="round"
    />
  );
}

/** The group climbing and fading in its cycle (horloge.ts `reflet`), still and invisible at every boundary. */
function Montee({
  testID,
  boite,
  delai,
  horloge,
  siege,
  hauteur,
  children,
}: {
  testID: string;
  boite: { x: number; y: number };
  delai: number;
  horloge: SharedValue<number>;
  siege: Tournante;
  hauteur: number;
  children: React.ReactNode;
}) {
  const tour = useTour(siege);
  const style = useAnimatedStyle(() => {
    const { avance, opacite } = reflet(tour(horloge.get()), delai);
    return { opacity: opacite, transform: [{ translateY: -hauteur * avance }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: boite.x, top: boite.y, width: EFFET_TAILLE, height: EFFET_TAILLE },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** The ink around a spark, in the 100 x 100 box. */
const TRAIT_ENCRE = 1.6;

/** A blob or flake of `d` (10 x 10) centred on (x, y), `r` the half-size, turned a little by its place. */
export function Grain({
  d,
  x,
  y,
  r,
  couleur,
  trait = TRAIT_ENCRE,
}: {
  d: string;
  x: number;
  y: number;
  r: number;
  couleur: string;
  /** The ink's width in the box's own units. */
  trait?: number;
}) {
  const k = (r * 2) / 10;
  return (
    <Path
      d={d}
      transform={`translate(${x} ${y}) rotate(${((x * 7 + y * 3) % 50) - 25}) scale(${k}) translate(-5 -5)`}
      fill={couleur}
      stroke={rawColors.isoInk}
      strokeWidth={trait / k}
      strokeLinejoin="round"
    />
  );
}

/** One spark of a genre, centred on (x, y) of the 100 x 100 box, `t` units across. */
export function Particule({
  genre,
  x,
  y,
  t,
  couleur,
}: {
  genre: GenreEffet;
  x: number;
  y: number;
  t: number;
  couleur: string;
}) {
  return (
    <Grain
      d={FORMES_GRAIN[genre]}
      x={x}
      y={y}
      r={t * (genre === "lucioles" ? 0.5 : 1.4)}
      couleur={couleur}
    />
  );
}
