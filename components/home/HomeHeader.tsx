import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { getAvatarSource } from "@/constants/avatars";
import { getFlameLevel } from "@/db/streaks";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { useStreakInfo } from "@/hooks/useStreakInfo";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

// The flame grows with the streak (db/village.ts thresholds) so the header reads at a glance.
const FLAME_SIZES: Record<number, number> = { 0: 18, 1: 18, 2: 22, 3: 26, 4: 30, 5: 34 };

export function HomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const avatarId = useSettingsStore((s) => s.avatarId);
  const customAvatarUri = useSettingsStore((s) => s.customAvatarUri);
  const language = useSettingsStore((s) => s.language);
  const [levelInfo, setLevelInfo] = useState<UserLevelInfo | null>(null);
  const streak = useStreakInfo();

  const avatarSource = getAvatarSource(avatarId, customAvatarUri);

  // Refetch on focus: a session just logged must show up here, not on the next cold start.
  useFocusEffect(
    useCallback(() => {
      getUserLevelInfo()
        .then(setLevelInfo)
        .catch((e) => reportError("home.levelInfo", e));
    }, []),
  );

  const levelTitle = levelInfo ? (language === "fr" ? levelInfo.title.fr : levelInfo.title.en) : "";
  const currentStreak = streak?.current ?? 0;
  const flameLevel = getFlameLevel(currentStreak);

  return (
    /* Same surface + hairline as the village band: the two strips read as one
       frame around the stage, which is what makes the screen a HUD and not a list.
       Owns the top inset so the notch area is chrome-colored too, with no seam. */
    <XStack
      px="$4"
      pt={insets.top + 8}
      pb="$3"
      items="center"
      gap="$3"
      bg="$surface"
      borderBottomWidth={1}
      borderColor="$borderStrong"
    >
      {/* Avatar - Tap to edit profile */}
      <Avatar
        testID="home-settings"
        circular
        size="$6"
        borderWidth={1}
        borderColor="$borderStrong"
        pressStyle={{ scale: 0.95 }}
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel={t("home.open_settings_a11y", "Open settings")}
      >
        <Avatar.Image source={avatarSource} />
        <Avatar.Fallback background="$primary" />
      </Avatar>

      {/* Identity & XP */}
      <YStack flex={1} gap="$1">
        {/* Identity here is progression, not the village name — the village owns its name */}
        {levelInfo ? (
          <Text fontWeight="700" fontSize="$4" color="$text" numberOfLines={1}>
            {t("home.level_line", {
              level: levelInfo.level,
              title: levelTitle,
              defaultValue: `Level ${levelInfo.level} • ${levelTitle}`,
            })}
          </Text>
        ) : (
          <Skeleton height={22} width={150} bg="$surface2" />
        )}
        <XStack items="center" gap="$2" mt="$1">
          {/* ProgressBar is width:100% and doesn't shrink — without this flex wrapper it
              takes the whole row and pushes the % out under the flame. */}
          <XStack flex={1}>
            <ProgressBar
              progress={levelInfo?.xpProgress ?? 0}
              height={5}
              color="$resourceGold"
              trackColor="$surface2"
            />
          </XStack>
          <Text fontSize={11} fontWeight="700" color="$resourceGold">
            {levelInfo?.xpProgress.toFixed(0) ?? 0}%
          </Text>
        </XStack>
      </YStack>

      {/* Streak flame — the most motivating number on the screen, out of the stats row.
          Always rendered: an unlit flame is the thing to relight, and hiding it made the
          header jump and left FLAME_SIZES[0] unreachable. Blank but space-holding until
          the first read lands, so it neither flashes a zero nor resizes the XP bar. */}
      {!streak ? (
        <YStack minW={44} minH={44} />
      ) : (
        <YStack
          items="center"
          justify="center"
          minW={44}
          minH={44}
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
