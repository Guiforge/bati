import { ChevronRight } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { getVillageTierAsset } from "@/constants/assetMap";
import { getUserLevelInfo } from "@/db/userLevel";
import { getVillageTier, TIER_NAMES, type VillageTier } from "@/db/village";
import { useSettingsStore } from "@/stores/settings";

/**
 * A strip, not a card grid: the village is the proof that training built something,
 * so Home only needs to show it changed and get out of the way.
 * Deliberately reads level only — getVillageScene() is five queries for a thumbnail.
 */
export function VillageTeaser() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useSettingsStore();
  const [tier, setTier] = useState<VillageTier | null>(null);
  const [level, setLevel] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getUserLevelInfo()
        .then((info) => {
          setTier(getVillageTier(info.level));
          setLevel(info.level);
        })
        .catch(() => {
          // Nothing to show; the card stays hidden
        });
    }, []),
  );

  const openVillage = useCallback(() => router.push("/(tabs)/village"), [router]);

  if (tier === null) {
    return null;
  }

  const name = TIER_NAMES[tier][language === "fr" ? "fr" : "en"];

  return (
    <Card bg="$surface2" width="100%" p="$0" overflow="hidden" onPress={openVillage}>
      <XStack items="center" gap="$3" pr="$4">
        <Image
          source={getVillageTierAsset(tier)}
          style={{ width: 84, height: 72 }}
          contentFit="cover"
          transition={200}
        />
        <YStack flex={1} gap="$1">
          <Text fontWeight="700" fontSize={15} color="$text" numberOfLines={1}>
            {name}
          </Text>
          <Text fontSize={13} color="$textSecondary">
            {t("village.level_line", { level, defaultValue: `Level ${level}` })}
          </Text>
        </YStack>
        <ChevronRight size={20} color="$textSecondary" opacity={0.5} />
      </XStack>
    </Card>
  );
}
