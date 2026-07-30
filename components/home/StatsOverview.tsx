import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, useTheme, XStack } from "tamagui";
import { getTotalStats } from "@/db/userLevel";
import { useGameIcons } from "@/hooks/useGameIcon";

/**
 * Lifetime legend as a single quiet line, not a stat-card grid: the numbers
 * are supporting proof under the stage, and one row keeps them out of the way.
 */
export function StatsOverview() {
  const router = useRouter();
  const { t } = useTranslation();
  const theme = useTheme();
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

  const xp = totalStats?.totalXp ?? 0;
  const xpLabel = xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : `${xp}`;

  return (
    <XStack
      items="center"
      justify="center"
      gap="$5"
      py="$2"
      minH={44}
      onPress={() => router.push("/(tabs)/journal")}
      pressStyle={{ opacity: 0.7 }}
      accessibilityRole="button"
    >
      <XStack items="center" gap="$2">
        <Image source={icons.sword} style={{ width: 18, height: 18 }} contentFit="contain" />
        <Text fontSize={14} fontWeight="700" color="$text">
          {totalStats?.totalSessions ?? 0}
        </Text>
        <Text fontSize={14} fontWeight="700" color="$textSecondary">
          {t("home.quests_done", "Quests")}
        </Text>
      </XStack>

      <XStack items="center" gap="$2">
        <Image
          source={icons.trophy}
          style={{ width: 18, height: 18, tintColor: theme.resourceGold?.val }}
          contentFit="contain"
        />
        <Text fontSize={14} fontWeight="700" color="$text">
          {xpLabel}
        </Text>
        <Text fontSize={14} fontWeight="700" color="$textSecondary">
          {t("common.xp", "XP")}
        </Text>
      </XStack>
    </XStack>
  );
}
