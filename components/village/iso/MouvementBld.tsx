// The motion layer of a building (LIFE M1): what its motion file (motion/<code>.json) names, drawn
// on the still painting. It stands where the building's lights stood (BatimentMoteur's `Avant`):
// the lights are its `lueur` entries, so a building with a file draws them here and nowhere else.
// Everything reads the map's one clock (HorlogeContext) and loops nothing; transform and opacity
// only; never tappable. A building that is not in the wave (VeilleContext.mouvement), a map with
// no clock, reduced motion and a stage being revealed draw the still light and nothing else: no
// animated node, which is also what keeps the layer inside MOUVEMENT_NOEUDS_MAX.

import { Image } from "expo-image";
import { useContext, useEffect, useRef } from "react";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse, Path } from "react-native-svg";
import type { Point } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { FUMEE_LARGEUR, flamme, fumee, MOUVEMENT_FUMEE, SORTES_FUMEE, VOLUTE } from "./feux";
import { inclinaisonBanniere } from "./fierte";
import { useMouvementReduit } from "./fige";
import { HorlogeContext, reflet } from "./horloge";
import { LueurDouce } from "./LueurDouce";
import { jourDe } from "./marcheurs";
import { MOUVEMENTS } from "./motion";
import type { Effet, Lueur, Miroitement, Particules, Vent } from "./motion/types";
import {
  allumage,
  dureeAllumage,
  effetsAuRang,
  ordreAllumage,
  phaseBouffee,
  RAYON_LUEUR,
} from "./mouvement";
import { PEINTS } from "./peints";
import { RevelationContext } from "./revelation";
import { graine, VeilleContext } from "./veilleuses";

const ABSOLU = { position: "absolute" } as const;
/** The dusk clock's value for "every window already lit": a map opened at night, a day gone. */
const TOUT_ALLUME = 1e9;

/**
 * M6 placeholder: the one drawing every particle wears until the small painted sprites land (no
 * painted smoke, spark or mote exists in assets/ today). It is the ink-outlined cloud smoke has
 * had since feux.ts; swap this constant (and the `Grain` below) for a painted image per genre.
 */
const GRAIN_PLACEHOLDER = { d: VOLUTE, w: 100, h: 64 } as const;

type Props = {
  code: BuildingCode;
  stade: VisualStage;
  rank: number;
  base: number;
  nuit: boolean;
  /** Canvas px to map dp. */
  px: (p: Point) => Point;
  /** Map dp per canvas px. */
  k: number;
};

export function MouvementBld({ code, stade, rank, base, nuit, px, k }: Props) {
  const horloge = useContext(HorlogeContext);
  const veille = useContext(VeilleContext);
  const revelation = useContext(RevelationContext);
  const reduit = useMouvementReduit();
  const effets = effetsAuRang(MOUVEMENTS[code]?.effets ?? [], rank, base, nuit);
  const joue = !!horloge && !reduit && !revelation && !!veille?.mouvement?.has(code);
  const lueurs = effets.filter((e): e is Lueur => e.kind === "lueur");
  const fenetres = lueurs.filter((e) => e.lueur === "fenetre");
  // Dusk: how many ms the lighting of the windows has run. Every window is lit unless a night
  // starts while the map is open and in the wave (a clock that has stopped would leave it half way).
  const t = useSharedValue(TOUT_ALLUME);
  const etaitNuit = useRef(nuit);
  useEffect(() => {
    if (nuit && !etaitNuit.current && joue) {
      t.set(0);
      t.set(
        withTiming(dureeAllumage(fenetres.length), {
          duration: dureeAllumage(fenetres.length),
          easing: Easing.linear,
        }),
      );
    } else if (!nuit) t.set(TOUT_ALLUME);
    etaitNuit.current = nuit;
  }, [nuit, joue, fenetres.length, t]);
  const ordre = ordreAllumage(
    fenetres.length,
    `${code}:${jourDe(Date.now(), new Date().getTimezoneOffset())}`,
  );

  const image = PEINTS[code]?.stades[stade]?.[nuit ? "nuit" : "jour"];
  return (
    <>
      {effets.map((e, i) => (
        <Dessin
          key={`${e.kind}-${e.at.join()}`}
          e={e}
          i={i}
          code={code}
          px={px}
          k={k}
          horloge={joue ? horloge : null}
          t={t}
          tour={ordre[fenetres.indexOf(e as Lueur)] ?? 0}
          fenetre={fenetres.includes(e as Lueur)}
          image={image}
        />
      ))}
    </>
  );
}

