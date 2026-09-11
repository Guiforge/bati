import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { feedsLine, nameOf } from "@/components/village/rows";
import { Kicker } from "@/components/village/VillageLists";
import { getBuildingIconAsset } from "@/constants/assetMap";
import type { GrownBuilding, VillageBuilding } from "@/db/village";
import { useAnimationProps } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/stores/settings";

type Props = {
  growth: GrownBuilding[];
  buildings: VillageBuilding[];
  language: AppLanguage;
  /** Distance from the top of the screen, so the card sits under the spot the painting leans on. */
  top: number;
  onDismiss: () => void;
};

/**
 * The return from a session, once: the first building that rose, before and after, in its own
 * paintings. The rest of the growth is named in one line and listed under "Since your last quest".
 *
 * No villager here. VictoryView has already picked the one villager a victory gets, and the cameo
 * layer is the only place a villager is ever drawn (components/chorus/VillagerCameo.tsx).
 */
export function VillageReward({ growth, buildings, language, top, onDismiss }: Props) {
  const { t } = useTranslation();
  const anim = useAnimationProps("bouncy", { opacity: 0, y: 10 });
  const byCode = new Map(buildings.map((b) => [b.code, b]));
  const [first, ...others] = growth;
  const building = first ? byCode.get(first.code) : undefined;
  if (!(first && building)) return null;

  const also = others.flatMap((g) => {
    const b = byCode.get(g.code);
    return b ? [nameOf(b, language)] : [];
  });
  const body =
    also.length > 0
      ? `${feedsLine(building, t, language)}. ${t("village.reward_also", { names: also.join(", ") })}`
      : feedsLine(building, t, language);

  return (
    <YStack
      testID="village-reward"
      position="absolute"
      l={14}
      r={14}
      t={top}
      p={16}
      gap={12}
      rounded={14}
      borderWidth={1}
      borderColor="$resourceGold"
      bg="$surface"
      shadowColor="$shadowColor"
      shadowRadius={24}
      shadowOpacity={0.7}
      elevation={12}
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel={t("village.close")}
      {...anim}
    >
      <Kicker label={t("village.reward_kicker")} color="$resourceGold" />
      <XStack items="center" gap={14}>
        <YStack items="center" gap={4} opacity={0.45}>
          <Image
            source={getBuildingIconAsset(first.code, building.relatedMuscle, first.oldLevel)}
            style={{ width: 46, height: 46 }}
            contentFit="contain"
          />
          <Text fontSize={10} fontWeight="600" color="$textSecondary">
            {first.oldLevel > 0
              ? t("village.level_line", { level: first.oldLevel })
              : t("village.not_built")}
          </Text>
        </YStack>
        <Text fontSize={18} color="$resourceGold">
          →
        </Text>
        <YStack items="center" gap={4}>
          <Image
            source={getBuildingIconAsset(first.code, building.relatedMuscle, first.newLevel)}
            style={{ width: 62, height: 62 }}
            contentFit="contain"
          />
          <Text fontSize={10} fontWeight="600" color="$resourceGold">
            {t("village.level_line", { level: first.newLevel })}
          </Text>
        </YStack>
        <YStack flex={1} minW={0} gap={5}>
          <Text fontWeight="700" fontSize={17} lineHeight={21} color="$text">
            {t("village.reward_title", {
              building: nameOf(building, language),
              level: first.newLevel,
            })}
          </Text>
          <Text fontSize={12.5} lineHeight={18} color="$textSecondary">
            {body}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}
