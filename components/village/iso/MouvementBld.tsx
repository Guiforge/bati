// The motion layer of a building (LIFE M1): what its motion file (motion/<code>.json) names, drawn
// on the still painting. It stands where the building's lights stood (BatimentMoteur's `Avant`):
// the lights are its `lueur` entries, so a building with a file draws them here and nowhere else.
// Everything reads the map's one clock (HorlogeContext) and loops nothing; transform and opacity
// only; never tappable. A building that is not in the wave (VeilleContext.mouvement), a map with
// no clock, reduced motion and a stage being revealed draw the still light and nothing else: no
// animated node, which is also what keeps the layer inside MOUVEMENT_NOEUDS_MAX.

import { Image } from "expo-image";
import { useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse } from "react-native-svg";
import type { Point } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { FUMEE_LARGEUR, flamme, fumee, MOUVEMENT_FUMEE, SORTES_FUMEE } from "./feux";
import { inclinaisonBanniere } from "./fierte";
import { useMouvementReduit } from "./fige";
import { HorlogeContext, reflet } from "./horloge";
import { LueurDouce } from "./LueurDouce";
import { jourDe } from "./marcheurs";
import { MOUVEMENTS } from "./motion";
import type { Effet, Flamme, Genre, Lueur, Miroitement, Particules, Vent } from "./motion/types";
import {
  allumage,
  dephasage,
  dureeAllumage,
  effetsAuRang,
  fenetresSeules,
  ordreAllumage,
  phaseBouffee,
  RAYON_LUEUR,
  respirationFlamme,
  souffleLueur,
} from "./mouvement";
import { PEINTS } from "./peints";
import { RevelationContext } from "./revelation";
import { graine, VeilleContext } from "./veilleuses";

const ABSOLU = { position: "absolute" } as const;
/** The dusk clock's value for "every window already lit": a map opened at night, a day gone. */
const TOUT_ALLUME = 1e9;

/** M6: the painted sprite(s) of each kind of particle (96 px squares, assets/images/village/iso/mouvement). */
const GRAINS: Record<Genre, readonly number[]> = {
  fumee: [
    require("@/assets/images/village/iso/mouvement/smoke_1.webp"),
    require("@/assets/images/village/iso/mouvement/smoke_2.webp"),
  ],
  vapeur: [require("@/assets/images/village/iso/mouvement/steam.webp")],
  etincelle: [require("@/assets/images/village/iso/mouvement/spark.webp")],
  braise: [require("@/assets/images/village/iso/mouvement/ember.webp")],
  poussiere: [
    require("@/assets/images/village/iso/mouvement/dust_1.webp"),
    require("@/assets/images/village/iso/mouvement/dust_2.webp"),
  ],
  magie: [require("@/assets/images/village/iso/mouvement/mote.webp")],
};

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
  // A painted flame is read on its own stage's painting only.
  const effets = effetsAuRang(MOUVEMENTS[code]?.effets ?? [], rank, base, nuit).filter(
    (e) => e.kind !== "flamme" || e.stade === stade,
  );
  const joue = !!horloge && !reduit && !revelation && !!veille?.mouvement?.has(code);
  const fenetres = effets.filter((e): e is Lueur => e.kind === "lueur" && e.lueur === "fenetre");
  const autres = effets.filter((e) => !fenetres.includes(e as Lueur));
  const phase = dephasage(code);
  // Dusk: how many ms the lighting of the windows has run. Every window is lit unless a night
  // starts while the map is open and in the wave (a clock that has stopped would leave it half way).
  const t = useSharedValue(TOUT_ALLUME);
  // Whether the dusk is still lighting them: the windows are a node each then, one group after.
  const [crepuscule, setCrepuscule] = useState(false);
  const etaitNuit = useRef(nuit);
  useEffect(() => {
    let fin: ReturnType<typeof setTimeout> | undefined;
    if (nuit && !etaitNuit.current && joue) {
      const duree = dureeAllumage(fenetres.length);
      t.set(0);
      t.set(withTiming(duree, { duration: duree, easing: Easing.linear }));
      setCrepuscule(true);
      // one end-of-dusk switch on the JS thread, not a clock: the group then takes over at 1
      fin = setTimeout(() => setCrepuscule(false), duree + 50);
    } else {
      if (!nuit) t.set(TOUT_ALLUME);
      setCrepuscule(false);
    }
    etaitNuit.current = nuit;
    return () => clearTimeout(fin);
  }, [nuit, joue, fenetres.length, t]);
  const ordre = ordreAllumage(
    fenetres.length,
    `${code}:${jourDe(Date.now(), new Date().getTimezoneOffset())}`,
  );

  const image = PEINTS[code]?.stades[stade]?.[nuit ? "nuit" : "jour"];
  return (
    <>
      {autres.map((e, i) => (
        <Dessin
          key={`${e.kind}-${e.at.join()}`}
          e={e}
          i={i}
          code={code}
          px={px}
          k={k}
          horloge={joue ? horloge : null}
          phase={phase}
          image={image}
        />
      ))}
      {fenetres.length > 0 && (
        <Fenetres
          fenetres={fenetres}
          ordre={ordre}
          seules={fenetresSeules(code, veille?.mouvement ?? new Set(), fenetres.length)}
          crepuscule={crepuscule}
          code={code}
          px={px}
          horloge={joue ? horloge : null}
          t={t}
          phase={phase}
        />
      )}
    </>
  );
}

