// The painted surroundings, drawn (alentours.ts is the pure side): the terrain under the map's
// vector paths (Monde), the forest masses between the ground and the sprites (IsoCarte), the props in
// the depth order (IsoCarte), the painted mice and birds (petitsDetails.tsx picks them).
// Each behind its flag. Painted by day, and every layer has its night
// baked from the same curve as the buildings' (scripts/iso/nuit_alentours.py, famille_jour.nuit): the
// ground, the forest, the props and the mice pick their `.nuit` file by the light.
// Never a tap target: every
// view is `pointerEvents="none"` and the building tap reads the sprites' masks (tapBatiment.ts).

import { Image } from "expo-image";
import { useContext } from "react";
import { View } from "react-native";
import Animated, { type SharedValue, useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import {
  type Accessoire,
  AlentoursContext,
  FRAME_SOURIS_MS,
  IMAGE_ANIMAL,
  type Masse,
  massesForet,
  type NomAccessoire,
  type NomForet,
  piedAccessoire,
  SOURIS,
  TERRAIN,
  TOILE_ACCESSOIRE,
  TOILE_FORET,
  TUILE_TERRAIN,
  tuileTerre,
} from "./alentours";
import { COTE, ecranXY, pose, spriteDe } from "./carteDemo";
import type { Culture, TuileChamp } from "./champs";
import { useDump } from "./dumpSprites";
import { type Depart, HorlogeContext } from "./horloge";
import type { Ambiance, Stade } from "./isoSpec";
import { solCharge } from "./ouverture";
import { hautMasque } from "./tapBatiment";
import { AnimauxContext } from "./useMarcheurs";
import {
  CORBEAUX,
  courseRat,
  RAT,
  remousCorbeau,
  VOL_ECHELLE,
  VOL_H,
  VOL_L,
  volCorbeaux,
} from "./vivant";

/** The terrain's tiles (alentours.ts TUILES_TERRAIN), by row then column: Metro needs every require spelled out. */
const TERRE: readonly { r: number; c: number; jour: number; nuit: number }[] = [
  {
    r: 0,
    c: 0,
    jour: require("@/assets/images/village/iso/sol/terrain_00.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_00.nuit.webp"),
  },
  {
    r: 0,
    c: 1,
    jour: require("@/assets/images/village/iso/sol/terrain_01.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_01.nuit.webp"),
  },
  {
    r: 0,
    c: 2,
    jour: require("@/assets/images/village/iso/sol/terrain_02.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_02.nuit.webp"),
  },
  {
    r: 1,
    c: 0,
    jour: require("@/assets/images/village/iso/sol/terrain_10.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_10.nuit.webp"),
  },
  {
    r: 1,
    c: 1,
    jour: require("@/assets/images/village/iso/sol/terrain_11.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_11.nuit.webp"),
  },
  {
    r: 1,
    c: 2,
    jour: require("@/assets/images/village/iso/sol/terrain_12.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_12.nuit.webp"),
  },
  {
    r: 2,
    c: 0,
    jour: require("@/assets/images/village/iso/sol/terrain_20.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_20.nuit.webp"),
  },
  {
    r: 2,
    c: 1,
    jour: require("@/assets/images/village/iso/sol/terrain_21.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_21.nuit.webp"),
  },
  {
    r: 2,
    c: 2,
    jour: require("@/assets/images/village/iso/sol/terrain_22.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_22.nuit.webp"),
  },
  {
    r: 3,
    c: 0,
    jour: require("@/assets/images/village/iso/sol/terrain_30.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_30.nuit.webp"),
  },
  {
    r: 3,
    c: 1,
    jour: require("@/assets/images/village/iso/sol/terrain_31.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_31.nuit.webp"),
  },
  {
    r: 3,
    c: 2,
    jour: require("@/assets/images/village/iso/sol/terrain_32.webp"),
    nuit: require("@/assets/images/village/iso/sol/terrain_32.nuit.webp"),
  },
];

const FORET: Record<NomForet, { jour: number; nuit: number }> = {
  feuillus: {
    jour: require("@/assets/images/village/iso/foret/feuillus.webp"),
    nuit: require("@/assets/images/village/iso/foret/feuillus.nuit.webp"),
  },
  melangee: {
    jour: require("@/assets/images/village/iso/foret/melangee.webp"),
    nuit: require("@/assets/images/village/iso/foret/melangee.nuit.webp"),
  },
  bouleaux: {
    jour: require("@/assets/images/village/iso/foret/bouleaux.webp"),
    nuit: require("@/assets/images/village/iso/foret/bouleaux.nuit.webp"),
  },
  dense: {
    jour: require("@/assets/images/village/iso/foret/dense.webp"),
    nuit: require("@/assets/images/village/iso/foret/dense.nuit.webp"),
  },
  bord_coniferes: {
    jour: require("@/assets/images/village/iso/foret/bord_coniferes.webp"),
    nuit: require("@/assets/images/village/iso/foret/bord_coniferes.nuit.webp"),
  },
  bord_crete: {
    jour: require("@/assets/images/village/iso/foret/bord_crete.webp"),
    nuit: require("@/assets/images/village/iso/foret/bord_crete.nuit.webp"),
  },
};

/** The undergrowth strips (448 x 384 px, the masses' own canvas), laid over a mass's feet on the south and north edges. */
const SOUSBOIS: readonly { jour: number; nuit: number }[] = [
  {
    jour: require("@/assets/images/village/iso/foret/sousbois_1.webp"),
    nuit: require("@/assets/images/village/iso/foret/sousbois_1.nuit.webp"),
  },
  {
    jour: require("@/assets/images/village/iso/foret/sousbois_2.webp"),
    nuit: require("@/assets/images/village/iso/foret/sousbois_2.nuit.webp"),
  },
  {
    jour: require("@/assets/images/village/iso/foret/sousbois_3.webp"),
    nuit: require("@/assets/images/village/iso/foret/sousbois_3.nuit.webp"),
  },
];

// Metro needs every require spelled out: one line per file, day and night.
const ACCESSOIRES_IMAGES: Record<NomAccessoire, { jour: number; nuit: number }> = {
  caisses_1: {
    jour: require("@/assets/images/village/iso/accessoires/caisses_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/caisses_1.nuit.webp"),
  },
  caisses_2: {
    jour: require("@/assets/images/village/iso/accessoires/caisses_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/caisses_2.nuit.webp"),
  },
  sacs_de_grain_1: {
    jour: require("@/assets/images/village/iso/accessoires/sacs_de_grain_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/sacs_de_grain_1.nuit.webp"),
  },
  sacs_de_grain_2: {
    jour: require("@/assets/images/village/iso/accessoires/sacs_de_grain_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/sacs_de_grain_2.nuit.webp"),
  },
  sacs_de_grain_3: {
    jour: require("@/assets/images/village/iso/accessoires/sacs_de_grain_3.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/sacs_de_grain_3.nuit.webp"),
  },
  tas_de_bois_1: {
    jour: require("@/assets/images/village/iso/accessoires/tas_de_bois_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/tas_de_bois_1.nuit.webp"),
  },
  tas_de_bois_2: {
    jour: require("@/assets/images/village/iso/accessoires/tas_de_bois_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/tas_de_bois_2.nuit.webp"),
  },
  tonneaux_1: {
    jour: require("@/assets/images/village/iso/accessoires/tonneaux_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/tonneaux_1.nuit.webp"),
  },
  tonneaux_2: {
    jour: require("@/assets/images/village/iso/accessoires/tonneaux_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/tonneaux_2.nuit.webp"),
  },
  tonneaux_3: {
    jour: require("@/assets/images/village/iso/accessoires/tonneaux_3.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/tonneaux_3.nuit.webp"),
  },
  lanterne_1: {
    jour: require("@/assets/images/village/iso/accessoires/lanterne_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/lanterne_1.nuit.webp"),
  },
  lanterne_2: {
    jour: require("@/assets/images/village/iso/accessoires/lanterne_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/lanterne_2.nuit.webp"),
  },
  bottes_de_foin_1: {
    jour: require("@/assets/images/village/iso/accessoires/bottes_de_foin_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/bottes_de_foin_1.nuit.webp"),
  },
  bottes_de_foin_2: {
    jour: require("@/assets/images/village/iso/accessoires/bottes_de_foin_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/bottes_de_foin_2.nuit.webp"),
  },
  potager_1: {
    jour: require("@/assets/images/village/iso/accessoires/potager_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/potager_1.nuit.webp"),
  },
  poulailler_2: {
    jour: require("@/assets/images/village/iso/accessoires/poulailler_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/poulailler_2.nuit.webp"),
  },
  epouvantail_2: {
    jour: require("@/assets/images/village/iso/accessoires/epouvantail_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/epouvantail_2.nuit.webp"),
  },
  charrette_1: {
    jour: require("@/assets/images/village/iso/accessoires/charrette_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/charrette_1.nuit.webp"),
  },
  charrette_2: {
    jour: require("@/assets/images/village/iso/accessoires/charrette_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/charrette_2.nuit.webp"),
  },
  linge_1: {
    jour: require("@/assets/images/village/iso/accessoires/linge_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/linge_1.nuit.webp"),
  },
  outils_1: {
    jour: require("@/assets/images/village/iso/accessoires/outils_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/outils_1.nuit.webp"),
  },
  outils_3: {
    jour: require("@/assets/images/village/iso/accessoires/outils_3.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/outils_3.nuit.webp"),
  },
  ratelier_1: {
    jour: require("@/assets/images/village/iso/accessoires/ratelier_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/ratelier_1.nuit.webp"),
  },
  ratelier_2: {
    jour: require("@/assets/images/village/iso/accessoires/ratelier_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/ratelier_2.nuit.webp"),
  },
  etal_1: {
    jour: require("@/assets/images/village/iso/accessoires/etal_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/etal_1.nuit.webp"),
  },
  menhir_1: {
    jour: require("@/assets/images/village/iso/accessoires/menhir_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/menhir_1.nuit.webp"),
  },
  menhir_2: {
    jour: require("@/assets/images/village/iso/accessoires/menhir_2.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/menhir_2.nuit.webp"),
  },
  menhir_3: {
    jour: require("@/assets/images/village/iso/accessoires/menhir_3.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/menhir_3.nuit.webp"),
  },
  poteau_indicateur_1: {
    jour: require("@/assets/images/village/iso/accessoires/poteau_indicateur_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/poteau_indicateur_1.nuit.webp"),
  },
  cloture_1: {
    jour: require("@/assets/images/village/iso/accessoires/cloture_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/cloture_1.nuit.webp"),
  },
  chat_1: {
    jour: require("@/assets/images/village/iso/accessoires/chat_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/chat_1.nuit.webp"),
  },
  pecheur_1: {
    jour: require("@/assets/images/village/iso/accessoires/pecheur_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/pecheur_1.nuit.webp"),
  },
  charrette_cassee_1: {
    jour: require("@/assets/images/village/iso/accessoires/charrette_cassee_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/charrette_cassee_1.nuit.webp"),
  },
  sieste_1: {
    jour: require("@/assets/images/village/iso/accessoires/sieste_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/sieste_1.nuit.webp"),
  },
  renard_1: {
    jour: require("@/assets/images/village/iso/accessoires/renard_1.webp"),
    nuit: require("@/assets/images/village/iso/accessoires/renard_1.nuit.webp"),
  },
};

const SOURIS_IMAGES = {
  souris_grise: {
    jour: require("@/assets/images/village/iso/animaux/souris_grise.webp"),
    nuit: require("@/assets/images/village/iso/animaux/souris_grise.nuit.webp"),
  },
  souris_brune: {
    jour: require("@/assets/images/village/iso/animaux/souris_brune.webp"),
    nuit: require("@/assets/images/village/iso/animaux/souris_brune.nuit.webp"),
  },
  souris_noire: {
    jour: require("@/assets/images/village/iso/animaux/souris_noire.webp"),
    nuit: require("@/assets/images/village/iso/animaux/souris_noire.nuit.webp"),
  },
} as const;
const OISEAU = require("@/assets/images/village/iso/animaux/oiseau.webp");

const moment = (a: Ambiance) => (a === "nuit" ? "nuit" : "jour");
/** A strip of four frames, as laid out: one layout size for the whole family (the image-size ratchet). */
const BANDE = { width: IMAGE_ANIMAL.w * 4, height: IMAGE_ANIMAL.h } as const;

/** The tiles' overlap on their right and bottom neighbours, dp (3 px of the painting). */
const JOINT = 1;

/** The painted terrain in map space, under the map (Monde.tsx): a grid of tiles of one size in a fixed box (alentours.ts TERRAIN). `palier` picks the tier's baked variants; without it, the first band's. */
export function TerrainPeint({ lumiere = "nuit", palier }: { lumiere?: Ambiance; palier: number }) {
  return (
    <View
      testID="iso-terrain-peint"
      pointerEvents="none"
      style={{
        position: "absolute",
        left: TERRAIN.x,
        top: TERRAIN.y,
        width: TERRAIN.w,
        height: TERRAIN.h,
      }}
    >
      {TERRE.map((t) => {
        const { r, c } = t;
        const { jour, nuit } = tuileTerre(t, palier);
        return (
          <Image
            key={`${r}${c}`}
            testID="iso-terrain-tuile"
            pointerEvents="none"
            onLoad={solCharge}
            source={moment(lumiere) === "nuit" ? nuit : jour}
            contentFit="fill"
            style={{
              position: "absolute",
              left: c * TUILE_TERRAIN.w,
              top: r * TUILE_TERRAIN.h,
              // H3-14: one dp of overlap, so no seam shows between rows or columns; every tile has this one size.
              width: TUILE_TERRAIN.w + JOINT,
              height: TUILE_TERRAIN.h + JOINT,
            }}
          />
        );
      })}
    </View>
  );
}

/** The undergrowth strip, against its mass: lowered by this share of the mass' height and scaled by this much (loupe BC r3). */
const SOUSBOIS_BAS = 0.15;
const SOUSBOIS_ECHELLE = 0.8;
/** The strip's width: the whole canvas, so it reaches the outer trunks (their feet spread over 8 to 94 % of it), and a narrow second strip's. */
const SOUSBOIS_LARGEUR = 1;
const SOUSBOIS_ETROIT = 0.55;

/** One undergrowth strip over a mass's feet: lower and flatter than the mass, so some trunk shows above the ferns and the edge is no plate. */
function BandeSousBois({
  m,
  n,
  lumiere,
  etroit = false,
}: {
  m: Masse;
  n: number;
  lumiere: Ambiance;
  etroit?: boolean;
}) {
  const { w, h } = TOILE_FORET;
  const strip = SOUSBOIS[n];
  if (!strip) return null;
  const sens = m.flip ? -1 : 1;
  const largeur = etroit ? SOUSBOIS_ETROIT : SOUSBOIS_LARGEUR;
  return (
    <Image
      testID="iso-sousbois"
      pointerEvents="none"
      source={strip[moment(lumiere)]}
      contentFit="fill"
      style={{
        position: "absolute",
        left: m.x - w / 2 + (etroit ? sens * -0.17 * w * m.echelle : 0),
        top: m.y - h,
        width: w,
        height: h,
        transform: [
          { translateY: ((1 - m.echelle) * h) / 2 + (etroit ? 0.2 : SOUSBOIS_BAS) * h * m.echelle },
          { scaleX: m.echelle * largeur * sens },
          { scaleY: m.echelle * SOUSBOIS_ECHELLE },
        ],
      }}
    />
  );
}

/** One mass, scaled about its foot (a translation undoes the centre's drift: one layout size for all). */
function UneMasse({ m, lumiere }: { m: Masse; lumiere: Ambiance }) {
  const { w, h } = TOILE_FORET;
  // The mass is scaled about its foot: the box is the scaled canvas standing on it.
  useDump(() => ({
    id: `tree_${m.nom}`,
    layer: "forest",
    x: m.x - (w * m.echelle) / 2,
    y: m.y - h * m.echelle,
    w: w * m.echelle,
    h: h * m.echelle,
    flip: m.flip === true,
    pied: [m.x, m.y],
  }));
  const style = {
    position: "absolute",
    left: m.x - w / 2,
    top: m.y - h,
    width: w,
    height: h,
    transform: [
      { translateY: ((1 - m.echelle) * h) / 2 },
      { scale: m.echelle },
      { scaleX: m.flip ? -1 : 1 },
    ],
  } as const;
  const sousbois = m.sb === undefined ? undefined : SOUSBOIS[m.sb];
  return (
    <>
      <Image
        testID="iso-foret-peinte"
        pointerEvents="none"
        source={FORET[m.nom][moment(lumiere)]}
        contentFit="fill"
        style={style}
      />
      {sousbois ? <BandeSousBois m={m} n={m.sb ?? 0} lumiere={lumiere} /> : null}
      {/* A wide mass (the near south forest) gets a second strip of another asset on its trunks' middle. */}
      {sousbois && m.echelle >= 1.3 ? (
        <BandeSousBois m={m} n={((m.sb ?? 0) + 1) % 3} lumiere={lumiere} etroit />
      ) : null}
    </>
  );
}

/** A forest mass' shadow: a 2:1 ellipse under its crown, pushed to the screen's right like every cast shadow of the map (the moon, isoSpec.json), flat with a soft edge. */
const ID_OMBRE = "ombre-foret";
const ID_OMBRE_PIED = "ombre-pied";
// Crisp and light (loupe BC r4, "dirty blurry patches"): 0.42 by day, flat over 80 % of the ellipse then a short soft edge, narrow on the ground and pushed along the shadow vector (screen bottom right).
const OMBRE_FORET = { decalage: 0.22, demi: 0.42, opacite: 0.42, plat: 0.8 } as const;

/**
 * Every forest mass' ground shadow, and the cart's, in ONE Svg over the ground and under the
 * sprites: one radial gradient (slate, soft edge) shared by one ellipse each, nothing animated.
 * Static, so reduced motion changes nothing.
 */
function OmbresForet({
  masses,
  pieds,
  lumiere,
}: {
  masses: readonly Masse[];
  pieds: readonly (readonly [number, number])[];
  lumiere: Ambiance;
}) {
  const { w, h } = TOILE_FORET;
  const { decalage, demi, opacite, plat } = OMBRE_FORET;
  const force = moment(lumiere) === "nuit" ? opacite * 0.6 : opacite;
  const formes = [
    ...masses.map((m) => ({
      x: m.x,
      y: m.y - 0.03 * h * m.echelle,
      l: w * m.echelle,
      pied: false,
    })),
    ...pieds.map(([x, y]) => ({ x, y, l: TOILE_ACCESSOIRE.w * 0.9, pied: true })),
  ];
  return (
    <Svg
      testID="iso-ombres-foret"
      pointerEvents="none"
      width={TERRAIN.w}
      height={TERRAIN.h}
      viewBox={`${TERRAIN.x} ${TERRAIN.y} ${TERRAIN.w} ${TERRAIN.h}`}
      style={{ position: "absolute", left: TERRAIN.x, top: TERRAIN.y }}
    >
      <Defs>
        {(
          [
            [ID_OMBRE, rawColors.isoArdoise],
            [ID_OMBRE_PIED, rawColors.isoArdoiseNeutre],
          ] as const
        ).map(([id, couleur]) => (
          <RadialGradient key={id} id={id}>
            <Stop offset="0" stopColor={couleur} stopOpacity={force} />
            <Stop offset={plat} stopColor={couleur} stopOpacity={force} />
            <Stop offset="1" stopColor={couleur} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {formes.map((f) => (
        <Ellipse
          key={`${Math.round(f.x)},${Math.round(f.y)}`}
          cx={f.x + f.l * decalage}
          cy={f.y}
          rx={f.l * demi}
          ry={f.l * demi * 0.5}
          fill={`url(#${f.pied ? ID_OMBRE_PIED : ID_OMBRE})`}
        />
      ))}
    </Svg>
  );
}

/** The painted forest round the island, back to front, between the ground and AmbianceCarte (graded at night). */
export function ForetPeinte({
  visible,
  champs,
  pieds = [],
  lumiere = "nuit",
}: {
  visible: readonly (readonly boolean[])[];
  /** The fields off the island (champs.ts `blocs`): no mass stands on one. */
  champs: readonly (readonly [number, number, number, number])[];
  /** Feet that cast the same shadow without being masses (the cart off the island). */
  pieds?: readonly (readonly [number, number])[];
  lumiere?: Ambiance;
}) {
  const masses = massesForet(visible, champs);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
      <OmbresForet masses={masses} pieds={pieds} lumiere={lumiere} />
      {masses.map((m) => (
        <UneMasse key={`${m.nom}${Math.round(m.x)},${Math.round(m.y)}`} m={m} lumiere={lumiere} />
      ))}
    </View>
  );
}

/** Where a roof cat sits: the top of its building's tap mask, a little down onto the ridge. */
function surLeToit(code: BuildingCode, stade: Stade): readonly [number, number] | null {
  const s = spriteDe(code, stade);
  if (!s?.masque) return null;
  const r = pose(code, s);
  const [u, v] = hautMasque(s.masque);
  return [r.x + (u / s.size[0]) * r.w, r.y + (v / s.size[1]) * r.h + r.h * 0.07];
}

/** One prop on its foot, in the depth order (IsoCarte inserts it by its footprint). */
// F4, the plan's fields (champs.ts `tuilesChamps`): a crop with its hedge, and the same crop without.
const CHAMPS: Record<Culture | `${Culture}_nu`, { jour: number; nuit: number }> = {
  ble: {
    jour: require("@/assets/images/village/iso/champs/ble.webp"),
    nuit: require("@/assets/images/village/iso/champs/ble.nuit.webp"),
  },
  ble_nu: {
    jour: require("@/assets/images/village/iso/champs/ble_nu.webp"),
    nuit: require("@/assets/images/village/iso/champs/ble_nu.nuit.webp"),
  },
  labour: {
    jour: require("@/assets/images/village/iso/champs/labour.webp"),
    nuit: require("@/assets/images/village/iso/champs/labour.nuit.webp"),
  },
  labour_nu: {
    jour: require("@/assets/images/village/iso/champs/labour_nu.webp"),
    nuit: require("@/assets/images/village/iso/champs/labour_nu.nuit.webp"),
  },
  legumes: {
    jour: require("@/assets/images/village/iso/champs/legumes.webp"),
    nuit: require("@/assets/images/village/iso/champs/legumes.nuit.webp"),
  },
  legumes_nu: {
    jour: require("@/assets/images/village/iso/champs/legumes_nu.webp"),
    nuit: require("@/assets/images/village/iso/champs/legumes_nu.nuit.webp"),
  },
};

/** One painted field tile on its cell (champs.ts), by day or by night as the light says. */
export function ChampPeint({ t, lumiere }: { t: TuileChamp; lumiere: Ambiance }) {
  useDump(() => ({
    id: `field_${t.culture}${t.haie ? "" : "_nu"}`,
    layer: "field",
    ...t.rect,
    flip: false,
    pied: ecranXY([t.case[0] + 0.5, t.case[1] + 0.5]),
  }));
  return (
    <Image
      testID={`iso-champ-${t.case.join("-")}`}
      pointerEvents="none"
      source={CHAMPS[t.haie ? t.culture : (`${t.culture}_nu` as const)][moment(lumiere)]}
      contentFit="fill"
      style={{
        position: "absolute",
        left: t.rect.x,
        top: t.rect.y,
        width: t.rect.w,
        height: t.rect.h,
      }}
    />
  );
}

export function AccessoirePeint({
  a,
  lumiere,
  stade,
}: {
  a: Accessoire;
  lumiere: Ambiance;
  stade: (code: BuildingCode) => Stade;
}) {
  const pied = (a.sur ? surLeToit(a.sur, stade(a.sur)) : null) ?? piedAccessoire(a);
  const { w, h, pied: k } = TOILE_ACCESSOIRE;
  useDump(() => ({
    id: `prop_${a.nom}`,
    layer: "prop",
    x: pied[0] - w / 2,
    y: pied[1] - h * k,
    w,
    h,
    flip: a.flip === true,
    pied,
  }));
  return (
    <Image
      testID={`iso-accessoire-${a.nom}`}
      pointerEvents="none"
      source={ACCESSOIRES_IMAGES[a.nom][moment(lumiere)]}
      contentFit="fill"
      style={{
        position: "absolute",
        left: pied[0] - w / 2,
        top: pied[1] - h * k,
        width: w,
        height: h,
        transform: a.flip ? [{ scaleX: -1 }] : undefined,
      }}
    />
  );
}

/** One frame window of a strip: the strip slides by a whole frame on the clock. */
function Bande({
  source,
  x,
  y,
  echelle = 1,
  image,
  dy,
  testID,
}: {
  source: number;
  x: number;
  y: number;
  echelle?: number;
  /** The frame to show, 0 to 3, read from the clock: a worklet. */
  image: () => number;
  /** The strip's own rise and fall, dp, read from the clock (a worklet); none when absent. */
  dy?: () => number;
  testID: string;
}) {
  const style = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: -IMAGE_ANIMAL.w * image() }, { translateY: dy ? dy() : 0 }],
    };
  });
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: IMAGE_ANIMAL.w,
        height: IMAGE_ANIMAL.h,
        overflow: "hidden",
        transform: [{ scale: echelle }],
      }}
    >
      <Animated.View testID={testID} style={[BANDE, style]}>
        <Image source={source} contentFit="fill" style={BANDE} />
      </Animated.View>
    </View>
  );
}

