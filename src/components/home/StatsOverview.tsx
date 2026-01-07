import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { getStreakInfo, type StreakInfo } from "@/src/db/streaks";
import { getTotalStats } from "@/src/db/userLevel";
import { GameIcon, type GameIconName } from "@/src/hooks/useGameIcon";

export function StatsOverview() {
  const router = useRouter();
  const { t } = useTranslation();
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [totalStats, setTotalStats] = useState<{
    totalSessions: number;
    totalXp: number;
  } | null>(null);

  useEffect(() => {
    getStreakInfo().then(setStreak);
    getTotalStats().then(setTotalStats);
  }, []);

  const StatItem = ({
    icon,
    value,
    label,
    color,
  }: {
    icon: GameIconName;
    value: string | number;
    label: string;
    color: string;
  }) => (
    <YStack
      flex={1}
      bg="$glassBg"
      borderColor="$borderStrong"
      borderWidth={1}
      borderRadius="$4"
      py="$3"
      px="$2"
      items="center"
      justify="center"
      gap="$2"
      pressStyle={{ opacity: 0.8, scale: 0.98 }}
      onPress={() => router.push("/(tabs)/journal")}
      animation="quick"
    >
      <GameIcon name={icon} size={20} tintColor={color} />
      <YStack items="center">
        <Text fontSize="$5" fontWeight="900" color="$text" lineHeight="$5">
          {value}
        </Text>
        <Text
          fontSize={10}
          fontWeight="bold"
          color="$textSecondary"
          textTransform="uppercase"
          opacity={0.7}
        >
          {label}
        </Text>
      </YStack>
    </YStack>
  );

  return (
    <XStack gap="$3">
      <StatItem
        icon="lorc/fire-silhouette"
        value={streak?.current ?? 0}
        label={t("home.streak", "Streak")}
        color="$primary" // Electric Blue accent
      />

      <StatItem
        icon="lorc/crossed-swords"
        value={totalStats?.totalSessions ?? 0}
        label={t("home.quests_done", "Quests")}
        color="$text" // White/Neutral
      />

      <StatItem
        icon="lorc/trophy"
        value={
          totalStats?.totalXp
            ? totalStats.totalXp >= 1000
              ? `${(totalStats.totalXp / 1000).toFixed(1)}k`
              : totalStats.totalXp
            : 0
        }
        label={t("common.xp", "XP")}
        color="$gold" // Gold accent
      />
    </XStack>
  );
}