/**
 * A building's windows: one animated node when they are all lit (they breathe as one). While the
 * dusk lights them (`crepuscule`) the first `seules` in their turn order are a node each, coming up
 * one by one; the rest wait in a group that comes up after them (the wave's node budget, see
 * mouvement.ts `fenetresSeules`). Without the clock each is its own still light.
 */
function Fenetres({
  fenetres,
  ordre,
  seules,
  crepuscule,
  code,
  px,
  horloge,
  t,
  phase,
}: {
  fenetres: readonly Lueur[];
  ordre: readonly number[];
  seules: number;
  crepuscule: boolean;
  code: BuildingCode;
  px: (p: Point) => Point;
  horloge: SharedValue<number> | null;
  t: SharedValue<number>;
  phase: number;
}) {
  const commun = { code, px, horloge, t, phase };
  if (!horloge || !crepuscule)
    return <GroupeFenetres {...commun} fenetres={fenetres} tour={0} nom="" />;
  const tour = (i: number) => ordre[i] ?? 0;
  const reste = fenetres.filter((_, i) => tour(i) >= seules);
  return (
    <>
      {fenetres.map((e, i) =>
        tour(i) < seules ? (
          <GroupeFenetres
            key={e.at.join()}
            {...commun}
            fenetres={[e]}
            tour={tour(i)}
            nom={`-${tour(i)}`}
          />
        ) : null,
      )}
      {reste.length > 0 && <GroupeFenetres {...commun} fenetres={reste} tour={seules} nom="" />}
    </>
  );
}

