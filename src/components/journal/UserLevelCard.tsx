import { Star, TrendingUp } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { getUserLevelInfo, type UserLevelInfo } from "@/src/db/userLevel";
import { useSettingsStore } from "@/src/stores/settings";

export function UserLevelCard() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);

  useEffect(() => {
    getUserLevelInfo().then(setLevelInfo);
  }, []);

  if (!levelInfo) {
    return null;
  }

  const title = language === "fr" ? levelInfo.title.fr : levelInfo.title.en;

  return (
    <YStack
      bg="$glassBg"
      borderWidth={1}
      borderColor="$primary"
      borderRadius="$4"
      p="$4"
      style={{
        backgroundColor: "rgba(139, 92, 246, 0.15)",
      }}
    >
      <YStack gap="$3">
        {/* Header with level and title */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3">
            <YStack
              width={50}
              height={50}
              borderRadius={25}
              bg="rgba(13, 51, 242, 0.3)"
              items="center"
              justify="center"
            >
              <Star size={28} color="$primary" fill="$primary" />
            </YStack>
            <YStack>
              <Text fontWeight="900" fontSize={24} color="$text">
                {t("journal.user_level", { level: levelInfo.level })}
              </Text>
              <Text fontSize={14} color="$textSecondary" opacity={0.9} fontWeight="600">
                {title}
              </Text>
            </YStack>
          </XStack>
          <YStack items="center">
            <TrendingUp size={20} color="$primary" opacity={0.8} />
            <Text fontSize={12} color="$textSecondary" opacity={0.8}>
              {t("journal.total_xp")}
            </Text>
            <Text fontWeight="900" fontSize={18} color="$text">
              {levelInfo.totalXp.toLocaleString()}
            </Text>
          </YStack>
        </XStack>

        {/* XP Progress bar */}
        <YStack gap="$1">
          <XStack items="center" justify="space-between">
            <Text fontSize={12} color="$textSecondary" opacity={0.8}>
              {t("journal.xp_progress", {
                current: levelInfo.currentLevelXp,
                next: levelInfo.currentLevelXp + levelInfo.xpToNextLevel,
              })}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.8}>
              {Math.round(levelInfo.xpProgress)}%
            </Text>
          </XStack>
          <Progress value={levelInfo.xpProgress} bg="rgba(255,255,255,0.1)">
            <Progress.Indicator animation="quick" bg="$primary" />
          </Progress>
        </YStack>
      </YStack>
    </YStack>
  );
}