/** One entry of the file: moving when the layer plays (`horloge`), else only a still light. */
function Dessin({
  e,
  i,
  code,
  px,
  k,
  horloge,
  t,
  tour,
  fenetre,
  image,
}: {
  e: Effet;
  i: number;
  code: BuildingCode;
  px: (p: Point) => Point;
  k: number;
  horloge: SharedValue<number> | null;
  t: SharedValue<number>;
  tour: number;
  fenetre: boolean;
  image: Parameters<typeof Flotte>[0]["image"];
}) {
  if (e.kind === "lueur") {
    return horloge ? (
      <LueurVive
        e={e}
        at={px(e.at)}
        horloge={horloge}
        n={i % 3}
        t={fenetre ? t : null}
        tour={tour}
        testID={`iso-${fenetre ? "fenetres" : "flamme"}-${code}-${i}`}
      />
    ) : (
      <LueurDouce kind={e.lueur} at={px(e.at)} rayon={RAYON_LUEUR[e.lueur]} />
    );
  }
  if (!horloge) return null;
  if (e.kind === "particules")
    return <Bouffees e={e} at={px(e.at)} horloge={horloge} code={code} />;
  if (e.kind === "miroitement")
    return <Miroite e={e} at={px(e.at)} k={k} horloge={horloge} code={code} />;
  return <Flotte e={e} px={px} k={k} horloge={horloge} code={code} image={image} />;
}

/** A light on the clock: a fire breathes (feux.ts `flamme`, stronger than the flame's own dip), a window comes up on its turn at dusk. */
function LueurVive({
  e,
  at,
  horloge,
  n,
  t,
  tour,
  testID,
}: {
  e: Lueur;
  at: Point;
  horloge: SharedValue<number>;
  n: number;
  t: SharedValue<number> | null;
  tour: number;
  testID: string;
}) {
  const rayon = RAYON_LUEUR[e.lueur];
  const style = useAnimatedStyle(() => {
    const f = flamme(horloge.get(), n);
    const souffle = e.lueur === "fire" ? 1 - 3 * (1 - f.opacite) : f.opacite;
    return {
      opacity: (t ? allumage(t.get(), tour) : 1) * souffle,
      transform: [{ scale: e.lueur === "fire" ? f.echelle : 1 }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: at[0] - rayon, top: at[1] - rayon, width: rayon * 2, height: rayon * 2 },
        style,
      ]}
    >
      <LueurDouce kind={e.lueur} at={[rayon, rayon]} rayon={rayon} />
    </Animated.View>
  );
}

/** `nb` puffs of the placeholder sprite, climbing in turn: the plume of feux.ts, smaller. */
function Bouffees({
  e,
  at,
  horloge,
  code,
}: {
  e: Particules;
  at: Point;
  horloge: SharedValue<number>;
  code: BuildingCode;
}) {
  const decalage = (graine(`${code}:${e.at.join()}`) % 10) / 10;
  return (
    <>
      {Array.from({ length: e.nb }, (_, i) => (
        <Bouffee
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed count, never reordered
          key={i}
          at={at}
          taille={e.taille}
          horloge={horloge}
          sorte={SORTES_FUMEE[i % SORTES_FUMEE.length] ?? "ronde"}
          i={i}
          nb={e.nb}
          decalage={decalage}
          testID={`iso-fumee-${code}-${i}`}
        />
      ))}
    </>
  );
}