/** The mice's group box, dp: the lead in front, two behind, room for their offsets. */
const GROUPE_L = 48;
const GROUPE_H = 20;

/**
 * The painted mice (Guillaume, 01/11: several, small, fast): three of them scurry along the rat's
 * run in its waves (vivant.ts `courseRat`), its rank in the depth order, hidden at rest. One node
 * moves the group, one per mouse slides its four running frames: 4 nodes where the rat had 1.
 */
export function SourisPeintes({ lumiere = "nuit" }: { lumiere?: Ambiance }) {
  const horloge = useContext(HorlogeContext);
  const animaux = useContext(AnimauxContext);
  const bete = animaux?.betes.find((x) => x.nom === "rat");
  const c0 = animaux?.c0 ?? 0;
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
      testID="iso-souris"
      style={[
        {
          position: "absolute",
          left: ax - GROUPE_L / 2,
          top: ay - GROUPE_H + 2,
          width: GROUPE_L,
          height: GROUPE_H,
        },
        style,
      ]}
    >
      {SOURIS.map((s) => (
        <Bande
          key={s.nom}
          source={SOURIS_IMAGES[s.nom][moment(lumiere)]}
          x={GROUPE_L / 2 + s.dx - IMAGE_ANIMAL.w / 2}
          y={GROUPE_H - IMAGE_ANIMAL.h - 3 + s.dy}
          image={() => {
            "worklet";
            const c = horloge?.get() ?? 0;
            return Math.floor(c / FRAME_SOURIS_MS + s.phase) % 4;
          }}
          testID={`iso-souris-${s.nom}`}
        />
      ))}
    </Animated.View>
  );
}

