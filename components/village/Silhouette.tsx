import { Image } from "expo-image";
import { useTranslation } from "react-i18next";

import { rawColors } from "@/constants/rawColors";
import type { VillageBuilding } from "@/db/village";
import { peintDe } from "./iso/peints";
import { stadeSuivant } from "./stadeSuivant";

const TAILLE = 64;

/** The next stage of a building as an ink silhouette: nothing at the last stage or when unpainted. */
export function Silhouette({ building, name }: { building: VillageBuilding; name: string }) {
  const { t } = useTranslation();
  const stade = stadeSuivant(building.code, building.level);
  const sprite = stade ? peintDe(building.code, stade, "jour") : undefined;
  if (!sprite) return null;
  return (
    <Image
      testID="iso-bulle-silhouette"
      source={sprite.image}
      style={{ width: TAILLE, height: TAILLE }}
      contentFit="contain"
      tintColor={rawColors.isoInk}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t("village.silhouette_a11y", { name })}
    />
  );
}
