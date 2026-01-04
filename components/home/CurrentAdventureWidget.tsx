import { ChevronRight } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { useGameIcons } from "@/hooks/useGameIcon";
import { useSmartAction } from "./useSmartAction";

export function CurrentAdventureWidget() {
  const router = useRouter();
  const { t } = useTranslation();
  const { config, isLoading } = useSmartAction();
  const icons = useGameIcons(["scroll", "sword"]);

  if (isLoading) {
    return null;
  }

  const effectiveConfig = config || {
    variant: "adventure",
    label: t("home.start_adventure", "Start Adventure"),
    subtext: t("home.no_active_adventure", "Choose your path"),
    onPress: () => router.push("/adventures"),
  };

  const isAdventure = effectiveConfig.variant === "adventure";
  const title = t("home.current_objective", "Current Objective");
  const subtitle = effectiveConfig.subtext || t("home.start_journey", "Start your journey");
  const label = effectiveConfig.label || t("home.play", "PLAY");
  const handlePress = effectiveConfig.onPress || (() => router.push("/adventures"));

  return (
    <YStack
      bg="$bgLight"
      borderWidth={1}
      borderColor="#dcdcdc"
      rounded="$6"
      shadowColor="$color"
      shadowRadius={8}
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.15}
      elevation={5}
      onPress={handlePress}
      pressStyle={{ scale: 0.98, opacity: 0.9 }}
      animation="quick"
      overflow="hidden"
      mb="$4"
    >
      <YStack p="$4" gap="$3">
        {/* Header */}
        <XStack justify="space-between" items="center">
          <Text
            fontSize="$3"
            fontWeight="bold"
            opacity={0.6}
            textTransform="uppercase"
            color="$color"
          >
            {title}
          </Text>
          <ChevronRight size={20} color="$color" opacity={0.5} />
        </XStack>

        {/* Main Content */}
        <XStack gap="$4" items="center">
          <YStack
            width={60}
            height={60}
            bg="$primary"
            rounded="$4"
            justify="center"
            items="center"
            shadowColor="$color"
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
            <H3 fontSize={24} fontWeight="900" color="$color" numberOfLines={2} lineHeight={28}>
              {subtitle}
            </H3>
          </YStack>
        </XStack>

        {/* CTA Button */}
        <Button
          size="$5"
          bg="$primary"
          color="white"
          fontWeight="900"
          fontSize={18}
          onPress={handlePress}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          mt="$2"
          shadowColor="$primary"
          shadowRadius={8}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.3}
        >
          {label.toUpperCase()}
        </Button>
      </YStack>
    </YStack>
  );
}
