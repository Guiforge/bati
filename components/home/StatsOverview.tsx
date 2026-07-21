import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Text, XStack, YStack } from "tamagui";
import { getTotalStats } from "@/db/userLevel";
import { useGameIcons } from "@/hooks/useGameIcon";

export function StatsOverview() {
  const router = useRouter();
  const { t } = useTranslation();
  const icons = useGameIcons(["sword", "trophy"]);
  const [totalStats, setTotalStats] = useState<{
    totalSessions: number;
    totalXp: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTotalStats().then(setTotalStats);
    }, []),
  );

  return (
    <XStack gap="$3">
      {/* Quests Done Card */}
      <Card
        flex={1}
        bg="$surface2"
        borderColor="$borderStrong"
        borderWidth={1}
        borderRadius="$4"
        p="$3"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/journal")}
      >
        <YStack items="center" gap="$1">
          <Image source={icons.sword} style={{ width: 24, height: 24 }} contentFit="contain" />
          <Text fontSize={20} fontWeight="700" color="$text">
            {totalStats?.totalSessions ?? 0}
          </Text>
          <Text fontSize={11} fontWeight="700" color="$textSecondary">
            {t("home.quests_done", "Quests")}
          </Text>
        </YStack>
      </Card>

      {/* Total XP Card */}
      <Card
        flex={1}
        bg="$surface"
        borderColor="$borderStrong"
        borderWidth={1}
        borderRadius="$4"
        p="$3"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/journal")}
      >
        <YStack items="center" gap="$1">
          <Image
            source={icons.trophy}
            style={{ width: 24, height: 24, tintColor: "#FFD700" }}
            contentFit="contain"
          />
          <Text fontSize={20} fontWeight="700" color="$text">
            {totalStats?.totalXp
              ? totalStats.totalXp >= 1000
                ? `${(totalStats.totalXp / 1000).toFixed(1)}k`
                : totalStats.totalXp
              : 0}
          </Text>
          <Text fontSize={11} fontWeight="700" color="$textSecondary">
            {t("common.xp", "XP")}
          </Text>
        </YStack>
      </Card>
    </XStack>
  );
}
