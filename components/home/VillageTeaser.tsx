import { ChevronRight } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { getVillageTierAsset } from "@/constants/assetMap";
import { getUserLevelInfo } from "@/db/userLevel";
import { getVillageTier, TIER_NAMES, type VillageTier } from "@/db/village";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const BAND_HEIGHT = 64;

/**
 * The bottom chrome of the HUD frame: the world the training built, pinned
 * above the tab bar. A strip, not a card — Home only needs to show the village
 * changed and get out of the way.
 * Deliberately reads level only — getVillageScene() is five queries for a thumbnail.
 */
export function VillageTeaser() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [tier, setTier] = useState<VillageTier | null>(null);
  const [level, setLevel] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getUserLevelInfo()
        .then((info) => {
          setTier(getVillageTier(info.level));
          setLevel(info.level);
        })
        .catch((error) => {
          // Nothing to show; the band stays empty but keeps its height
          reportError("home.villageTeaser", error);
        });
    }, []),
  );

  const openVillage = useCallback(() => router.push("/(tabs)/village"), [router]);

  if (tier === null) {
    // Reserve the band so the HUD frame doesn't jump when the read lands.
    return <YStack height={BAND_HEIGHT + 1} borderTopWidth={1} borderColor="$borderStrong" />;
  }

  const name = TIER_NAMES[tier][language === "fr" ? "fr" : "en"];

  return (
    <XStack
      height={BAND_HEIGHT + 1}
      bg="$surface"
      borderTopWidth={1}
      borderColor="$borderStrong"
      items="center"
      gap="$3"
      pr="$4"
      onPress={openVillage}
      pressStyle={{ opacity: 0.9 }}
      accessibilityRole="button"
    >
      <Image
        source={getVillageTierAsset(tier)}
        style={{ width: 84, height: BAND_HEIGHT }}
        contentFit="cover"
        transition={200}
      />
      <YStack flex={1} gap={2}>
        <Text fontWeight="700" fontSize={15} color="$text" numberOfLines={1}>
          {name}
        </Text>
        <Text fontSize={12} color="$textSecondary">
          {t("village.level_line", { level, defaultValue: `Level ${level}` })}
        </Text>
      </YStack>
      <ChevronRight size={20} color="$textSecondary" opacity={0.5} />
    </XStack>
  );
}
