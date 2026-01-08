import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions } from "react-native";
import { Button, H2, H3, Text, XStack, YStack } from "tamagui";
import { resolveImageAsset } from "@/src/constants/assetMap";
import { getAdventureById, getAnyActiveAdventureRun } from "@/src/db/adventures";
import { GameIcon } from "@/src/hooks/useGameIcon";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HERO_HEIGHT = 400; // Reduced from 480 for better fold visibility

export function AdventureHeroCard() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [adventure, setAdventure] = useState<{
    id: number;
    title: string;
    description: string;
    imagePath: string | null;
    currentStep: number;
    totalSteps: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Async adventure loading requires multiple checks
    async function loadActiveAdventure() {
      try {
        const result = await getAnyActiveAdventureRun();
        if (!result || cancelled) {
          setIsLoading(false);
          return;
        }

        const adventureData = await getAdventureById(result.adventureId);
        if (!adventureData || cancelled) {
          setIsLoading(false);
          return;
        }

        const completedSteps = result.activeRun.steps.filter(
          (s) => s.status === "completed"
        ).length;

        setAdventure({
          id: adventureData.id,
          title: i18n.language === "fr" ? adventureData.frTitle : adventureData.enTitle,
          description:
            i18n.language === "fr" ? adventureData.frDescription : adventureData.enDescription,
          imagePath: adventureData.imagePath,
          currentStep: completedSteps + 1,
          totalSteps: result.activeRun.steps.length,
        });
      } catch {
        //  Silently handle error
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadActiveAdventure();

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  if (isLoading) {
    return <YStack height={HERO_HEIGHT} />;
  }

  // No active adventure - Minimalist Empty State
  if (!adventure) {
    return (
      <YStack
        height={HERO_HEIGHT}
        width={SCREEN_WIDTH}
        position="relative"
        overflow="hidden"
        bg="$bgDark"
        justify="center"
        items="center"
      >
        <LinearGradient
          colors={["rgba(13, 51, 242, 0.05)", "rgba(11, 15, 25, 1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />

        <YStack items="center" gap="$4" px="$6" maxWidth={320}>
          <YStack
            width={80}
            height={80}
            bg="$glassBg"
            borderRadius={1000}
            justify="center"
            items="center"
            borderWidth={1}
            borderColor="$borderStrong"
          >
            <GameIcon name="lorc/scroll-unfurled" size={32} tintColor="$textSecondary" />
          </YStack>

          <YStack items="center" gap="$2">
            <H2 fontSize={24} fontWeight="900" color="$text" textAlign="center">
              {t("home.no_active_adventure", "No Active Adventure")}
            </H2>
            <Text
              fontSize={14}
              color="$textSecondary"
              textAlign="center"
              opacity={0.7}
              lineHeight={20}
            >
              {t("home.start_journey", "The world awaits your strength. Choose your path.")}
            </Text>
          </YStack>

          <Button
            size="$4"
            bg="$primary"
            color="white"
            fontWeight="900"
            fontSize={14}
            borderRadius={1000}
            px="$6"
            onPress={() => router.push("/adventures")}
            pressStyle={{ scale: 0.95, opacity: 0.9 }}
            shadowColor="$primaryGlow"
            shadowRadius={10}
            shadowOpacity={0.5}
          >
            {t("home.choose_adventure", "START JOURNEY")}
          </Button>
        </YStack>
      </YStack>
    );
  }

  // Active adventure - Cinematic Card
  const adventureImageSource = resolveImageAsset(adventure.imagePath);

  return (
    <YStack
      height={HERO_HEIGHT}
      width={SCREEN_WIDTH}
      position="relative"
      overflow="hidden"
      onPress={() => router.push(`/(modals)/adventures/${adventure.id}`)}
      pressStyle={{ opacity: 0.98 }}
    >
      <Image
        source={adventureImageSource}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
        contentFit="cover"
      />

      {/* Top Gradient for status bar readability if needed, kept very subtle */}
      <LinearGradient
        colors={["rgba(11, 15, 25, 0.6)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.2 }}
        style={{ position: "absolute", width: "100%", height: 100 }}
      />

      {/* Bottom Gradient for text readability - smooth transition */}
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.8)", "rgba(11, 15, 25, 1)"]}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "70%",
        }}
      />

      <YStack flex={1} justify="flex-end" pb="$6" px="$5" gap="$3">
        {/* HUD Element: Progress */}
        <XStack
          alignSelf="flex-start"
          bg="$glassBg"
          px="$3"
          py="$1.5"
          borderRadius={1000}
          gap="$2"
          items="center"
          borderWidth={1}
          borderColor="rgba(255,255,255,0.1)"
        >
          <GameIcon name="lorc/crossed-swords" size={14} tintColor="$primary" />
          <Text fontSize={12} fontWeight="700" color="$text" letterSpacing={0.5}>
            STEP {adventure.currentStep} / {adventure.totalSteps}
          </Text>
        </XStack>

        <YStack gap="$1">
          <H3
            fontSize={32}
            fontWeight="900"
            color="$text"
            lineHeight={36}
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowRadius={4}
          >
            {adventure.title}
          </H3>

          <Text
            fontSize={15}
            color="$textSecondary"
            opacity={0.9}
            lineHeight={22}
            numberOfLines={2}
          >
            {adventure.description}
          </Text>
        </YStack>

        <Button
          size="$4"
          bg="$primary"
          color="white"
          fontWeight="900"
          fontSize={14}
          borderRadius={1000}
          onPress={() => router.push(`/(modals)/adventures/${adventure.id}`)}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          shadowColor="$primaryGlow"
          shadowRadius={15}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.6}
          iconAfter={<GameIcon name="lorc/crossed-swords" size={16} tintColor="white" />}
        >
          {t("home.continue_adventure", "CONTINUE")}
        </Button>
      </YStack>
    </YStack>
  );
}
