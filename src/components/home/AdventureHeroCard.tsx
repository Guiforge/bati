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
const HERO_HEIGHT = 480;

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
    return null;
  }

  // No active adventure - show prompt to start one
  if (!adventure) {
    return (
      <YStack
        height={HERO_HEIGHT}
        width={SCREEN_WIDTH}
        position="relative"
        overflow="hidden"
        bg="$bgDark"
      >
        <LinearGradient
          colors={["rgba(13, 51, 242, 0.15)", "rgba(11, 15, 25, 0.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        <YStack flex={1} justify="center" items="center" gap="$4" px="$6">
          <YStack
            width={80}
            height={80}
            bg="$glassBg"
            borderColor="$borderStrong"
            borderWidth={1}
            rounded="$6"
            justify="center"
            items="center"
          >
            <GameIcon name="scroll" size={40} />
          </YStack>

          <YStack gap="$2" items="center" maxW={320}>
            <H2 fontSize={28} fontWeight="900" color="$text">
              {t("home.no_active_adventure", "No Active Adventure")}
            </H2>
            <Text fontSize={16} color="$textSecondary" opacity={0.8}>
              {t("home.start_journey", "Begin your epic journey")}
            </Text>
          </YStack>

          <Button
            size="$5"
            bg="$primary"
            color="white"
            fontWeight="900"
            fontSize={18}
            rounded="$6"
            px="$8"
            onPress={() => router.push("/adventures")}
            pressStyle={{ opacity: 0.8, scale: 0.95 }}
            shadowColor="$primaryGlow"
            shadowRadius={20}
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.6}
            mt="$3"
          >
            {t("home.choose_adventure", "CHOOSE ADVENTURE")}
          </Button>
        </YStack>
      </YStack>
    );
  }

  // Active adventure - show hero card with background
  const adventureImageSource = resolveImageAsset(adventure.imagePath);

  return (
    <YStack
      height={HERO_HEIGHT}
      width={SCREEN_WIDTH}
      position="relative"
      overflow="hidden"
      pressStyle={{ opacity: 0.95 }}
      animation="quick"
      onPress={() => router.push(`/adventures/${adventure.id}`)}
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

      <LinearGradient
        colors={["rgba(11, 15, 25, 0.85)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 200,
        }}
      />

      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 280,
        }}
      />

      <YStack flex={1} justify="flex-end" pb="$6" px="$5">
        <XStack
          bg="$glassBg"
          borderColor="$borderStrong"
          borderWidth={1}
          rounded="$4"
          px="$4"
          py="$2"
          mb="$3"
          gap="$2"
          items="center"
        >
          <GameIcon name="sword" size={16} />
          <Text fontSize={14} fontWeight="700" color="$text">
            {t("adventures.step_progress", {
              current: adventure.currentStep,
              total: adventure.totalSteps,
              defaultValue: `Step {{current}} of {{total}}`,
            })}
          </Text>
        </XStack>

        <H3 fontSize={32} fontWeight="900" color="$text" mb="$2" lineHeight={38}>
          {adventure.title}
        </H3>

        <Text
          fontSize={16}
          color="$textSecondary"
          opacity={0.9}
          mb="$5"
          lineHeight={22}
          numberOfLines={2}
        >
          {adventure.description}
        </Text>

        <Button
          size="$5"
          bg="$primary"
          color="white"
          fontWeight="900"
          fontSize={18}
          rounded="$6"
          onPress={() => router.push(`/adventures/${adventure.id}`)}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          shadowColor="$primaryGlow"
          shadowRadius={20}
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.6}
        >
          {t("home.continue_adventure", "CONTINUE")}
        </Button>
      </YStack>
    </YStack>
  );
}
