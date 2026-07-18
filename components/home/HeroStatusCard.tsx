import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Text, XStack, YStack } from "tamagui";

import { GameIcon } from "@/components/common/GameIcon";
import { getVillageStats, type VillageStatsType } from "@/db/buildings";

function getVillageNarrative(prestige: number, t: (key: string, fallback: string) => string) {
  if (prestige < 100) return t("village.humble", "A humble beginning");
  if (prestige < 500) return t("village.growing", "Growing strong");
  if (prestige < 1000) return t("village.town", "A bustling town");
  return t("village.kingdom", "A glorious kingdom");
}

export function HeroStatusCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [stats, setStats] = useState<VillageStatsType | null>(null);

  useEffect(() => {
    getVillageStats().then(setStats);
  }, []);

  const narrative = stats ? getVillageNarrative(stats.prestigeScore, t) : "...";

  return (
    <XStack px="$4">
      <Card
        flex={1}
        bg="$pastelGreen"
        borderColor="$borderStrong"
        borderWidth={1}
        borderRadius="$6"
        p="$4"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/village")}
      >
        <XStack items="center" gap="$4">
          {/* Castle Icon */}
          <GameIcon
            name="castle"
            size={64}
            bgColor="$background"
            shape="rounded"
            borderWidth={1}
            borderColor="$borderStrong"
          />

          {/* Village Info */}
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="700" color="$color">
              {t("village.home_card_title", "Your Village")}
            </Text>
            <Text fontSize="$2" color="$color" opacity={0.7}>
              {narrative}
            </Text>
            <XStack items="center" gap="$2" mt="$1">
              <Text fontSize="$3" fontWeight="bold" color="$primary">
                ⭐ {stats?.prestigeScore ?? 0}
              </Text>
              <Text fontSize={11} color="$color" opacity={0.5}>
                {t("village.prestige", "Prestige")}
              </Text>
            </XStack>
          </YStack>

          {/* Arrow hint */}
          <Text fontSize={18} opacity={0.3} color="$color">
            ›
          </Text>
        </XStack>
      </Card>
    </XStack>
  );
}
