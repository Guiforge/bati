import { Star, TrendingUp } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

export function UserLevelCard() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getUserLevelInfo()
      .then(setLevelInfo)
      .catch((error) => {
        // Without this the card is an eternal skeleton and the failure is invisible.
        reportError("journal.userLevel", error);
        setFailed(true);
      });
  }, []);

  if (failed) {
    return null;
  }

  // Reserve the card's real height while loading — 8 stats cards each popping in from nothing
  // made the journal shuffle under the user's finger.
  if (!levelInfo) {
    return (
      <SkeletonCard>
        <Skeleton height={104} />
      </SkeletonCard>
    );
  }

  const title = language === "fr" ? levelInfo.title.fr : levelInfo.title.en;

  return (
    <Card bg="$surface2" p="$4">
      <YStack gap="$3">
        {/* Header with level and title */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$3">
            <YStack
              width={50}
              height={50}
              rounded={25}
              bg="$bgLight"
              items="center"
              justify="center"
            >
              <Star size={28} color="$resourceGold" fill="$resourceGold" />
            </YStack>
            <YStack>
              <Text fontWeight="700" fontSize={24} color="$text">
                {t("journal.user_level", { level: levelInfo.level })}
              </Text>
              <Text fontSize={14} color="$text" opacity={0.8} fontWeight="700">
                {title}
              </Text>
            </YStack>
          </XStack>
          <YStack items="center">
            <TrendingUp size={20} color="$text" opacity={0.7} />
            <Text fontSize={12} color="$text" opacity={0.7}>
              {t("journal.total_xp")}
            </Text>
            <Text fontWeight="700" fontSize={18} color="$text">
              {levelInfo.totalXp.toLocaleString()}
            </Text>
          </YStack>
        </XStack>

        {/* XP Progress bar */}
        <YStack gap="$1">
          <XStack items="center" justify="space-between">
            <Text fontSize={12} color="$text" opacity={0.7}>
              {t("journal.xp_progress", {
                current: levelInfo.currentLevelXp,
                next: levelInfo.currentLevelXp + levelInfo.xpToNextLevel,
              })}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.7}>
              {Math.round(levelInfo.xpProgress)}%
            </Text>
          </XStack>
          <Progress value={levelInfo.xpProgress} bg="$bgLight">
            <Progress.Indicator transition="quick" bg="$primary" />
          </Progress>
        </YStack>
      </YStack>
    </Card>
  );
}
