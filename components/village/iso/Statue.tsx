// The totem statue on the village square (T25, statue.ts): one still painting, its material an
// opaque silhouette of the same image in one colour (tintColor) under the painting at half opacity, on a
// plinth of its own (painted; the app draws a block only for the empty plinth). No animated node. A touch calls `onPress`, the village screen's crest handler.

import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { Rect } from "./carteDemo";
import { nomFichier } from "./isoSpec";
import { MAQUETTES } from "./maquettes";
import { type EtatStatue, MATIERES, NOM_STATUE, VIDE_H, VIDE_L } from "./statue";

const ABSOLU = { position: "absolute" } as const;

export function Statue({
  boite,
  etat,
  onPress,
}: {
  boite: Rect;
  /** Null before the reveal: the empty plinth, no animal. */
  etat: EtatStatue;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const [w, h, mi, p] = [VIDE_L, VIDE_H, VIDE_L / 4, VIDE_L / 2];
  const label = etat
    ? t("village.iso.statue", {
        animal: t(`village.crest_${etat.animal}`),
        matiere: t(`village.iso.matiere_${etat.stade}`),
      })
    : t("village.iso.statue_nu");
  const source = etat
    ? MAQUETTES[nomFichier("statue", NOM_STATUE[etat.animal], "nuit")]?.image
    : null;
  const matiere = etat ? MATIERES[etat.stade] : null;
  const taille = { left: 0, top: 0, width: boite.w, height: boite.h };
  return (
    <Pressable
      testID="iso-statue"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[ABSOLU, { left: boite.x, top: boite.y, width: boite.w, height: boite.h }]}
    >
      {etat ? null : (
        <Svg width={w} height={p + h} viewBox={`0 0 ${w} ${p + h}`}>
          <Polygon
            points={`0,${mi} ${w / 2},${p} ${w / 2},${p + h} 0,${mi + h}`}
            fill={rawColors.isoRock}
            stroke={rawColors.isoInk}
            strokeWidth={1}
          />
          <Polygon
            points={`${w / 2},${p} ${w},${mi} ${w},${mi + h} ${w / 2},${p + h}`}
            fill={rawColors.isoCliff}
            stroke={rawColors.isoInk}
            strokeWidth={1}
          />
          <Polygon
            points={`${w / 2},0 ${w},${mi} ${w / 2},${p} 0,${mi}`}
            fill={rawColors.isoRocaille}
            stroke={rawColors.isoInk}
            strokeWidth={1}
          />
        </Svg>
      )}
      {source && matiere?.teinte ? (
        <Image
          testID="iso-statue-matiere"
          pointerEvents="none"
          source={source}
          contentFit="fill"
          tintColor={matiere.teinte}
          style={[ABSOLU, taille]}
        />
      ) : null}
      {source ? (
        <Image
          testID="iso-statue-image"
          pointerEvents="none"
          source={source}
          contentFit="fill"
          style={[ABSOLU, taille, { opacity: matiere?.dessin ?? 1 }]}
        />
      ) : null}
    </Pressable>
  );
}
