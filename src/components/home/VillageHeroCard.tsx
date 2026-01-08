import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/src/hooks/useGameIcon";

const CARD_HEIGHT = 140;

// Village background image
const VILLAGE_IMAGE = require("@/assets/images/village/backgrounds/tier_1.jpg");

export function VillageHeroCard() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable onPress={() => router.push("/village")}>
      <YStack
        height={CARD_HEIGHT}
        mx="$4"
        borderRadius="$4"
        overflow="hidden"
        position="relative"
        // Glowing border effect
        borderWidth={1}
        borderColor="rgba(139, 92, 246, 0.4)"
        shadowColor="rgba(139, 92, 246, 0.3)"
        shadowRadius={16}
        shadowOpacity={1}
        pressStyle={{ scale: 0.98, opacity: 0.95 }}
        animation="quick"
      >
        {/* Background Image */}
        <Image
          source={VILLAGE_IMAGE}
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
          colors={["rgba(11, 15, 25, 0.4)", "rgba(11, 15, 25, 0.7)", "rgba(11, 15, 25, 0.9)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        />

        {/* Decorative Corner Accents */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          width={40}
          height={40}
          borderLeftWidth={2}
          borderTopWidth={2}
          borderColor="rgba(139, 92, 246, 0.5)"
          borderTopLeftRadius="$4"
        />
        <YStack
          position="absolute"
          top={0}
          right={0}
          width={40}
          height={40}
          borderRightWidth={2}
          borderTopWidth={2}
          borderColor="rgba(139, 92, 246, 0.5)"
          borderTopRightRadius="$4"
        />
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          width={40}
          height={40}
          borderLeftWidth={2}
          borderBottomWidth={2}
          borderColor="rgba(139, 92, 246, 0.5)"
          borderBottomLeftRadius="$4"
        />
        <YStack
          position="absolute"
          bottom={0}
          right={0}
          width={40}
          height={40}
          borderRightWidth={2}
          borderBottomWidth={2}
          borderColor="rgba(139, 92, 246, 0.5)"
          borderBottomRightRadius="$4"
        />

        {/* Content */}
        <XStack flex={1} items="center" px="$4" gap="$4">
          {/* Icon with Glow */}
          <YStack position="relative" width={60} height={60} justify="center" items="center">
            {/* Glow Ring */}
            <YStack
              position="absolute"
              width={60}
              height={60}
              borderRadius={1000}
              borderWidth={2}
              borderColor="$primary"
              opacity={0.4}
            />
            <YStack
              position="absolute"
              width={50}
              height={50}
              borderRadius={1000}
              bg="rgba(13, 51, 242, 0.2)"
            />
            <GameIcon name="lorc/castle" size={32} tintColor="$primary" />
          </YStack>

          {/* Text Content */}
          <YStack flex={1} gap="$1">
            <Text
              fontSize={22}
              fontWeight="900"
              color="$text"
              textShadowColor="rgba(0,0,0,0.5)"
              textShadowRadius={4}
            >
              {t("tabs.village", "Village")}
            </Text>
            <Text fontSize={13} color="$textSecondary" opacity={0.8} numberOfLines={2}>
              {t("home.village_subtitle", "Build, upgrade, and manage your settlement")}
            </Text>
          </YStack>

          {/* CTA Arrow */}
          <YStack
            bg="$primary"
            borderRadius={1000}
            width={44}
            height={44}
            justify="center"
            items="center"
            shadowColor="$primaryGlow"
            shadowRadius={12}
            shadowOpacity={0.6}
          >
            <GameIcon name="lorc/flying-flag" size={20} tintColor="white" />
          </YStack>
        </XStack>
      </YStack>
    </Pressable>
  );
}
