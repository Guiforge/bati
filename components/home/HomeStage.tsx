import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { ADVENTURE_ASSETS, getAdventureAsset, getQuestAsset } from "@/constants/assetMap";
import { type SmartActionConfig, useSmartAction } from "./useSmartAction";

const COVER_HEIGHT = 196;
// The block under the cover: two content rows, the button, padding. Fixed so the adventure and
// quest scenes reserve the same space and the skeleton matches both.
const ACTION_HEIGHT = 142;
const STAGE_HEIGHT = COVER_HEIGHT + ACTION_HEIGHT;

/** The stage is always a scene. With nothing running, the on-ramp route's art stands in. */
function resolveCover(config: SmartActionConfig | null): ImageSourcePropType {
  const path = config?.scene?.imagePath;
  if (!path) return ADVENTURE_ASSETS.squire_path;
  if (path.startsWith("http")) return { uri: path };
  return config?.variant === "quest" ? getQuestAsset(path) : getAdventureAsset(path);
}

/**
 * The one thing Home asks the hero to do tonight, shown as the thing itself.
 *
 * The scene names what the button starts — an adventure to walk back into, or the quest that
 * serves the oath. A button that promises a session over a generic illustration is a button you
 * have to tap to find out what it meant.
 */
export function HomeStage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { config, isLoading } = useSmartAction();

  if (isLoading) {
    // Reserve the stage so the HUD frame doesn't jump when the scene lands.
    return <Skeleton height={STAGE_HEIGHT} radius={16} bg="$surface" />;
  }

  const effectiveConfig = config ?? {
    label: t("home.start_adventure", "Start Adventure"),
    subtext: t("home.no_active_adventure", "Choose your path"),
    onPress: () => router.push("/adventures"),
  };

  const scene = config?.scene ?? null;
  const subtitle = effectiveConfig.subtext || t("home.start_journey", "Start your journey");
  const label = effectiveConfig.label || t("home.play", "Play");
  const handlePress = effectiveConfig.onPress;
  const progress = scene?.progress ?? null;
  const stepProgress = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;

  return (
    <YStack
      bg="$surface"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$8"
      shadowColor="$shadowColor"
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 6 }}
      shadowOpacity={0.14}
      elevation={5}
      overflow="hidden"
    >
      {/* The cover is the card: a scene to walk into, not a generic tile. No eyebrow above the
          title — the art says what this is on its own. */}
      <YStack height={COVER_HEIGHT} width="100%" position="relative">
        <Image
          source={resolveCover(config)}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
        {/* $bgDark (#0B0F19) as rgba — LinearGradient takes plain colors, not tokens. */}
        <LinearGradient
          colors={["rgba(11,15,25,0.1)", "rgba(11,15,25,0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <YStack position="absolute" l="$4" r="$4" b="$3">
          <H3 fontSize={24} fontWeight="700" color="$text" numberOfLines={2} lineHeight={30}>
            {scene?.title ?? t("home.start_journey", "Start your journey")}
          </H3>
        </YStack>
      </YStack>

      <YStack p="$4" gap="$2" minH={ACTION_HEIGHT}>
        {/* What the session is made of, then why it is the one being offered. */}
        {scene?.meta ? (
          <Text fontSize={14} fontWeight="700" color="$textSecondary">
            {scene.meta}
          </Text>
        ) : null}

        {progress ? (
          <YStack gap="$2">
            <XStack justify="space-between" items="center">
              <Text fontSize={14} fontWeight="700" color="$textSecondary">
                {subtitle}
              </Text>
              <Text fontSize={14} fontWeight="700" color="$resourceGold">
                {`${progress.done}/${progress.total}`}
              </Text>
            </XStack>
            <ProgressBar progress={stepProgress} height={6} color="$resourceGold" />
          </YStack>
        ) : (
          <Text fontSize={13} color="$resourceGold" numberOfLines={1}>
            {subtitle}
          </Text>
        )}

        {/* The one primary action on the screen */}
        <Button
          testID="home-start-session"
          size="$5"
          bg="$primary"
          color="$text"
          fontWeight="700"
          fontSize={18}
          width="100%"
          onPress={handlePress}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          mt="auto"
          shadowColor="$primary"
          shadowRadius={8}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
        >
          {label}
        </Button>
      </YStack>
    </YStack>
  );
}
