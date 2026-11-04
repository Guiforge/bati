// The painted surroundings, drawn (alentours.ts is the pure side): the terrain under the map's
// vector paths (Monde), the forest masses between the ground and the sprites (IsoCarte), the props in
// the depth order (IsoCarte).
// Each behind its flag. Painted by day, and every layer has its night
// baked from the same curve as the buildings' (scripts/iso/nuit_alentours.py, famille_jour.nuit): the
// ground, the forest, the props pick their `.nuit` file by the light.
// Never a tap target: every
// view is `pointerEvents="none"` and the building tap reads the sprites' masks (tapBatiment.ts).

import { Image } from "expo-image";
import { useContext } from "react";
import { View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { fade, rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import {
  type Accessoire,
  AlentoursContext,
  type Masse,
  massesForet,
  type NomAccessoire,
  type NomForet,
  ombreHorsRoute,
  piedAccessoire,
  TERRAIN,
  TOILE_ACCESSOIRE,
  TOILE_FORET,
  TUILE_TERRAIN,
  tuileTerre,
} from "./alentours";
import { ecranXY, pose, spriteDe } from "./carteDemo";
import type { Culture, TuileChamp } from "./champs";
import { useDump } from "./dumpSprites";
import type { Ambiance, Stade } from "./isoSpec";
import { solCharge } from "./ouverture";
import { hautMasque } from "./tapBatiment";

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

const moment = (a: Ambiance) => (a === "nuit" ? "nuit" : "jour");
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

/**
 * The undergrowth, in three small pieces tucked over the trunks' feet (round 6: blind judges read one oval
 * strip per clump as "a carpet", then the two-piece version let the roots show in front of it). Each piece:
 * its asset (the mass' strip, then the next ones), its offset from the foot in canvas widths (mirrored with
 * the mass), its width, how far it sits lowered: low enough that its bottom reaches the canvas foot, where
 * the roots end. Composited with Pillow at scale 1 for the four masses and both mirrors: the roots
 * are under the ferns, the pieces' ragged tops leave gaps between them.
 */
const PIECES_SOUSBOIS = [
  { suite: 0, dx: -0.29, largeur: 0.46, bas: 0.14 },
  { suite: 1, dx: 0, largeur: 0.4, bas: 0.19 },
  { suite: 2, dx: 0.3, largeur: 0.46, bas: 0.15 },
] as const;
/** The strips drawn: the second (sousbois_2) is a mound with its own roots, which are what the pieces must hide. */
const ASSETS_SOUSBOIS = [0, 2] as const;
/** The pieces' height against the canvas: low, so some trunk shows above the ferns (round 5 was 0.8). */
const SOUSBOIS_ECHELLE = 0.72;
/** A lone cluster's pieces are drawn 15 % smaller still (loupe BC r5). */
const SOUSBOIS_ISOLE = 0.85;

/** One undergrowth piece over a mass's feet: small, low and flat, so the edge of a clump is no plate. */
function BandeSousBois({
  m,
  n,
  lumiere,
  piece,
}: {
  m: Masse;
  n: number;
  lumiere: Ambiance;
  piece: (typeof PIECES_SOUSBOIS)[number];
}) {
  const { w, h } = TOILE_FORET;
  const strip = SOUSBOIS[ASSETS_SOUSBOIS[(n + piece.suite) % ASSETS_SOUSBOIS.length] ?? 0];
  if (!strip) return null;
  const sens = m.flip ? -1 : 1;
  const petit = m.isole ? SOUSBOIS_ISOLE : 1;
  return (
    <Image
      testID="iso-sousbois"
      pointerEvents="none"
      source={strip[moment(lumiere)]}
      contentFit="fill"
      style={{
        position: "absolute",
        left: m.x - w / 2 + sens * piece.dx * w * m.echelle,
        top: m.y - h,
        width: w,
        height: h,
        transform: [
          // The smaller piece of a lone clump keeps its bottom where the full one's is: it stays at the foot.
          {
            translateY:
              ((1 - m.echelle) * h) / 2 +
              piece.bas * h * m.echelle +
              ((1 - petit) * SOUSBOIS_ECHELLE * h * m.echelle) / 2,
          },
          { scaleX: m.echelle * piece.largeur * sens * petit },
          { scaleY: m.echelle * SOUSBOIS_ECHELLE * petit },
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
      {sousbois
        ? PIECES_SOUSBOIS.map((piece) => (
            <BandeSousBois key={piece.suite} m={m} n={m.sb ?? 0} lumiere={lumiere} piece={piece} />
          ))
        : null}
    </>
  );
}

const ID_OMBRE_PIED = "ombre-pied";
// The cart's shadow: a thin ellipse slid to the screen's bottom right, soft edge (round 5).
const OMBRE_PIED = { decalage: 0.22, rx: 0.34, ry: 0.12, opacite: 0.42, plat: 0.8 } as const;
// Round 6, "clumps on carpets, shadows in blotches": a mass casts its own crown, flipped from its foot, squashed and leaning to the screen's lower right, in flat slate with the art's scalloped edge. Same drawing as screen A's shadows.
const OMBRE_MASSE = { ecrase: 0.4, penche: 38, rentre: 0.09, opacite: 0.36 } as const;

/** The shadows of feet that are not masses (the cart), in one Svg over the ground and under the sprites. */
function OmbresPieds({
  pieds,
  force,
}: {
  pieds: readonly (readonly [number, number])[];
  force: number;
}) {
  const { decalage, rx, ry, plat } = OMBRE_PIED;
  const l = TOILE_ACCESSOIRE.w * 0.9;
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
        <RadialGradient id={ID_OMBRE_PIED}>
          <Stop offset="0" stopColor={rawColors.isoArdoiseNeutre} stopOpacity={force} />
          <Stop offset={plat} stopColor={rawColors.isoArdoiseNeutre} stopOpacity={force} />
          <Stop offset="1" stopColor={rawColors.isoArdoiseNeutre} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {pieds.map(([x, y]) => (
        <Ellipse
          key={`${Math.round(x)},${Math.round(y)}`}
          cx={x + l * decalage}
          cy={y + l * 0.05}
          rx={l * rx}
          ry={l * ry}
          fill={`url(#${ID_OMBRE_PIED})`}
        />
      ))}
    </Svg>
  );
}

/** A mass' cast shadow: its own art as a flat slate silhouette. Static and never touched; none falls on the south road's corridor (loupe BC r5). */
function OmbreMasse({ m, force }: { m: Masse; force: number }) {
  const { w, h } = TOILE_FORET;
  const { ecrase, penche, rentre } = OMBRE_MASSE;
  const pente = Math.tan((penche * Math.PI) / 180);
  const haut = h * m.echelle * ecrase;
  const rx = (w * m.echelle) / 2;
  const e = ombreHorsRoute(m.x, m.y, m.x + pente * haut * 0.5, m.y + haut * 0.5, rx, haut * 0.5);
  if (!e) return null;
  const k = e.rx / rx;
  // Scaled and sheared about the box's centre, so the two translations bring the foot back on the mass' foot.
  const scaleY = -m.echelle * ecrase * k;
  return (
    <Image
      testID="iso-ombres-foret-masse"
      pointerEvents="none"
      source={FORET[m.nom].jour}
      // Alpha in the tint (SRC_IN colour filter): an opacity here is one offscreen layer per shadow.
      tintColor={fade(rawColors.isoArdoise, force)}
      contentFit="fill"
      style={{
        position: "absolute",
        left: m.x - w / 2,
        top: m.y - h,
        width: w,
        height: h,
        transform: [
          { translateX: (pente * -scaleY * h) / 2 },
          { translateY: (h / 2) * (1 - scaleY) - rentre * h * m.echelle },
          { skewX: `${penche}deg` },
          { scaleX: m.echelle * k * (m.flip ? -1 : 1) },
          { scaleY },
        ],
      }}
    />
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
  const nuit = moment(lumiere) === "nuit";
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
      <OmbresPieds pieds={pieds} force={nuit ? OMBRE_PIED.opacite * 0.6 : OMBRE_PIED.opacite} />
      {masses.map((m) => (
        <OmbreMasse
          key={`o${m.nom}${Math.round(m.x)},${Math.round(m.y)}`}
          m={m}
          force={nuit ? OMBRE_MASSE.opacite * 0.6 : OMBRE_MASSE.opacite}
        />
      ))}
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
