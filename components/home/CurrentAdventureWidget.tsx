import { ChevronRight } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { ImageSourcePropType } from "react-native";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getAdventureAsset } from "@/constants/assetMap";
import { useGameIcons } from "@/hooks/useGameIcon";
import { useSmartAction } from "./useSmartAction";

function resolveCover(path?: string | null): ImageSourcePropType | null {
  if (!path) return null;
  return path.startsWith("http") ? { uri: path } : getAdventureAsset(path);
}

export function CurrentAdventureWidget() {
  const router = useRouter();
  const { t } = useTranslation();
  const { config, isLoading } = useSmartAction();
  const icons = useGameIcons(["scroll", "sword"]);

  if (isLoading) {
    return null;
  }

  const effectiveConfig = config || {
    variant: "adventure" as const,
    label: t("home.start_adventure", "Start Adventure"),
    subtext: t("home.no_active_adventure", "Choose your path"),
    onPress: () => router.push("/adventures"),
  };

  const isAdventure = effectiveConfig.variant === "adventure";
  const adventure = config?.adventure ?? null;
  const subtitle = effectiveConfig.subtext || t("home.start_journey", "Start your journey");
  const label = effectiveConfig.label || t("home.play", "PLAY");
  const handlePress = effectiveConfig.onPress || (() => router.push("/adventures"));
  const cover = resolveCover(adventure?.imagePath);
  const stepProgress =
    adventure && adventure.stepsTotal > 0 ? (adventure.stepsDone / adventure.stepsTotal) * 100 : 0;

  return (
    <YStack
      bg="$surface"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$4"
      shadowColor="$shadowColor"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.15}
      elevation={5}
      onPress={handlePress}
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      animation="quick"
      overflow="hidden"
      mb="$2"
    >
      {/* The adventure's own cover is the card: a scene to walk back into, not a generic tile. */}
      {cover ? (
        <YStack height={168} width="100%" position="relative">
          <Image
            source={cover}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={["rgba(11,15,25,0.15)", "rgba(11,15,25,0.95)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <YStack position="absolute" l="$4" r="$4" b="$3" gap="$1">
            <Text fontSize={11} fontWeight="700" color="$textSecondary" letterSpacing={2}>
              {t("home.current_adventure", "Current adventure").toUpperCase()}
            </Text>
            <H3 fontSize={22} fontWeight="700" color="$text" numberOfLines={2} lineHeight={28}>
              {adventure?.title}
            </H3>
          </YStack>
        </YStack>
      ) : null}

      <YStack p="$4" gap="$3">
        {cover ? (
          <YStack gap="$2">
            <XStack justify="space-between" items="center">
              <Text fontSize={14} fontWeight="700" color="$textSecondary">
                {subtitle}
              </Text>
              <Text fontSize={14} fontWeight="700" color="$resourceGold">
                {adventure ? `${adventure.stepsDone}/${adventure.stepsTotal}` : ""}
              </Text>
            </XStack>
            <ProgressBar progress={stepProgress} height={6} color="$resourceGold" />
          </YStack>
        ) : (
          <>
            <XStack justify="space-between" items="center">
              <Text fontSize="$2" fontWeight="700" color="$textSecondary">
                {t("home.current_objective", "Current Objective")}
              </Text>
              <ChevronRight size={20} color="$textSecondary" opacity={0.5} />
            </XStack>

            <XStack gap="$4" items="center">
              <YStack
                width={60}
                height={60}
                bg="$primary"
                rounded="$4"
                justify="center"
                items="center"
                shadowColor="$text"
                shadowRadius={4}
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={0.2}
              >
                <Image
                  source={isAdventure ? icons.scroll : icons.sword}
                  style={{ width: 32, height: 32, tintColor: "white" }}
                  contentFit="contain"
                />
              </YStack>

              <YStack flex={1}>
                <H3 fontSize={22} fontWeight="700" color="$text" numberOfLines={2} lineHeight={28}>
                  {subtitle}
                </H3>
              </YStack>
            </XStack>
          </>
        )}

        {/* CTA Button */}
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
