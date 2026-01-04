import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Text, XStack, YStack } from "tamagui";
import { getStreakInfo, type StreakInfo } from "@/db/streaks";
import { getTotalStats } from "@/db/userLevel";
import { useGameIcons } from "@/hooks/useGameIcon";

export function StatsOverview() {
  const router = useRouter();
  const { t } = useTranslation();
  const icons = useGameIcons(["flame", "sword", "trophy"]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [totalStats, setTotalStats] = useState<{
    totalSessions: number;
    totalXp: number;
  } | null>(null);

  useEffect(() => {
    getStreakInfo().then(setStreak);
    getTotalStats().then(setTotalStats);
  }, []);

  return (
    <XStack gap="$3" px="$4">
      {/* Streak Card */}
      <Card
        flex={1}
        bg="$pastelOrange"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$5"
        p="$3"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/journal")}
      >
        <YStack items="center" gap="$1">
          <Image
            source={icons.flame}
            style={{ width: 24, height: 24, tintColor: "#FF6B35" }}
            contentFit="contain"
          />
          <Text fontSize="$6" fontWeight="900" color="$primary">
            {streak?.current ?? 0}
          </Text>
          <Text fontSize={10} fontWeight="bold" color="$color" opacity={0.7}>
            {t("home.streak", "STREAK")}
          </Text>
        </YStack>
      </Card>

      {/* Quests Done Card */}
      <Card
        flex={1}
        bg="$pastelBlue"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$5"
        p="$3"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/journal")}
      >
        <YStack items="center" gap="$1">
          <Image source={icons.sword} style={{ width: 24, height: 24 }} contentFit="contain" />
          <Text fontSize="$6" fontWeight="900" color="$color">
            {totalStats?.totalSessions ?? 0}
          </Text>
          <Text fontSize={10} fontWeight="bold" color="$color" opacity={0.7}>
            {t("home.quests_done", "QUESTS")}
          </Text>
        </YStack>
      </Card>

      {/* Total XP Card */}
      <Card
        flex={1}
        bg="$pastelYellow"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$5"
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
          <Text fontSize="$6" fontWeight="900" color="$color">
            {totalStats?.totalXp
              ? totalStats.totalXp >= 1000
                ? `${(totalStats.totalXp / 1000).toFixed(1)}k`
                : totalStats.totalXp
              : 0}
          </Text>
          <Text fontSize={10} fontWeight="bold" color="$color" opacity={0.7}>
            {t("common.xp", "XP")}
          </Text>
        </YStack>
      </Card>
    </XStack>
  );
}
