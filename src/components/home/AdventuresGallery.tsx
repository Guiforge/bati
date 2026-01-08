import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, ScrollView } from "react-native";
import { Button, Spinner, Text, XStack, YStack } from "tamagui";
import { resolveImageAsset } from "@/src/constants/assetMap";
import { type Adventure, listAdventures } from "@/src/db/adventures";
import { GameIcon, type GameIconName } from "@/src/hooks/useGameIcon";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CARD_HEIGHT = 220;

type AdventureKindConfig = {
  icon: GameIconName;
  color: "$primary" | "$error" | "$resourceGold";
  label: string;
};

const ADVENTURE_KIND_CONFIG: Record<string, AdventureKindConfig> = {
  route: {
    icon: "lorc/treasure-map",
    color: "$primary",
    label: "CAMPAIGN",
  },
  boss: {
    icon: "lorc/crowned-skull",
    color: "$error",
    label: "BOSS FIGHT",
  },
  event: {
    icon: "lorc/star-prominences",
    color: "$resourceGold",
    label: "EVENT",
  },
};

export function AdventuresGallery() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdventures() {
      try {
        const data = await listAdventures();
        setAdventures(data);
      } catch {
        // Silent error handling
      } finally {
        setLoading(false);
      }
    }
    loadAdventures();
  }, []);

  if (loading) {
    return (
      <YStack height={CARD_HEIGHT + 60} justify="center" items="center">
        <Spinner size="large" color="$primary" />
      </YStack>
    );
  }

  if (adventures.length === 0) {
    return (
      <YStack
        height={CARD_HEIGHT}
        mx="$4"
        bg="$glassBg"
        borderColor="$borderStrong"
        borderWidth={1}
        borderRadius="$4"
        justify="center"
        items="center"
        gap="$3"
      >
        <GameIcon name="lorc/treasure-map" size={48} tintColor="$textSecondary" />
        <Text color="$textSecondary" fontSize="$4" textAlign="center">
          {t("adventures.empty_title", "No adventures available")}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack gap="$3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
        snapToInterval={CARD_WIDTH + 16}
        decelerationRate="fast"
      >
        {adventures.map((adventure) => (
          <AdventureCard
            key={adventure.id}
            adventure={adventure}
            language={i18n.language}
            onPress={() => router.push(`/(modals)/adventures/${adventure.id}`)}
          />
        ))}
      </ScrollView>

      {/* View All Button */}
      <XStack px="$4" justify="flex-end">
        <Button
          size="$3"
          bg="transparent"
          borderWidth={1}
          borderColor="$borderStrong"
          color="$textSecondary"
          fontSize={12}
          fontWeight="700"
          onPress={() => router.push("/adventures")}
          pressStyle={{ opacity: 0.7 }}
          iconAfter={<GameIcon name="lorc/scroll-unfurled" size={14} tintColor="$textSecondary" />}
        >
          {t("home.view_all_adventures", "VIEW ALL")}
        </Button>
      </XStack>
    </YStack>
  );
}

function AdventureCard({
  adventure,
  language,
  onPress,
}: {
  adventure: Adventure;
  language: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const title = language === "fr" ? adventure.frTitle : adventure.enTitle;
  const kindConfig = ADVENTURE_KIND_CONFIG[adventure.kind] || ADVENTURE_KIND_CONFIG.route;
  const imageSource = resolveImageAsset(adventure.imagePath);

  return (
    <YStack
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      borderRadius="$4"
      overflow="hidden"
      position="relative"
      onPress={onPress}
      pressStyle={{ scale: 0.98, opacity: 0.95 }}
      animation="quick"
      // Glowing border effect
      shadowColor={kindConfig.color}
      shadowRadius={12}
      shadowOpacity={0.3}
    >
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

      {/* Gradient Overlay */}
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.7)", "rgba(11, 15, 25, 0.95)"]}
        locations={[0, 0.5, 1]}
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

      {/* Ornate Border Frame */}
      <YStack
        position="absolute"
        left={0}
        right={0}
        top={0}
        bottom={0}
        borderWidth={1}
        borderColor="rgba(139, 92, 246, 0.3)"
        borderRadius="$4"
      />

      {/* Content */}
      <YStack flex={1} justify="space-between" p="$3">
        {/* Top: Kind Badge */}
        <XStack>
          <XStack
            bg="rgba(11, 15, 25, 0.8)"
            borderWidth={1}
            borderColor={kindConfig.color}
            borderRadius={1000}
            px="$2.5"
            py="$1"
            gap="$1.5"
            items="center"
          >
            <GameIcon name={kindConfig.icon} size={12} tintColor={kindConfig.color} />
            <Text fontSize={10} fontWeight="900" color={kindConfig.color} letterSpacing={1}>
              {kindConfig.label}
            </Text>
          </XStack>
        </XStack>

        {/* Bottom: Title & Meta */}
        <YStack gap="$2">
          <Text
            fontSize={20}
            fontWeight="900"
            color="$text"
            numberOfLines={2}
            lineHeight={24}
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowRadius={4}
          >
            {title}
          </Text>

          <XStack gap="$3" items="center">
            {/* Steps Count */}
            <XStack items="center" gap="$1">
              <GameIcon name="lorc/crossed-swords" size={12} tintColor="$textSecondary" />
              <Text fontSize={11} color="$textSecondary" fontWeight="600">
                {adventure.stepsCount} {t("adventures.quests", "quests")}
              </Text>
            </XStack>

            {/* CTA */}
            <XStack
              bg="$primary"
              borderRadius={1000}
              px="$3"
              py="$1.5"
              ml="auto"
              shadowColor="$primaryGlow"
              shadowRadius={8}
              shadowOpacity={0.6}
            >
              <Text fontSize={11} fontWeight="900" color="white" letterSpacing={0.5}>
                {t("common.explore", "EXPLORE")}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
