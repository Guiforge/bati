import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/src/components/common/ProgressBar";
import { getAvatarById } from "@/src/constants/avatars";
import { getUserLevelInfo, type UserLevelInfo } from "@/src/db/userLevel";
import { useSettingsStore } from "@/src/stores/settings";
import { useUserStore } from "@/src/stores/user";

export function HomeHeader() {
  const router = useRouter();
  const { villageName } = useUserStore();
  const { avatarId, language } = useSettingsStore();
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);

  const avatar = getAvatarById(avatarId);

  useEffect(() => {
    getUserLevelInfo().then(setLevelInfo);
  }, []);

  const levelTitle = levelInfo ? (language === "fr" ? levelInfo.title.fr : levelInfo.title.en) : "";

  return (
    <XStack px="$4" pt="$2" pb="$2" items="center" gap="$3">
      {/* Avatar - Minimalist glow instead of thick border */}
      <YStack
        shadowColor="$primary"
        shadowRadius={12}
        shadowOpacity={0.4}
        onPress={() => router.push("/settings")}
        pressStyle={{ scale: 0.95 }}
      >
        <Avatar circular size="$5">
          <Avatar.Image source={avatar.source} />
          <Avatar.Fallback backgroundColor="$glassBg" />
        </Avatar>
      </YStack>

      {/* Identity & XP */}
      <YStack flex={1} justify="center" gap="$0.5">
        <XStack items="baseline" gap="$2">
          <Text fontWeight="900" fontSize="$5" color="$text" numberOfLines={1}>
            {villageName || "Hero"}
          </Text>
          <Text fontSize="$2" color="$primary" fontWeight="bold">
            LVL {levelInfo?.level ?? 1}
          </Text>
        </XStack>

        <Text
          fontSize={11}
          color="$textSecondary"
          numberOfLines={1}
          opacity={0.8}
          mb="$1.5"
          textTransform="uppercase"
          letterSpacing={1}
        >
          {levelTitle || "Novice"}
        </Text>

        <XStack items="center" gap="$2" maxWidth={160}>
          <ProgressBar
            progress={levelInfo?.xpProgress ?? 0}
            height={3}
            color="$primary"
            trackColor="$glassBg"
          />
        </XStack>
      </YStack>
    </XStack>
  );
}
