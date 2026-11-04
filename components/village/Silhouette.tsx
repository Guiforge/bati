import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { rawColors } from "@/constants/rawColors";
import type { VillageBuilding } from "@/db/village";
import { peintDe } from "./iso/peints";
import { stadeSuivant } from "./stadeSuivant";

/** Was 72. */
const TAILLE = 84;
/** The sprite itself under the ink, so the inner shapes read through (was: ink only, a blob). */
const OPACITE_SPRITE = 0.25;
/** The ink tint over it. */
const OPACITE_ENCRE = 0.7;

/** The next stage of a building as an ink silhouette: nothing at the last stage or when unpainted. */
export function Silhouette({
  building,
  baseRank = 0,
  name,
}: {
  building: VillageBuilding;
  /** The rank of the building an upgrade extends (rule B), 0 for any other. */
  baseRank?: number;
  name: string;
}) {
  const { t } = useTranslation();
  const stade = stadeSuivant(building.code, building.level, baseRank);
  const sprite = stade ? peintDe(building.code, stade, "jour") : undefined;
  if (!sprite) return null;
  return (
    <View
      testID="iso-bulle-silhouette"
      style={{ width: TAILLE, height: TAILLE }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t("village.silhouette_a11y", { name })}
    >
      <Image
        source={sprite.image}
        style={{ position: "absolute", width: TAILLE, height: TAILLE, opacity: OPACITE_SPRITE }}
        contentFit="contain"
      />
      <Image
        source={sprite.image}
        style={{ position: "absolute", width: TAILLE, height: TAILLE, opacity: OPACITE_ENCRE }}
        contentFit="contain"
        tintColor={rawColors.isoInk}
      />
    </View>
  );
}
