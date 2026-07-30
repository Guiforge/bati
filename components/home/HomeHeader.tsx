import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getAvatarById } from "@/constants/avatars";
import { getStreakInfo, type StreakInfo } from "@/db/streaks";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { getFlameLevel } from "@/db/village";
import { useSettingsStore } from "@/stores/settings";

// The flame grows with the streak (db/village.ts thresholds) so the header reads at a glance.
const FLAME_SIZES: Record<number, number> = { 0: 18, 1: 18, 2: 22, 3: 26, 4: 30, 5: 34 };

export function HomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const avatarId = useSettingsStore((s) => s.avatarId);
  const language = useSettingsStore((s) => s.language);
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  const avatar = getAvatarById(avatarId);

  // Refetch on focus: a session just logged must show up here, not on the next cold start.
  useFocusEffect(
    useCallback(() => {
      getUserLevelInfo().then(setLevelInfo);
      getStreakInfo().then(setStreak);
    }, []),
  );

  const levelTitle = levelInfo ? (language === "fr" ? levelInfo.title.fr : levelInfo.title.en) : "";
  const currentStreak = streak?.current ?? 0;
  const flameLevel = getFlameLevel(currentStreak);

  return (
    <XStack px="$4" pt="$2" pb="$3" items="center" gap="$3">
      {/* Avatar - Tap to edit profile */}
      <Avatar
        testID="home-settings"
        circular
        size="$6"
        borderWidth={1}
        borderColor="$borderStrong"
        pressStyle={{ scale: 0.95 }}
        onPress={() => router.push("/settings")}
      >
        <Avatar.Image source={avatar.source} />
        <Avatar.Fallback background="$primary" />
      </Avatar>

      {/* Identity & XP */}
      <YStack flex={1} gap="$1">
        {/* Identity here is progression, not the village name — the village owns its name */}
        <Text fontWeight="700" fontSize="$4" color="$text" numberOfLines={1}>
          {levelInfo
            ? t("home.level_line", {
                level: levelInfo.level,
                title: levelTitle,
                defaultValue: `Level ${levelInfo.level} • ${levelTitle}`,
              })
            : "..."}
        </Text>
        <XStack items="center" gap="$2" mt="$1">
          <ProgressBar
            progress={levelInfo?.xpProgress ?? 0}
            height={5}
            color="$resourceGold"
            trackColor="$surface2"
          />
          <Text fontSize={11} fontWeight="700" color="$textSecondary">
            {levelInfo?.xpProgress.toFixed(0) ?? 0}%
          </Text>
        </XStack>
      </YStack>

      {/* Streak flame — the most motivating number on the screen, out of the stats row.
          Always rendered: an unlit flame is the thing to relight, and hiding it made the
          header jump and left FLAME_SIZES[0] unreachable. Out only until the first read
          lands, so it doesn't flash a zero on top of a real streak. */}
      {!!streak && (
        <YStack
          items="center"
          minW={44}
          opacity={currentStreak > 0 ? 1 : 0.4}
          pressStyle={{ scale: 0.95 }}
          onPress={() => router.push("/(tabs)/journal")}
          accessibilityRole="button"
          accessibilityLabel={t("home.streak_a11y", {
            count: currentStreak,
            defaultValue: `${currentStreak} day streak`,
          })}
        >
          <FlameFlicker size={FLAME_SIZES[flameLevel]} animate={currentStreak > 0} />
          <Text fontSize={15} fontWeight="700" color="$resourceFire">
            {currentStreak}
          </Text>
        </YStack>
      )}
    </XStack>
  );
}
