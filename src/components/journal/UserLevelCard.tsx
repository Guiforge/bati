import { Star, TrendingUp } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/src/components/common/Card";
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
    <Card bg="$pastelPurple" p="$4">
      <YStack gap="$3">
        {/* Header with level and title */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3">
            <YStack
              width={50}
              height={50}
              rounded={25}
              bg="rgba(255,255,255,0.3)"
              items="center"
              justify="center"
            >
              <Star size={28} color="$color" fill="$color" />
            </YStack>
            <YStack>
              <Text fontWeight="900" fontSize={24} color="$color">
                {t("journal.user_level", { level: levelInfo.level })}
              </Text>
              <Text fontSize={14} color="$color" opacity={0.8} fontWeight="600">
                {title}
              </Text>
            </YStack>
          </XStack>
          <YStack items="center">
            <TrendingUp size={20} color="$color" opacity={0.7} />
            <Text fontSize={12} color="$color" opacity={0.7}>
              {t("journal.total_xp")}
            </Text>
            <Text fontWeight="900" fontSize={18} color="$color">
              {levelInfo.totalXp.toLocaleString()}
            </Text>
          </YStack>
        </XStack>

        {/* XP Progress bar */}
        <YStack gap="$1">
          <XStack items="center" justify="space-between">
            <Text fontSize={12} color="$color" opacity={0.7}>
              {t("journal.xp_progress", {
                current: levelInfo.currentLevelXp,
                next: levelInfo.currentLevelXp + levelInfo.xpToNextLevel,
              })}
            </Text>
            <Text fontSize={12} color="$color" opacity={0.7}>
              {Math.round(levelInfo.xpProgress)}%
            </Text>
          </XStack>
          <Progress value={levelInfo.xpProgress} bg="rgba(255,255,255,0.3)">
            <Progress.Indicator animation="quick" bg="$color" />
          </Progress>
        </YStack>
      </YStack>
    </Card>
  );
}