function Bouffee({
  at,
  taille,
  horloge,
  sorte,
  i,
  nb,
  decalage,
  testID,
}: {
  at: Point;
  taille: number;
  horloge: SharedValue<number>;
  sorte: (typeof SORTES_FUMEE)[number];
  i: number;
  nb: number;
  decalage: number;
  testID: string;
}) {
  const echelle = taille / FUMEE_LARGEUR;
  const phase = phaseBouffee(i, nb, MOUVEMENT_FUMEE[sorte].duree, decalage);
  const style = useAnimatedStyle(() => {
    const m = fumee(horloge.get(), phase, sorte, 1, i === 0 ? 1 : 0.6);
    return {
      opacity: m.opacite,
      transform: [
        { translateX: m.x * echelle },
        { translateY: m.y * echelle },
        { scale: m.echelle },
      ],
    };
  });
  const h = (taille * GRAIN_PLACEHOLDER.h) / GRAIN_PLACEHOLDER.w;
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: at[0] - taille / 2, top: at[1] - h, width: taille, height: h },
        style,
      ]}
    >
      <Svg width={taille} height={h} viewBox={`0 0 ${GRAIN_PLACEHOLDER.w} ${GRAIN_PLACEHOLDER.h}`}>
        <Path
          d={GRAIN_PLACEHOLDER.d}
          fill={rawColors.isoFumee}
          stroke={rawColors.isoInk}
          strokeWidth={4.5}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

/** `nb` pale glints sliding over the water (horloge.ts `reflet`, the canal's own), one node each. */
function Miroite({
  e,
  at,
  k,
  horloge,
  code,
}: {
  e: Miroitement;
  at: Point;
  k: number;
  horloge: SharedValue<number>;
  code: BuildingCode;
}) {
  return (
    <>
      {Array.from({ length: e.nb }, (_, i) => (
        <Eclat
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed count, never reordered
          key={i}
          at={at}
          portee={e.rayon * k}
          delai={i / e.nb}
          sens={i % 2 ? -1 : 1}
          horloge={horloge}
          testID={`iso-reflets-${code}-${i}`}
        />
      ))}
    </>
  );
}

const ECLAT_L = 9;
const ECLAT_H = 3;

function Eclat({
  at,
  portee,
  delai,
  sens,
  horloge,
  testID,
}: {
  at: Point;
  portee: number;
  delai: number;
  sens: 1 | -1;
  horloge: SharedValue<number>;
  testID: string;
}) {
  const style = useAnimatedStyle(() => {
    const r = reflet(horloge.get(), delai);
    return {
      opacity: 0.7 * r.opacite,
      transform: [{ translateX: sens * (r.avance - 0.5) * portee }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        {
          left: at[0] - ECLAT_L / 2 + sens * portee * 0.15,
          top: at[1] + (delai - 0.5) * portee * 0.2,
          width: ECLAT_L,
          height: ECLAT_H,
        },
        style,
      ]}
    >
      <Svg width={ECLAT_L} height={ECLAT_H}>
        <Ellipse
          cx={ECLAT_L / 2}
          cy={ECLAT_H / 2}
          rx={ECLAT_L / 2}
          ry={ECLAT_H / 2}
          fill={rawColors.isoEclat}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * A flag or banner that is part of the painting: a clipped copy of the sprite's own `zone`, laid
 * over it and slanted about the pole on the banner sway (fierte.ts). The copy hides the still flag
 * under it; where it slides off, a sliver of the original shows. Clean only on a flag against a
 * plain background (sky): over planks or a water jet the copy drags them along (motion files leave
 * such a flag out).
 */
function Flotte({
  e,
  px,
  k,
  horloge,
  code,
  image,
}: {
  e: Vent;
  px: (p: Point) => Point;
  k: number;
  horloge: SharedValue<number>;
  code: BuildingCode;
  image: { image: number; size: readonly [number, number] } | undefined;
}) {
  const [zx, zy, zw, zh] = e.zone;
  const [x, y] = px([zx, zy]);
  const battements = 1 + (graine(code) % 3);
  const style = useAnimatedStyle(() => ({
    transform: [{ skewX: `${inclinaisonBanniere(horloge.get(), battements)}rad` }],
  }));
  if (!image) return null;
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-banniere-${code}-vent`}
      style={[
        ABSOLU,
        {
          left: x,
          top: y,
          width: zw * k,
          height: zh * k,
          overflow: "hidden",
          transformOrigin: [(e.pivot[0] - zx) * k, (e.pivot[1] - zy) * k, 0],
        },
        style,
      ]}
    >
      <Image
        source={image.image}
        contentFit="fill"
        style={{
          position: "absolute",
          left: -zx * k,
          top: -zy * k,
          width: image.size[0] * k,
          height: image.size[1] * k,
        }}
      />
    </Animated.View>
  );
}
