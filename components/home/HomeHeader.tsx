import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { Castle, Settings } from "@/components/icons";
import { getAvatarSource } from "@/constants/avatars";
import { formatCount } from "@/db/targets";
import { getUserLevelInfo, type UserLevelInfo } from "@/db/userLevel";
import { getVillageTier, TIER_NAMES } from "@/db/village";
import { useReloadOnChange } from "@/hooks/useReloadOnChange";
import { useSettingsStore } from "@/stores/settings";

/** The strip under the status bar. Everything Home no longer spends on chrome goes to the scene. */
const HUD_HEIGHT = 52;

/** Every tap target in the strip: the 44 dp floor, and the cell the crest sits in. */
const CELL = 44;

/**
 * The whole of Home's chrome: who the hero is, how far to the next level, the village.
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

  const avatarSource = getAvatarSource(avatarId, customAvatarUri);

  // Refetch on focus: a session just logged must show up here, not on the next cold start.
  useReloadOnChange(
    "home.levelInfo",
    useCallback(() => getUserLevelInfo().then(setLevelInfo), []),
  );

  const levelTitle = levelInfo ? levelInfo.title[language] : "";
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
      {/* The avatar is the way to settings, and the only one. The gear badge is the cue for it
          (the audit's first-launch strangers never found the door); it sits on the avatar's rim
          and takes no touch, so the avatar is still the one target. */}
      <YStack width={40} height={40}>
        <Avatar
          testID="home-settings"
          circular
          size={40}
          // 40 is the design; 44x44 is the floor, and this is the only door to Settings. Same
          // answer `AppIconButton` gives: hitSlop restores the hit area without moving a pixel.
          hitSlop={2}
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
        <YStack
          testID="home-settings-gear"
          position="absolute"
          r={-3}
          b={-3}
          width={18}
          height={18}
          rounded={9}
          items="center"
          justify="center"
          bg="$surface"
          borderWidth={1}
          borderColor="$borderStrong"
          pointerEvents="none"
        >
          <Settings size={11} color="$textSecondary" />
        </YStack>
      </YStack>

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
              whole row and pushes the numbers out under the crest. */}
          <XStack flex={1}>
            <ProgressBar
              progress={levelInfo?.xpProgress ?? 0}
              height={3}
              color="$resourceGold"
              trackColor="$gold800"
            />
          </XStack>
          {/* The numbers, not a percentage of something this strip never named. The victory
              screen prints the same fraction with the same key. */}
          {levelInfo ? (
            <Text fontSize={10} fontWeight="700" color="$resourceGold">
              {t("journal.xp_progress", {
                current: formatCount(language, levelInfo.currentLevelXp),
                next: formatCount(language, levelInfo.currentLevelXp + levelInfo.xpToNextLevel),
              })}
            </Text>
          ) : null}
        </XStack>
      </YStack>

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
            name: `${TIER_NAMES[tier][language]}, ${t("village.tier", { tier })}`,
          })}
        >
          <Castle size={16} color="$textSecondary" />
          {/* "Tier 12", not a bare 12 next to a castle: the audit's strangers read it as a count.
              Shrinks to fit the 44 dp cell instead of wrapping at large fonts. */}
          <Text
            testID="home-village-tier"
            fontSize={10}
            fontWeight="700"
            color="$textSecondary"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {t("village.tier", { tier })}
          </Text>
        </YStack>
      )}
    </XStack>
  );
}
