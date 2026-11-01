// The world around the island. L6-T17: the forest floor, the forest, its rocks and the sea with its
// shore lie in the map's own space, so the land goes on past anything the camera can show and the
// island never floats. They sit in one view that carries the camera's transform (monde.ts
// `etendue`, the one animated node of the world, its style written by useCameraIso). T23: an iso
// view looks down on the ground, so the land covers the whole frame, top included: no sky, no
// horizon, no mountains. The light of the map (veil, vignette, night) is no longer drawn here: it lies
// in map space over the land AND the island (AmbianceCarte.tsx), so it follows the camera. The forest is `casesMonde`: a few tile images (mondeTuiles/*.webp, 1.5 px per
// dp), each shared by every cell that uses it, so the decoded memory is the tiles, about 9 MB, not
// the area; the sea is one flat rectangle.

import { Image } from "expo-image";
import { useContext } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import Animated, { type AnimatedStyle, FadeOut } from "react-native-reanimated";
import { rawColors } from "@/constants/rawColors";
import { TerrainPeint } from "./Alentours";
import { AlentoursContext } from "./alentours";
import { HAUTEUR, LARGEUR, ZOOM_MIN } from "./carteDemo";
import { useDump } from "./dumpSprites";
import { LumieresContext, useMouvementReduit } from "./fige";
import { type Ambiance, type Biome, biomes } from "./isoSpec";
import { LUMIERES } from "./lumiere";
import { casesMonde, etendue, IMAGE, MARGE_HAUT, MARGE_X, type Tuile } from "./monde";
import { FONDU_OUVERTURE_MS, useSolPret } from "./ouverture";

const TUILES_IMAGES: Record<Tuile, number> = {
  dense: require("./mondeTuiles/dense.webp"),
  coni: require("./mondeTuiles/coni.webp"),
  mixte: require("./mondeTuiles/mixte.webp"),
  bouleaux: require("./mondeTuiles/bouleaux.webp"),
  clairiere: require("./mondeTuiles/clairiere.webp"),
  rochers: require("./mondeTuiles/rochers.webp"),
};

const PLEIN = { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 } as const;

export function Monde({
  biome,
  width,
  height,
  fond,
  zoomMin = ZOOM_MIN,
  visible,
  lumiere = "nuit",
}: {
  biome: Biome;
  width: number;
  height: number;
  /** The camera's transform for the land in map space (useCameraIso `fond`); without it the land stands still. */
  fond?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  /** The camera's lowest zoom (useCameraIso `zmin`): the land is laid out to cover the frame at it. */
  zoomMin?: number;
  /** The island now: the clearing is as wide as it is (monde.ts `clairiere`); without it, the finished island's. */
  visible?: readonly (readonly boolean[])[];
  /** The light of the map (lumiere.ts): by day, the warm wash under the land. */
  lumiere?: Ambiance;
}) {
  const { graine, couleurs: c } = biomes[biome].monde;
  const col = (t: keyof typeof c) => rawColors[c[t]];
  const zone = etendue(zoomMin, width, height, visible);
  const jour = LUMIERES[lumiere];
  // The painted surroundings (alentours.ts): the terrain over a floor of its own edge's tone, and
  // the forest drawn by the map (IsoCarte, under its light) in place of these tiles.
  const peint = useContext(AlentoursContext);
  const lumieres = useContext(LumieresContext);
  const solPret = useSolPret();
  const reduit = useMouvementReduit();
  const arbres = peint.foret ? [] : casesMonde(zone, graine, visible);
  // Dev-iso `?dump=`: each tile image scaled about its centre; its foot is the image's bottom middle.
  useDump(() =>
    arbres.map((k) => {
      const [cx, cy] = [k.x - MARGE_X + IMAGE / 2, k.y - MARGE_HAUT + IMAGE / 2];
      return {
        id: `tree_monde_${k.tuile}`,
        layer: "forest",
        x: cx - (IMAGE * k.echelle) / 2,
        y: cy - (IMAGE * k.echelle) / 2,
        w: IMAGE * k.echelle,
        h: IMAGE * k.echelle,
        flip: k.miroir,
        pied: [cx, cy + (IMAGE * k.echelle) / 2] as const,
      };
    }),
  );
  return (
    <View pointerEvents="none" testID="iso-monde-terre" style={PLEIN}>
      {/* T39: a flat floor, no airbrushed gradient (the forest images carry the depth). */}
      <View
        pointerEvents="none"
        style={[
          PLEIN,
          { backgroundColor: peint.sol ? rawColors.isoSolPeintFond : col("foretSol") },
        ]}
      />
      {/* H4-03: until the painted ground has loaded the frame is dark and empty; the curtain lifts with the opening fade. */}
      {peint.sol && !solPret ? (
        <Animated.View
          pointerEvents="none"
          testID="iso-monde-rideau"
          exiting={reduit ? undefined : FadeOut.duration(FONDU_OUVERTURE_MS)}
          style={[PLEIN, { backgroundColor: rawColors.bgDark }]}
        />
      ) : null}
      {jour && lumieres ? (
        <View
          pointerEvents="none"
          testID="iso-monde-lavis"
          style={[PLEIN, { backgroundColor: jour.lavis, opacity: jour.opaciteLavis }]}
        />
      ) : null}
      <Animated.View
        pointerEvents="none"
        testID="iso-monde-fond"
        style={[
          {
            position: "absolute",
            left: (width - LARGEUR) / 2,
            top: (height - HAUTEUR) / 2,
            width: LARGEUR,
            height: HAUTEUR,
          },
          fond,
        ]}
      >
        {peint.sol ? <TerrainPeint lumiere={lumiere} /> : null}
        {arbres.map((k) => (
          <Image
            key={`${k.x},${k.y}`}
            testID={`iso-monde-${k.genre}`}
            pointerEvents="none"
            source={TUILES_IMAGES[k.tuile]}
            contentFit="fill"
            style={{
              position: "absolute",
              // PLAN-PERF P0: one layout size and no opacity for every tree. A size of its
              // own per cell is a decode of its own, an opacity under 1 an offscreen layer:
              // 63 of each took the map from 16 to 61 ms a frame. The scale is a transform,
              // about the image's centre, so the cell keeps its place.
              left: k.x - MARGE_X,
              top: k.y - MARGE_HAUT,
              width: IMAGE,
              height: IMAGE,
              transform: [{ scaleX: (k.miroir ? -1 : 1) * k.echelle }, { scaleY: k.echelle }],
            }}
          />
        ))}
      </Animated.View>
    </View>
  );
}
