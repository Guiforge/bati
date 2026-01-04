import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Text, XStack, YStack } from "tamagui";
import { getVillageStats, type VillageStatsType } from "@/db/buildings";
import { getStreakInfo, type StreakInfo } from "@/db/streaks";
import { getTotalStats } from "@/db/userLevel";
import { useGameIcons } from "@/hooks/useGameIcon";

function getVillageNarrative(prestige: number, t: (key: string, fallback: string) => string) {
  if (prestige < 100) return t("village.humble", "A humble beginning");
  if (prestige < 500) return t("village.growing", "Growing strong");
  if (prestige < 1000) return t("village.town", "A bustling town");
  return t("village.kingdom", "A glorious kingdom");
}

export function HeroStatusCard() {
  const router = useRouter();
  const { t } = useTranslation();
  const icons = useGameIcons(["castle", "flame", "sword"]);
  const [stats, setStats] = useState<VillageStatsType | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [totalStats, setTotalStats] = useState<{ totalSessions: number; totalXp: number } | null>(
    null,
  );

  useEffect(() => {
    getVillageStats().then(setStats);
    getStreakInfo().then(setStreak);
    getTotalStats().then(setTotalStats);
  }, []);

  const narrative = stats ? getVillageNarrative(stats.prestigeScore, t) : "...";

  return (
    <XStack gap="$3" px="$4" height={140}>
      {/* Left: Village Overview */}
      <Card
        flex={1}
        bg="$pastelBlue"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$6"
        p="$3"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/village")}
      >
        <Text
          fontSize={10}
          fontWeight="bold"
          color="$color"
          opacity={0.6}
          style={{ textAlign: "center" }}
        >
          {t("home.village", "VILLAGE")}
        </Text>

        <YStack items="center" justify="center" flex={1} gap="$1">
          <Image source={icons.castle} style={{ width: 32, height: 32 }} contentFit="contain" />
          <Text fontSize="$2" fontWeight="bold" color="$color" style={{ textAlign: "center" }}>
            {narrative}
          </Text>
          <Text fontSize={11} opacity={0.6} color="$color">
            ⭐ {stats?.prestigeScore ?? 0}
          </Text>
        </YStack>
      </Card>

      {/* Center: Streak */}
      <Card
        width={85}
        bg="$pastelOrange"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$6"
        p="$2"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/journal")}
        items="center"
        justify="center"
      >
        <YStack items="center" gap="$1">
          <Image
            source={icons.flame}
            style={{ width: 24, height: 24, tintColor: "#FF6B35" }}
            contentFit="contain"
          />
          <Text fontSize="$5" fontWeight="900" color="$primary">
            {streak?.current ?? 0}
          </Text>
          <Text fontSize={9} fontWeight="bold" color="$color" opacity={0.7}>
            {t("home.streak", "STREAK")}
          </Text>
        </YStack>
      </Card>

      {/* Right: Quests Done */}
      <Card
        width={85}
        bg="$bgLight"
        borderColor="$color"
        borderWidth={3}
        borderRadius="$6"
        p="$2"
        pressStyle={{ scale: 0.98 }}
        onPress={() => router.push("/(tabs)/journal")}
        items="center"
        justify="center"
      >
        <YStack items="center" gap="$1">
          <Image source={icons.sword} style={{ width: 24, height: 24 }} contentFit="contain" />
          <Text fontSize="$5" fontWeight="900" color="$color">
            {totalStats?.totalSessions ?? 0}
          </Text>
          <Text fontSize={9} fontWeight="bold" color="$color" opacity={0.7}>
            {t("home.quests_done", "QUESTS")}
          </Text>
        </YStack>
      </Card>
    </XStack>
  );
}
