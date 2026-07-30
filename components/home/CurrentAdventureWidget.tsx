import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Skeleton } from "@/components/common/Skeleton";
import { ADVENTURE_ASSETS, getAdventureAsset } from "@/constants/assetMap";
import { useSmartAction } from "./useSmartAction";

const COVER_HEIGHT = 196;
// Cover + the action block under it (progress row, PLAY button, padding): the stage
// must reserve its full height or everything below drops when the scene lands.
const STAGE_HEIGHT = COVER_HEIGHT + 134;

/** The stage is always a scene. With no adventure running, the on-ramp route's art stands in. */
function resolveCover(path?: string | null): ImageSourcePropType {
  if (!path) return ADVENTURE_ASSETS.squire_path;
  return path.startsWith("http") ? { uri: path } : getAdventureAsset(path);
}

export function CurrentAdventureWidget() {
  const router = useRouter();
  const { t } = useTranslation();
  const { config, isLoading } = useSmartAction();

  if (isLoading) {
    // Reserve the stage so the HUD frame doesn't jump when the scene lands.
    return <Skeleton height={STAGE_HEIGHT} radius={16} bg="$surface" />;
  }

  const effectiveConfig = config || {
    label: t("home.start_adventure", "Start Adventure"),
    subtext: t("home.no_active_adventure", "Choose your path"),
    onPress: () => router.push("/adventures"),
  };

  const adventure = config?.adventure ?? null;
  const subtitle = effectiveConfig.subtext || t("home.start_journey", "Start your journey");
  const label = effectiveConfig.label || t("home.play", "Play");
  const handlePress = effectiveConfig.onPress || (() => router.push("/adventures"));
  const cover = resolveCover(adventure?.imagePath);
  const sceneTitle = adventure?.title ?? subtitle;
  const stepProgress =
    adventure && adventure.stepsTotal > 0 ? (adventure.stepsDone / adventure.stepsTotal) * 100 : 0;

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
      onPress={handlePress}
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      transition="quick"
      overflow="hidden"
    >
      {/* The cover is the card: a scene to walk back into, not a generic tile.
          No eyebrow above the title — the art says "adventure" on its own. */}
      <YStack height={COVER_HEIGHT} width="100%" position="relative">
        <Image
          source={cover}
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
            {sceneTitle}
          </H3>
        </YStack>
      </YStack>

      <YStack p="$4" gap="$3">
        {adventure ? (
          <YStack gap="$2">
            <XStack justify="space-between" items="center">
              <Text fontSize={14} fontWeight="700" color="$textSecondary">
                {subtitle}
              </Text>
              <Text fontSize={14} fontWeight="700" color="$resourceGold">
                {`${adventure.stepsDone}/${adventure.stepsTotal}`}
              </Text>
            </XStack>
            <ProgressBar progress={stepProgress} height={6} color="$resourceGold" />
          </YStack>
        ) : (
          <Text fontSize={14} fontWeight="700" color="$textSecondary">
            {t("home.start_journey", "Start your journey")}
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
          mt="$2"
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
