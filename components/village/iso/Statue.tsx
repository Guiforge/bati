// The totem statue on the village square (T25, statue.ts): one still painting, its material an
// opaque silhouette of the same image in one colour (tintColor) under the painting at half opacity, on a
// plinth of its own (painted; an empty cell draws nothing, never a vector block). No animated node. A touch calls `onPress`, the village screen's crest handler.

import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import type { Rect } from "./carteDemo";
import { useDump } from "./dumpSprites";
import { nomFichier } from "./isoSpec";
import { MAQUETTES } from "./maquettes";
import { type EtatStatue, MATIERES, NOM_STATUE } from "./statue";

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
  useDump(() =>
    etat
      ? {
          id: `statue_${NOM_STATUE[etat.animal]}`,
          layer: "statue",
          ...boite,
          flip: false,
          pied: [boite.x + boite.w / 2, boite.y + boite.h],
        }
      : null,
  );
  return (
    <Pressable
      testID="iso-statue"
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[ABSOLU, { left: boite.x, top: boite.y, width: boite.w, height: boite.h }]}
    >
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
