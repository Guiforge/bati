import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/src/components/common/ProgressBar";
import { getAvatarById } from "@/src/constants/avatars";
import { getUserLevelInfo, type UserLevelInfo } from "@/src/db/userLevel";
import { GameIcon } from "@/src/hooks/useGameIcon";
import { useSettingsStore } from "@/src/stores/settings";
import { useUserStore } from "@/src/stores/user";

export function ImmersiveHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const { villageName } = useUserStore();
  const { avatarId, language } = useSettingsStore();
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);

  const avatar = getAvatarById(avatarId);

  useEffect(() => {
    getUserLevelInfo().then(setLevelInfo);
  }, []);

  const levelTitle = levelInfo ? (language === "fr" ? levelInfo.title.fr : levelInfo.title.en) : "";

  return (
    <YStack position="relative" overflow="hidden">
      {/* Atmospheric Background Gradient */}
      <LinearGradient
        colors={["rgba(13, 51, 242, 0.08)", "rgba(139, 92, 246, 0.04)", "rgba(11, 15, 25, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        }}
      />

      <XStack px="$4" pt="$3" pb="$4" items="center" gap="$4">
        {/* Avatar with Ornate Frame */}
        <Pressable onPress={() => router.push("/settings")}>
          <YStack position="relative">
            {/* Outer Glow Ring */}
            <YStack
              position="absolute"
              top={-4}
              left={-4}
              right={-4}
              bottom={-4}
              borderRadius={1000}
              borderWidth={2}
              borderColor="$primary"
              opacity={0.4}
              animation="pulse"
            />

            {/* Inner Decorative Ring */}
            <YStack
              position="absolute"
              top={-2}
              left={-2}
              right={-2}
              bottom={-2}
              borderRadius={1000}
              borderWidth={1}
              borderColor="rgba(139, 92, 246, 0.6)"
            />

            {/* Avatar Container with Glow */}
            <YStack
              shadowColor="$primary"
              shadowRadius={20}
              shadowOpacity={0.5}
              pressStyle={{ scale: 0.95 }}
            >
              <Avatar circular size="$6" borderWidth={2} borderColor="$glassBorder">
                <Avatar.Image source={avatar.source} />
                <Avatar.Fallback backgroundColor="$glassBg" />
              </Avatar>
            </YStack>

            {/* Level Badge - Ornate Corner */}
            <YStack
              position="absolute"
              bottom={-6}
              right={-6}
              bg="$primary"
              borderRadius={1000}
              width={28}
              height={28}
              justify="center"
              items="center"
              borderWidth={2}
              borderColor="$bgDark"
              shadowColor="$primaryGlow"
              shadowRadius={8}
              shadowOpacity={0.8}
            >
              <Text fontSize={11} fontWeight="900" color="white">
                {levelInfo?.level ?? 1}
              </Text>
            </YStack>
          </YStack>
        </Pressable>

        {/* Identity & Stats */}
        <YStack flex={1} gap="$1.5">
          {/* Name with Decorative Elements */}
          <XStack items="center" gap="$2">
            <Text fontWeight="900" fontSize="$6" color="$text" numberOfLines={1}>
              {villageName || t("home.hero", "Hero")}
            </Text>
            <GameIcon name="lorc/trophy" size={16} tintColor="$resourceGold" />
          </XStack>

          {/* Title / Rank */}
          <Text
            fontSize={12}
            color="$textSecondary"
            numberOfLines={1}
            textTransform="uppercase"
            letterSpacing={2}
            fontWeight="600"
          >
            {levelTitle || t("home.novice", "Novice")}
          </Text>

          {/* XP Progress Bar - Enhanced */}
          <YStack mt="$1" gap="$1">
            <XStack justify="space-between" items="center">
              <XStack items="center" gap="$1">
                <GameIcon name="lorc/star-prominences" size={12} tintColor="$primary" />
                <Text fontSize={10} color="$textSecondary" fontWeight="700">
                  {t("common.xp", "XP")}
                </Text>
              </XStack>
              <Text fontSize={10} color="$primary" fontWeight="700">
                {Math.round((levelInfo?.xpProgress ?? 0) * 100)}%
              </Text>
            </XStack>
            <YStack position="relative">
              <ProgressBar
                progress={levelInfo?.xpProgress ?? 0}
                height={6}
                color="$primary"
                trackColor="rgba(13, 51, 242, 0.15)"
              />
              {/* Glow effect on progress */}
              <YStack
                position="absolute"
                left={0}
                top={0}
                bottom={0}
                width={`${Math.round((levelInfo?.xpProgress ?? 0) * 100)}%`}
                borderRadius={1000}
                shadowColor="$primaryGlow"
                shadowRadius={6}
                shadowOpacity={0.8}
              />
            </YStack>
          </YStack>
        </YStack>

        {/* Settings Shortcut */}
        <Pressable onPress={() => router.push("/settings")}>
          <YStack
            bg="$glassBg"
            borderWidth={1}
            borderColor="$borderStrong"
            borderRadius={1000}
            width={40}
            height={40}
            justify="center"
            items="center"
            pressStyle={{ opacity: 0.7 }}
          >
            <GameIcon name="lorc/anvil" size={18} tintColor="$textSecondary" />
          </YStack>
        </Pressable>
      </XStack>

      {/* Bottom Divider with Glow */}
      <YStack height={1} mx="$4" overflow="hidden">
        <LinearGradient
          colors={["transparent", "rgba(13, 51, 242, 0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </YStack>
    </YStack>
  );
}