/** One animated node round `fenetres` (a box round them all, never a zero-sized view), lit from its `tour` of the dusk. */
function GroupeFenetres({
  fenetres,
  tour,
  nom,
  code,
  px,
  horloge,
  t,
  phase,
}: {
  fenetres: readonly Lueur[];
  tour: number;
  nom: string;
  code: BuildingCode;
  px: (p: Point) => Point;
  horloge: SharedValue<number> | null;
  t: SharedValue<number>;
  phase: number;
}) {
  const r = RAYON_LUEUR.fenetre;
  const pts = fenetres.map((e) => px(e.at));
  const x0 = Math.min(...pts.map((p) => p[0])) - r;
  const y0 = Math.min(...pts.map((p) => p[1])) - r;
  const x1 = Math.max(...pts.map((p) => p[0])) + r;
  const y1 = Math.max(...pts.map((p) => p[1])) + r;
  const battements = 1 + (graine(code) % 2);
  // Opacity only: the same breath on a window alone and on the group, so the switch is not seen.
  const style = useAnimatedStyle(() => {
    if (!horloge) return { opacity: 1 };
    return { opacity: allumage(t.get(), tour) * souffleLueur(horloge.get(), phase, battements) };
  });
  const halos = pts.map((p, i) => (
    <LueurDouce
      // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list, never reordered
      key={i}
      kind="fenetre"
      at={[p[0] - x0, p[1] - y0]}
      rayon={r}
    />
  ));
  if (!horloge)
    return (
      <View pointerEvents="none" style={[ABSOLU, boite(x0, y0, x1, y1)]}>
        {halos}
      </View>
    );
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-fenetres-${code}${nom}`}
      style={[ABSOLU, boite(x0, y0, x1, y1), style]}
    >
      {halos}
    </Animated.View>
  );
}

const boite = (x0: number, y0: number, x1: number, y1: number) => ({
  left: x0,
  top: y0,
  width: x1 - x0,
  height: y1 - y0,
});

/** One entry of the file: moving when the layer plays (`horloge`), else only a still light. */
function Dessin({
  e,
  i,
  code,
  px,
  k,
  horloge,
  phase,
  image,
}: {
  e: Effet;
  i: number;
  code: BuildingCode;
  px: (p: Point) => Point;
  k: number;
  horloge: SharedValue<number> | null;
  phase: number;
  image: Parameters<typeof Flotte>[0]["image"];
}) {
  if (e.kind === "lueur") {
    return horloge ? (
      <LueurVive
        e={e}
        at={px(e.at)}
        horloge={horloge}
        n={(graine(code) + i) % 3}
        phase={phase}
        testID={`iso-flamme-${code}-${i}`}
      />
    ) : (
      <LueurDouce kind={e.lueur} at={px(e.at)} rayon={RAYON_LUEUR[e.lueur]} />
    );
  }
  if (!horloge) return null;
  if (e.kind === "particules")
    return <Bouffees e={e} at={px(e.at)} horloge={horloge} code={code} />;
  if (e.kind === "miroitement")
    return <Miroite e={e} at={px(e.at)} k={k} horloge={horloge} code={code} phase={phase} />;
  if (e.kind === "flamme")
    return (
      <Respire e={e} px={px} k={k} horloge={horloge} code={code} image={image} phase={phase} />
    );
  return <Flotte e={e} px={px} k={k} horloge={horloge} code={code} image={image} />;
}

/**
 * A light on the clock: a fire breathes (feux.ts `flamme`, stronger than the flame's own dip, its
 * beats shifted by the building), any other light takes the slow candle breath of mouvement.ts
 * `souffleLueur` (the halo shrinks as it dims, so the change reads at phone size).
 */
function LueurVive({
  e,
  at,
  horloge,
  n,
  phase,
  testID,
}: {
  e: Lueur;
  at: Point;
  horloge: SharedValue<number>;
  n: number;
  phase: number;
  testID: string;
}) {
  const rayon = RAYON_LUEUR[e.lueur];
  const feu = e.lueur === "fire";
  const style = useAnimatedStyle(() => {
    if (feu) {
      const f = flamme(horloge.get(), n);
      return { opacity: 1 - 3 * (1 - f.opacite), transform: [{ scale: f.echelle }] };
    }
    const s = souffleLueur(horloge.get(), phase, 1 + (n % 2));
    return { opacity: s, transform: [{ scale: 0.9 + 0.1 * s }] };
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

/** A puff climbs this much further than the plume of feux.ts (scaled by its size): at 8 to 10 dp it climbed 10 dp and was lost against the roof. */
const MONTEE_LISIBLE = 1.5;

/** `nb` puffs of the genre's painted sprite, climbing in turn: the plume of feux.ts, smaller. */
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
          genre={e.genre}
          horloge={horloge}
          sorte={SORTES_FUMEE[(graine(code) + i) % SORTES_FUMEE.length] ?? "ronde"}
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
  genre,
  horloge,
  sorte,
  i,
  nb,
  decalage,
  testID,
}: {
  at: Point;
  taille: number;
  genre: Genre;
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
        { translateX: m.x * echelle * MONTEE_LISIBLE },
        { translateY: m.y * echelle * MONTEE_LISIBLE },
        { scale: m.echelle },
      ],
    };
  });
  const grains = GRAINS[genre];
  const source = grains[i % grains.length];
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        { left: at[0] - taille / 2, top: at[1] - taille, width: taille, height: taille },
        style,
      ]}
    >
      <Image source={source} contentFit="contain" style={{ width: taille, height: taille }} />
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
  phase,
}: {
  e: Miroitement;
  at: Point;
  k: number;
  horloge: SharedValue<number>;
  code: BuildingCode;
  phase: number;
}) {
  return (
    <>
      {Array.from({ length: e.nb }, (_, i) => (
        <Eclat
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed count, never reordered
          key={i}
          at={at}
          portee={e.rayon * k}
          // The glints spread over the first half of the room, the building's phase over the rest: `reflet` starts by 0.4 of a cycle at most.
          delai={(i / e.nb) * 0.5 + phase * 0.5}
          sens={i % 2 ? -1 : 1}
          horloge={horloge}
          testID={`iso-reflets-${code}-${i}`}
        />
      ))}
    </>
  );
}

// 26 x 7 dp: at 18 x 5 the glints were lost on a 14 dp stretch of water.
const ECLAT_L = 26;
const ECLAT_H = 7;
/** The iso diagonal: a cell is two wide for one tall on the screen. */
const PENTE_ISO = 0.5;
const ANGLE_ISO = 26.57;

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
    const dx = sens * (r.avance - 0.5) * portee;
    // Along the iso diagonal of the water (two across for one down), not the screen's horizontal.
    return { opacity: r.opacite, transform: [{ translateX: dx }, { translateY: dx * PENTE_ISO }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        {
          left: at[0] - ECLAT_L / 2 + sens * portee * 0.15,
          top: at[1] - ECLAT_H / 2 + (delai - 0.5) * portee * 0.2,
          width: ECLAT_L,
          height: ECLAT_H,
        },
        style,
      ]}
    >
      <Svg width={ECLAT_L} height={ECLAT_H} style={{ transform: [{ rotate: `${ANGLE_ISO}deg` }] }}>
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
  const battements = 1 + (graine(code) % 3);
  const style = useAnimatedStyle(() => ({
    transform: [{ skewX: `${inclinaisonBanniere(horloge.get(), battements)}rad` }],
  }));
  if (!image) return null;
  return (
    <ZoneCopiee
      testID={`iso-banniere-${code}-vent`}
      zone={e.zone}
      pivot={e.pivot}
      px={px}
      k={k}
      image={image}
      style={style}
    />
  );
}

/**
 * A painted flame that breathes: a copy of the sprite's own `zone`, grown about `pivot`
 * (mouvement.ts `respirationFlamme`, always 1 or more). Growing from the zone's bottom edge the
 * copy stays over the whole still flame, so no rim of it is left, and at the edge it is the
 * painting itself. The motion file gives a zone with nothing but flame in it.
 */
function Respire({
  e,
  px,
  k,
  horloge,
  code,
  image,
  phase,
}: {
  e: Flamme;
  px: (p: Point) => Point;
  k: number;
  horloge: SharedValue<number>;
  code: BuildingCode;
  image: { image: number; size: readonly [number, number] } | undefined;
  phase: number;
}) {
  const style = useAnimatedStyle(() => {
    const r = respirationFlamme(horloge.get(), phase);
    return { transform: [{ scaleX: r.x }, { scaleY: r.y }] };
  });
  if (!image) return null;
  return (
    <ZoneCopiee
      testID={`iso-flamme-${code}-peinte`}
      zone={e.zone}
      pivot={e.pivot}
      px={px}
      k={k}
      image={image}
      style={style}
    />
  );
}

/** A clipped copy of the sprite's `zone`, laid over it, moved by `style` about `pivot` (canvas px). */
function ZoneCopiee({
  testID,
  zone,
  pivot,
  px,
  k,
  image,
  style,
}: {
  testID: string;
  zone: readonly [number, number, number, number];
  pivot: Point;
  px: (p: Point) => Point;
  k: number;
  image: { image: number; size: readonly [number, number] };
  style: object;
}) {
  const [zx, zy, zw, zh] = zone;
  const [x, y] = px([zx, zy]);
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        ABSOLU,
        {
          left: x,
          top: y,
          width: zw * k,
          height: zh * k,
          overflow: "hidden",
          transformOrigin: [(pivot[0] - zx) * k, (pivot[1] - zy) * k, 0],
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
