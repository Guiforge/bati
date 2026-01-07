import { Star } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { getUserLevelInfo, type UserLevelInfo } from "@/src/db/userLevel";
import { useSettingsStore } from "@/src/stores/settings";

/**
 * Compact level badge for display on Home screen
 * Shows level number with star icon and title
 */
export function LevelBadge() {
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
    <XStack
      items="center"
      gap="$2"
      bg="$pastelPurple"
      px="$3"
      py="$2"
      rounded="$4"
      borderWidth={2}
      borderColor="$color"
    >
      <YStack
        width={28}
        height={28}
        rounded={14}
        bg="rgba(255,255,255,0.4)"
        items="center"
        justify="center"
      >
        <Star size={16} color="$color" fill="$color" />
      </YStack>
      <YStack>
        <Text fontWeight="900" fontSize={14} color="$color">
          {t("journal.user_level", { level: levelInfo.level })}
        </Text>
        <Text fontSize={10} color="$color" opacity={0.7} fontWeight="600">
          {title}
        </Text>
      </YStack>
    </XStack>
  );
}
