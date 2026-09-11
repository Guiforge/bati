import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { FlameFlicker } from "@/components/common/FlameFlicker";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { Castle } from "@/components/icons";
import { getAvatarSource } from "@/constants/avatars";
import { getFlameLevel } from "@/db/streaks";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { getVillageTier, TIER_NAMES } from "@/db/village";
import { useStreakInfo } from "@/hooks/useStreakInfo";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** The strip under the status bar. Everything Home no longer spends on chrome goes to the scene. */
const HUD_HEIGHT = 52;

/** Every tap target in the strip: the 44 dp floor, and the cell the flame and the crest sit in. */
const CELL = 44;

// The flame still grows with the streak (db/village.ts thresholds), inside a cell that also holds
// the count: 24 is the most that leaves the number room under it.
const FLAME_SIZES: Record<number, number> = { 0: 16, 1: 16, 2: 18, 3: 20, 4: 22, 5: 24 };

/**
 * The whole of Home's chrome: who the hero is, how far to the next level, the streak, the village.
 *
 * One strip instead of a header and a village band. The band spent 53 dp saying what the Village
 * tab right under it already said, so the village keeps a crest here, its tier and a tap, and the
 * height went to the scene.
 */
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
  const tier = levelInfo ? getVillageTier(levelInfo.level) : null;

  return (
    /* Owns the top inset so the notch area is chrome-colored too, with no seam. */
    <XStack
      pt={insets.top}
      height={insets.top + HUD_HEIGHT}
      px="$3"
      items="center"
      gap="$2"
      bg="$surface"
      borderBottomWidth={1}
      borderColor="$borderStrong"
    >
      {/* The avatar is the way to settings, and the only one: a gear badge on it made two gears
          on one strip once the flame's disc was read as the second. */}
      <Avatar
        testID="home-settings"
        circular
        size={40}
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

      {/* Identity here is progression, not the village name: the village owns its name */}
      <YStack flex={1} gap={4}>
        {levelInfo ? (
          <Text fontWeight="700" fontSize={13} color="$text" numberOfLines={1}>
            {t("home.level_line", {
              level: levelInfo.level,
              title: levelTitle,
              defaultValue: `Level ${levelInfo.level} • ${levelTitle}`,
            })}
          </Text>
        ) : (
          <Skeleton height={16} width={130} bg="$surface2" />
        )}
        <XStack items="center" gap="$1.5">
          {/* ProgressBar is width:100% and doesn't shrink: without this flex wrapper it takes the
              whole row and pushes the numbers out under the flame. */}
          <XStack flex={1}>
            <ProgressBar
              progress={levelInfo?.xpProgress ?? 0}
              height={3}
              color="$resourceGold"
              trackColor="$surface2"
            />
          </XStack>
          {/* The numbers, not a percentage of something this strip never named. The victory
              screen prints the same fraction with the same key. */}
          {levelInfo ? (
            <Text fontSize={10} fontWeight="700" color="$resourceGold">
              {t("journal.xp_progress", {
                current: levelInfo.currentLevelXp,
                next: levelInfo.currentLevelXp + levelInfo.xpToNextLevel,
              })}
            </Text>
          ) : null}
        </XStack>
      </YStack>

      {/* The streak, in gold with its count and unit: gold is for what progresses, and a grey
          flame with no number was the least legible thing on the old header. Always rendered,
          blank but space-holding until the first read lands, so it neither flashes a zero nor
          resizes the XP bar. An unlit flame is dimmed, never hidden: it is the thing to relight. */}
      {!streak ? (
        <YStack width={CELL} height={CELL} />
      ) : (
        <YStack
          width={CELL}
          height={CELL}
          items="center"
          justify="center"
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
          <Text fontSize={11} fontWeight="700" color="$resourceGold">
            {t("home.streak_short", { count: currentStreak })}
          </Text>
        </YStack>
      )}

      {/* The village as a crest and its tier. Reads level only, like the band it replaces:
          getVillageScene() is five queries for a number. */}
      {tier === null ? (
        <YStack width={CELL} height={CELL} />
      ) : (
        <YStack
          testID="home-village"
          width={CELL}
          height={CELL}
          items="center"
          justify="center"
          borderLeftWidth={1}
          borderColor="$borderStrong"
          pressStyle={{ opacity: 0.7 }}
          onPress={() => router.push("/(tabs)/village")}
          accessibilityRole="button"
          accessibilityLabel={t("home.village_a11y", {
            name: TIER_NAMES[tier][language === "fr" ? "fr" : "en"],
          })}
        >
          <Castle size={16} color="$textSecondary" />
          <Text fontSize={11} fontWeight="700" color="$textSecondary">
            {tier}
          </Text>
        </YStack>
      )}
    </XStack>
  );
}
