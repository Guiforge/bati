import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getAvatarById } from "@/constants/avatars";
import { getResourceInventory } from "@/db/resources";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

export function HomeHeader() {
  const router = useRouter();
  const { villageName } = useUserStore();
  const { avatarId, language } = useSettingsStore();
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [_gold, setGold] = useState(0);

  const avatar = getAvatarById(avatarId);

  useEffect(() => {
    getUserLevelInfo().then(setLevelInfo);
    getResourceInventory().then((inv) => {
      const goldItem = inv.find((r) => r.resource === "gold");
      setGold(goldItem?.amount ?? 0);
    });
  }, []);

  const levelTitle = levelInfo ? (language === "fr" ? levelInfo.title.fr : levelInfo.title.en) : "";

  return (
    <XStack px="$4" pt="$2" pb="$3" items="center" gap="$3">
      {/* Avatar - Tap to edit profile */}
      <Avatar
        circular
        size="$6"
        borderWidth={2}
        borderColor="$color"
        pressStyle={{ scale: 0.95 }}
        onPress={() => router.push("/settings")}
      >
        <Avatar.Image source={avatar.source} />
        <Avatar.Fallback backgroundColor="$primary" />
      </Avatar>

      {/* Identity & XP */}
      <YStack flex={1} gap="$1">
        <Text fontWeight="900" fontSize="$4" color="$color" numberOfLines={1}>
          {villageName || "Hero"}
        </Text>
        <Text fontSize="$2" color="$color" opacity={0.7}>
          {levelInfo ? `Lvl ${levelInfo.level} • ${levelTitle}` : "..."}
        </Text>
        <XStack items="center" gap="$2" mt="$1" mr="$4">
          <ProgressBar
            progress={levelInfo?.xpProgress ?? 0}
            height={5}
            color="#FFD700"
            trackColor="rgba(0,0,0,0.1)"
          />
          <Text fontSize={10} fontWeight="bold" color="$color" opacity={0.5}>
            {levelInfo?.xpProgress.toFixed(0) ?? 0}%
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );
}
