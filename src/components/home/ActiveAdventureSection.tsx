import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, ScrollView } from "react-native";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { ProgressBar } from "@/src/components/common/ProgressBar";
import { resolveImageAsset } from "@/src/constants/assetMap";
import {
  type ActiveAdventureRun,
  type AdventureDetails,
  getAdventureById,
  getAnyActiveAdventureRun,
} from "@/src/db/adventures";
import { GameIcon } from "@/src/hooks/useGameIcon";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HERO_HEIGHT = 320;

type ActiveAdventureState = {
  adventure: AdventureDetails["adventure"] & { imagePath?: string | null };
  run: ActiveAdventureRun;
};

export function ActiveAdventureSection() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<ActiveAdventureState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActiveAdventure() {
      try {
        const result = await getAnyActiveAdventureRun();
        if (!result) {
          setLoading(false);
          return;
        }

        const adventureData = await getAdventureById(result.adventureId);
        if (!adventureData) {
          setLoading(false);
          return;
        }

        setState({
          adventure: {
            id: adventureData.id,
            sortOrder: adventureData.sortOrder,
            kind: adventureData.kind,
            isActive: adventureData.isActive,
            author: adventureData.author,
            enTitle: adventureData.enTitle,
            frTitle: adventureData.frTitle,
            enDescription: adventureData.enDescription,
            frDescription: adventureData.frDescription,
            coverQuestId: adventureData.coverQuestId,
            imagePath: adventureData.imagePath,
          },
          run: result.activeRun,
        });
      } catch {
        // Silent error
      } finally {
        setLoading(false);
      }
    }
    loadActiveAdventure();
  }, []);

  if (loading) {
    return (
      <YStack height={HERO_HEIGHT} justify="center" items="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  // No active adventure - return null to let parent show gallery
  if (!state) {
    return null;
  }

  const { adventure, run } = state;
  const title = i18n.language === "fr" ? adventure.frTitle : adventure.enTitle;
  const description = i18n.language === "fr" ? adventure.enDescription : adventure.enDescription;
  const imageSource = resolveImageAsset(adventure.imagePath);

  const completedSteps = run.steps.filter((s) => s.status === "completed").length;
  const totalSteps = run.steps.length;
  const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;

  return (
    <YStack gap="$4">
      {/* Hero Card with Adventure Image */}
      <YStack height={HERO_HEIGHT} width={SCREEN_WIDTH} position="relative" overflow="hidden">
        {/* Background Image */}
        <Image
          source={imageSource}
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

        {/* Gradient Overlays */}
        <LinearGradient
          colors={["rgba(11, 15, 25, 0.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.3 }}
          style={{ position: "absolute", width: "100%", height: 100 }}
        />
        <LinearGradient
          colors={["transparent", "rgba(11, 15, 25, 0.9)", "rgba(11, 15, 25, 1)"]}
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

        {/* Ornate Frame Border */}
        <YStack
          position="absolute"
          left={0}
          right={0}
          top={0}
          bottom={0}
          borderBottomWidth={2}
          borderColor="rgba(139, 92, 246, 0.3)"
        />

        {/* Content */}
        <YStack flex={1} justify="flex-end" pb="$5" px="$4" gap="$3">
          {/* Status Badge */}
          <XStack>
            <XStack
              bg="rgba(13, 51, 242, 0.2)"
              borderWidth={1}
              borderColor="$primary"
              borderRadius={1000}
              px="$3"
              py="$1.5"
              gap="$2"
              items="center"
            >
              <GameIcon name="lorc/fire-silhouette" size={14} tintColor="$primary" />
              <Text fontSize={11} fontWeight="900" color="$primary" letterSpacing={1}>
                {t("home.active_adventure", "ACTIVE ADVENTURE")}
              </Text>
            </XStack>
          </XStack>

          {/* Title & Description */}
          <YStack gap="$1">
            <Text
              fontSize={28}
              fontWeight="900"
              color="$text"
              lineHeight={32}
              textShadowColor="rgba(0,0,0,0.5)"
              textShadowRadius={4}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text fontSize={14} color="$textSecondary" numberOfLines={1} opacity={0.8}>
              {description}
            </Text>
          </YStack>

          {/* Progress Section */}
          <YStack gap="$2">
            <XStack justify="space-between" items="center">
              <XStack items="center" gap="$2">
                <GameIcon name="lorc/crossed-swords" size={14} tintColor="$text" />
                <Text fontSize={12} fontWeight="700" color="$text">
                  {t("home.chapter", "CHAPTER")} {completedSteps + 1} / {totalSteps}
                </Text>
              </XStack>
              <Text fontSize={12} fontWeight="700" color="$primary">
                {Math.round(progress * 100)}%
              </Text>
            </XStack>
            <ProgressBar
              progress={progress}
              height={6}
              color="$primary"
              trackColor="rgba(255,255,255,0.1)"
            />
          </YStack>

          {/* Launch Button */}
          <Button
            size="$4"
            bg="$primary"
            color="white"
            fontWeight="900"
            fontSize={14}
            borderRadius={1000}
            onPress={() => router.push("/(modals)/continue-adventure")}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            shadowColor="$primaryGlow"
            shadowRadius={15}
            shadowOpacity={0.6}
            iconAfter={<GameIcon name="lorc/crossed-swords" size={16} tintColor="white" />}
          >
            {t("home.continue_adventure", "CONTINUE")}
          </Button>
        </YStack>
      </YStack>

      {/* Chapter Cards - Horizontal Scroll */}
      <YStack px="$4">
        <Text
          fontSize={11}
          fontWeight="900"
          color="$textSecondary"
          opacity={0.5}
          mb="$2"
          letterSpacing={1}
          textTransform="uppercase"
        >
          {t("home.chapters", "CHAPTERS")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          {run.steps.map((step, index) => (
            <ChapterCard
              key={step.id}
              index={index}
              status={step.status}
              onPress={() => {
                if (step.status !== "locked") {
                  router.push("/(modals)/continue-adventure");
                }
              }}
            />
          ))}
        </ScrollView>
      </YStack>
    </YStack>
  );
}

function getChapterStyles(status: "locked" | "active" | "completed") {
  const isLocked = status === "locked";
  const isActive = status === "active";
  const isCompleted = status === "completed";

  return {
    isLocked,
    isActive,
    isCompleted,
    containerBg: isActive ? "rgba(13, 51, 242, 0.15)" : "$glassBg",
    containerBorderWidth: isActive ? 2 : 1,
    containerBorderColor: isActive ? "$primary" : isCompleted ? "$success" : "$borderStrong",
    containerOpacity: isLocked ? 0.5 : 1,
    iconBg: isCompleted ? "$success" : isActive ? "$primary" : "$glassBg",
    iconBorderColor: isCompleted ? "$success" : isActive ? "$primary" : "$borderStrong",
    labelColor: isActive ? "$primary" : isCompleted ? "$success" : "$textSecondary",
  } as const;
}

function ChapterCard({
  index,
  status,
  onPress,
}: {
  index: number;
  status: "locked" | "active" | "completed";
  onPress: () => void;
}) {
  const styles = getChapterStyles(status);

  return (
    <YStack
      width={80}
      height={90}
      bg={styles.containerBg}
      borderWidth={styles.containerBorderWidth}
      borderColor={styles.containerBorderColor}
      borderRadius="$3"
      justify="center"
      items="center"
      gap="$1"
      onPress={onPress}
      opacity={styles.containerOpacity}
      pressStyle={styles.isLocked ? undefined : { scale: 0.95 }}
      animation="quick"
      shadowColor={styles.isActive ? "$primaryGlow" : undefined}
      shadowRadius={styles.isActive ? 12 : 0}
      shadowOpacity={styles.isActive ? 0.5 : 0}
    >
      <YStack
        width={36}
        height={36}
        borderRadius={1000}
        bg={styles.iconBg}
        justify="center"
        items="center"
        borderWidth={1}
        borderColor={styles.iconBorderColor}
      >
        {styles.isCompleted ? (
          <GameIcon name="lorc/checked-shield" size={18} tintColor="white" />
        ) : styles.isLocked ? (
          <GameIcon name="lorc/locked-chest" size={16} tintColor="$textSecondary" />
        ) : (
          <Text fontSize={14} fontWeight="900" color="white">
            {index + 1}
          </Text>
        )}
      </YStack>

      <Text fontSize={10} fontWeight="700" color={styles.labelColor} textTransform="uppercase">
        {styles.isCompleted ? "DONE" : styles.isActive ? "PLAY" : `CH ${index + 1}`}
      </Text>
    </YStack>
  );
}
