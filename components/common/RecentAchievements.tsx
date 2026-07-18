import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";

import { type AchievementProgress, getAllAchievementsWithProgress } from "@/db/achievements";

export function RecentAchievements() {
  const { t } = useTranslation();
  const [recent, setRecent] = useState<AchievementProgress[]>([]);

  useEffect(() => {
    getAllAchievementsWithProgress().then((all) => {
      const unlocked = all.filter((a) => a.isUnlocked);
      // Sort by unlockedAt descending
      unlocked.sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      });
      setRecent(unlocked.slice(0, 3));
    });
  }, []);

  if (recent.length === 0) return null;

  return (
    <YStack gap="$2" items="center">
      <Text fontSize={12} fontWeight="bold" opacity={0.6} textTransform="uppercase">
        {t("achievements.recent", "Recent Achievements")}
      </Text>
      <XStack gap="$3">
        {recent.map((a) => (
          <YStack key={a.definition.code} items="center" gap="$1">
            <YStack
              width={40}
              height={40}
              rounded={20}
              bg="$bgLight"
              justify="center"
              items="center"
              borderWidth={1}
              borderColor="$primary"
            >
              <Text fontSize={20}>{a.definition.icon}</Text>
            </YStack>
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}