const HORS_CHAMP = { opacity: 0, transform: [{ translateX: -VOL_L }, { translateY: 0 }] };

/**
 * The painted birds (replacing the drawn V of crows): the same crossing (vivant.ts `volCorbeaux`),
 * four painted birds, each beating its four wing frames at its own rate. The painting faces left: the
 * group is mirrored when it flies right. 1 + 4 nodes, as the drawn flock's Svg and its 4 paths.
 */
export function OiseauxPeints({
  width,
  height,
  horloge,
  depart,
}: {
  width: number;
  height: number;
  horloge: SharedValue<number> | null;
  depart: SharedValue<Depart> | null;
}) {
  const style = useAnimatedStyle(() => {
    if (!horloge || !depart) return HORS_CHAMP;
    const v = volCorbeaux(horloge.get(), depart.get(), width, height);
    return {
      opacity: v.opacite,
      transform: [{ translateX: v.x }, { translateY: v.y }, { scaleX: -v.sens }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="iso-oiseaux"
      style={[{ position: "absolute", left: 0, top: 0, width: VOL_L, height: VOL_H }, style]}
    >
      {CORBEAUX.map(([x, y, k], i) => (
        <Bande
          key={`${x},${y}`}
          source={OISEAU}
          x={x * VOL_ECHELLE - IMAGE_ANIMAL.w / 2}
          y={y * VOL_ECHELLE - IMAGE_ANIMAL.h / 2}
          echelle={1.05 * k}
          image={() => {
            "worklet";
            if (!horloge || !depart) return 0;
            const v = volCorbeaux(horloge.get(), depart.get(), width, height);
            return Math.floor(v.p * (14 + i) * 4 + i) % 4;
          }}
          dy={() => {
            "worklet";
            if (!horloge || !depart) return 0;
            return remousCorbeau(volCorbeaux(horloge.get(), depart.get(), width, height).p, i);
          }}
          testID={`iso-oiseau-${i}`}
        />
      ))}
    </Animated.View>
  );
}

/** The painted forest when its layer is on (alentours.ts `foret`): IsoCarte mounts this one. */
export function ForetSiPeinte(p: {
  visible: readonly (readonly boolean[])[];
  champs: readonly (readonly [number, number, number, number])[];
  pieds?: readonly (readonly [number, number])[];
  lumiere?: Ambiance;
}) {
  const { foret } = useContext(AlentoursContext);
  return foret ? <ForetPeinte {...p} /> : null;
}
